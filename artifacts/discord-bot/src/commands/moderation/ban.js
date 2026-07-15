import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isMod, canModerate, findChannel } from '../../utils/permissions.js';
import { modLogEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Ban a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    .addIntegerOption((o) => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')], ephemeral: true });
    }

    const target     = interaction.options.getMember('user');
    const reason     = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ User not found.')], ephemeral: true });
    if (!canModerate(interaction.guild, target)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Cannot ban this user.')], ephemeral: true });
    if (!target.bannable) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This user is not bannable.')], ephemeral: true });

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle(`🔨 You were banned from ${interaction.guild.name}`).setDescription(`**Reason:** ${reason}`).setFooter({ text: config.footer.text }).setTimestamp()] }).catch(() => {});
      await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('🔨  Member Banned').addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📝 Reason', value: reason, inline: false }).setFooter({ text: config.footer.text }).setTimestamp()],
      });

      const logChannel = findChannel(interaction.guild, '📜・mod-logs');
      if (logChannel) await logChannel.send({ embeds: [modLogEmbed({ action: 'Ban', target: target.user, moderator: interaction.user, reason, guild: interaction.guild })] }).catch(() => {});
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)], ephemeral: true });
    }
  },
};
