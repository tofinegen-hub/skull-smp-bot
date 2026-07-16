import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isMod, canModerate, findChannel } from '../../utils/permissions.js';
import { warnEmbed, modLogEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Warn a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')],
        ephemeral: true,
      });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ User not found.')], ephemeral: true });
    if (!canModerate(interaction.guild, target)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ I cannot warn this user (higher role).')], ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ You cannot warn yourself.')], ephemeral: true });
    }

    const warns = db.addWarn(interaction.guildId, target.id, {
      reason,
      moderator: interaction.user.tag,
      moderatorId: interaction.user.id,
    });

    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle(`⚠️ You have been warned in ${interaction.guild.name}`)
            .setDescription(`**Reason:** ${reason}\n**Total Warnings:** ${warns.length}`)
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
      });
    } catch (_) {}

    await interaction.reply({
      embeds: [warnEmbed({ target: target.user, moderator: interaction.user, reason, warnCount: warns.length, guild: interaction.guild })],
    });

    const logChannel = findChannel(interaction.guild, '📜・mod-logs');
    if (logChannel) {
      await logChannel.send({
        embeds: [modLogEmbed({ action: 'Warn', target: target.user, moderator: interaction.user, reason, guild: interaction.guild })],
      }).catch(() => {});
    }
  },
};
