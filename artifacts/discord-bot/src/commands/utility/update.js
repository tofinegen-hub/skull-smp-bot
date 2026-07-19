import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../../utils/database.js';
import config from '../../config/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Re-posts the updated ticket controls and buttons.'),
    
  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => ['👑 Owner', '🟣 Staff', '🟢 Moderator'].includes(r.name))) {
      return interaction.reply({ content: '❌ You must be a Staff member to use `/update`.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Fetch the ticket from your database to know what kind of ticket it is (e.g. partnership)
    const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
    
    // Clear old bot messages so it looks clean
    const channelMessages = await interaction.channel.messages.fetch({ limit: 50 });
    const oldBotMessages = channelMessages.filter(msg => msg.author.id === interaction.client.user.id);
    for (const msg of oldBotMessages.values()) {
      await msg.delete().catch(() => {});
    }

    const infoEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎫 Ticket Management Panel`)
      .setDescription(`Welcome to your ticket support channel. Use the buttons below to manage this active case.\n\n**Category:** ${ticket?.type || 'General Help'}`)
      .setTimestamp();

    // Re-create the 4 premium buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('👤 Claim Ticket').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('request_transcript').setLabel('📜 Transcript').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('force_close').setLabel('⚡ Force Close').setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({ embeds: [infoEmbed], components: [row] });
    return interaction.editReply({ content: '✅ Panel and all 4 premium action buttons updated!' });
  }
};
