import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isMod, findChannel } from '../../utils/permissions.js';
import { modLogEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('✅ Unban a user from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')], ephemeral: true });
    }

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ That user is not banned.')], ephemeral: true });

      await interaction.guild.members.unban(userId, reason);

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅  Member Unbanned').addFields({ name: '👤 User', value: `${ban.user.tag} (${userId})`, inline: true }, { name: '📝 Reason', value: reason, inline: false }).setFooter({ text: config.footer.text }).setTimestamp()],
      });

      const logChannel = findChannel(interaction.guild, '📜・mod-logs');
      if (logChannel) await logChannel.send({ embeds: [modLogEmbed({ action: 'Unban', target: ban.user, moderator: interaction.user, reason, guild: interaction.guild })] }).catch(() => {});
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)], ephemeral: true });
    }
  },
};
