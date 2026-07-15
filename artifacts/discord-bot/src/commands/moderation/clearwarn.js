import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isMod } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('🧹 Clear warnings for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to clear').setRequired(true))
    .addStringOption((o) =>
      o.setName('id').setDescription('Warn ID to remove (leave blank to clear ALL)').setRequired(false),
    ),

  async execute(interaction) {
    if (!isMod(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Moderator+ only.')],
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('user');
    const warnId = interaction.options.getString('id');

    if (warnId) {
      const removed = db.removeWarn(interaction.guildId, target.id, warnId);
      if (!removed) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Warn ID \`${warnId}\` not found.`)],
          ephemeral: true,
        });
      }
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Warn \`${warnId}\` removed from **${target.tag}**.`).setFooter({ text: config.footer.text }).setTimestamp()],
      });
    }

    db.clearWarns(interaction.guildId, target.id);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✅ All warnings cleared for **${target.tag}**.`)
          .setFooter({ text: config.footer.text })
          .setTimestamp(),
      ],
    });
  },
};
