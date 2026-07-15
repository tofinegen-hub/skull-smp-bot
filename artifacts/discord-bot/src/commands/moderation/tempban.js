import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isMod, canModerate, findChannel } from '../../utils/permissions.js';
import { modLogEmbed } from '../../utils/embeds.js';

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return n * ms;
}

export default {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('⏳ Temporarily ban a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to temp-ban').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('Duration e.g. 1h, 7d').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')], ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const durStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const durMs  = parseDuration(durStr);

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ User not found.')], ephemeral: true });
    if (!durMs)  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Invalid duration. Use: 1h, 7d')], ephemeral: true });
    if (!canModerate(interaction.guild, target)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Cannot ban this user.')], ephemeral: true });

    const unbanAt = Date.now() + durMs;

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle(`⏳ Temp-banned from ${interaction.guild.name}`).setDescription(`**Duration:** ${durStr}\n**Reason:** ${reason}\n**Unbanned:** <t:${Math.floor(unbanAt / 1000)}:R>`).setFooter({ text: config.footer.text }).setTimestamp()] }).catch(() => {});
      await target.ban({ reason: `[TEMPBAN ${durStr}] ${reason}`, deleteMessageSeconds: 0 });

      db.setTempBan(interaction.guildId, target.id, { until: unbanAt, reason, moderator: interaction.user.tag, guildId: interaction.guildId });

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('⏳  Member Temp-Banned').addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '⏱ Duration', value: durStr, inline: true }, { name: '🔓 Unban', value: `<t:${Math.floor(unbanAt / 1000)}:R>`, inline: true }, { name: '📝 Reason', value: reason, inline: false }).setFooter({ text: config.footer.text }).setTimestamp()],
      });

      const logChannel = findChannel(interaction.guild, '📜・mod-logs');
      if (logChannel) await logChannel.send({ embeds: [modLogEmbed({ action: 'Temp Ban', target: target.user, moderator: interaction.user, reason, duration: durStr, guild: interaction.guild })] }).catch(() => {});
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)], ephemeral: true });
    }
  },
};
