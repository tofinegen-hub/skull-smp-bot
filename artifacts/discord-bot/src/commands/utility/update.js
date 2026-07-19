/**
 * Skull SMP — /update command
 * Dynamically updates open ticket channel embeds manually when ran by staff.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../utils/database.js';
import config from '../../config/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Re-posts or clears the updated version of ticket interfaces.'),
    
  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => ['👑 Owner', '🟣 Staff', '🟢 Moderator'].includes(r.name))) {
      return interaction.reply({ content: '❌ You must be a Staff member to use `/update`.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
    if (!ticket) {
      return interaction.editReply({ content: '❌ This command can only be run inside an open active ticket channel.' });
    }

    // Fetch and remove past bot messages to clear old layouts cleanly
    const channelMessages = await interaction.channel.messages.fetch({ limit: 50 });
    const oldBotMessages = channelMessages.filter(msg => msg.author.id === interaction.client.user.id);
    
    for (const msg of oldBotMessages.values()) {
      await msg.delete().catch(() => {});
    }

    const refreshEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎫 Ticket Updated`)
      .setDescription(`The ticket layout has been synchronized successfully. Please proceed with instructions normally.`)
      .setTimestamp();

    await interaction.channel.send({ embeds: [refreshEmbed] });
    return interaction.editReply({ content: '✅ Ticket system components updated and synchronized cleanly!' });
  }
};
