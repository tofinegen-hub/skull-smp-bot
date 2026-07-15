import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isStaff } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('📋 View warnings for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to check').setRequired(true)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')],
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('user');
    const warns  = db.getWarns(interaction.guildId, target.id);

    const embed = new EmbedBuilder()
      .setColor(warns.length > 0 ? config.colors.warning : config.colors.success)
      .setTitle(`⚠️  Warnings for ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: config.footer.text, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    if (warns.length === 0) {
      embed.setDescription('✅ This user has no warnings.');
    } else {
      embed.setDescription(`Total: **${warns.length}** warning(s)\n\u200b`);
      warns.slice(-10).forEach((w, i) => {
        embed.addFields({
          name: `#${warns.indexOf(w) + 1} — ID: ${w.id}`,
          value: `**Reason:** ${w.reason}\n**Moderator:** ${w.moderator}\n**Date:** <t:${Math.floor(w.id / 1000)}:R>`,
          inline: false,
        });
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
