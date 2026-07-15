import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff, canModerate, findChannel } from '../../utils/permissions.js';
import { modLogEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Kick a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')], ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ User not found.')], ephemeral: true });
    if (!canModerate(interaction.guild, target)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Cannot kick this user.')], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This user is not kickable.')], ephemeral: true });

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle(`👢 You were kicked from ${interaction.guild.name}`).setDescription(`**Reason:** ${reason}`).setFooter({ text: config.footer.text }).setTimestamp()] }).catch(() => {});
      await target.kick(reason);

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('👢  Member Kicked').addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📝 Reason', value: reason, inline: false }).setFooter({ text: config.footer.text }).setTimestamp()],
      });

      const logChannel = findChannel(interaction.guild, '📜・mod-logs');
      if (logChannel) await logChannel.send({ embeds: [modLogEmbed({ action: 'Kick', target: target.user, moderator: interaction.user, reason, guild: interaction.guild })] }).catch(() => {});
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)], ephemeral: true });
    }
  },
};
