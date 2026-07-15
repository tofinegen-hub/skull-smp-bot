import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🗑️ Bulk delete messages from a channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((o) =>
      o.setName('user').setDescription('Only delete messages from this user').setRequired(false),
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')],
        ephemeral: true,
      });
    }

    const amount    = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: 100 });

      if (targetUser) {
        messages = messages.filter((m) => m.author.id === targetUser.id);
      }

      messages = [...messages.values()].slice(0, amount);

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const toDelete = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);

      if (toDelete.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('⚠️ No messages to delete (messages older than 14 days cannot be bulk deleted).')],
        });
      }

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`✅ Deleted **${deleted.size}** message(s)${targetUser ? ` from ${targetUser.tag}` : ''}.`)
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)],
      });
    }
  },
};
