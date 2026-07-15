import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isMod, canModerate, findChannel } from '../../utils/permissions.js';
import { modLogEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('🔊 Remove a timeout from a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to unmute').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')], ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ User not found.')], ephemeral: true });
    if (!canModerate(interaction.guild, target)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Cannot modify this user.')], ephemeral: true });
    if (!target.isCommunicationDisabled()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This user is not muted.')], ephemeral: true });

    await target.timeout(null, reason);
    db.deleteMute(interaction.guildId, target.id);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🔊  Member Unmuted').setDescription(`**${target.user.tag}** has been unmuted.\n**Reason:** ${reason}`).setFooter({ text: config.footer.text }).setTimestamp()],
    });

    const logChannel = findChannel(interaction.guild, '📜・mod-logs');
    if (logChannel) await logChannel.send({ embeds: [modLogEmbed({ action: 'Unmute', target: target.user, moderator: interaction.user, reason, guild: interaction.guild })] }).catch(() => {});
  },
};
