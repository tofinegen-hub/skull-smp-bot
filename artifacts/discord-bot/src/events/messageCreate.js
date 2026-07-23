/**
 * Skull SMP — messageCreate
 * Processes text responses for ongoing partnership questionnaires.
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../utils/database.js';
import config from '../config/config.js';

const QUESTIONS = [
  '**Question 1 of 6 — Server Name**\nWhat is the name of your server?',
  '**Question 2 of 6 — Discord Invite Link**\nWhat is your server\'s Discord invite link? (Make sure it does not expire)',
  '**Question 3 of 6 — Minecraft Version & Category**\nWhat version and type is your server? (e.g. 1.21.11 SMP)', 
  '**Question 4 of 6 — Your Advertisement**\nPlease send the exact advertisement text description for your server.',
  '**Question 5 of 6 — Member Count**\nHow many members does your Discord server have?',
  '**Question 6 of 6 — Advertisement Proof**\nPlease upload or attach a screenshot proving you posted our ad inside your community.'
];

export default {
  name: 'messageCreate',

  async execute(message, client) {
    // Ignore bots and non-guild messages
    if (message.author.bot || !message.guild) return;

    if (!db.getTicket) return;
    const ticket = db.getTicket(message.channel.id);
    
    // Only process active, open partnership tickets
    if (!ticket || ticket.status === 'closed' || ticket.type !== 'partnership') return;

    // Default step to 1 if unset or 0
    let step = (ticket.currentStep && ticket.currentStep > 0) ? ticket.currentStep : 1;
    if (!ticket.applicationAnswers) ticket.applicationAnswers = {};

    // Allow canceling
    if (message.content.toLowerCase() === 'cancel') {
      if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 });
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error || '#FF0000').setDescription('❌ Questionnaire closed.')] });
    }

    if (step === -1) return; // Finished or closed

    let currentInput = message.content;

    // Question 6 requires attachment/link validation
    if (step === 6) {
      const attachment = message.attachments.first();
      if (attachment) {
        currentInput = attachment.url;
      } else if (!message.content.startsWith('http')) {
        return message.reply('⚠️ Please upload a valid screenshot image attachment or send a direct image link.');
      }
    }

    // Save answer for the current active step
    ticket.applicationAnswers[`step_${step}`] = currentInput;

    // Advance step pointer
    const nextStep = step + 1;
    ticket.currentStep = nextStep;

    if (db.updateTicket) {
      db.updateTicket(message.channel.id, { currentStep: nextStep, applicationAnswers: ticket.applicationAnswers });
    }

    // Send the next question if available
    if (nextStep <= QUESTIONS.length) {
      return message.channel.send(QUESTIONS[nextStep - 1]);
    }

    // All questions answered — lock questionnaire state
    if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 });

    const sName = ticket.applicationAnswers['step_1'];
    const sInvite = ticket.applicationAnswers['step_2'];
    const sType = ticket.applicationAnswers['step_3'];
    const sAd = ticket.applicationAnswers['step_4'];
    const sCountRaw = ticket.applicationAnswers['step_5'];
    const sProof = ticket.applicationAnswers['step_6'];

    const count = parseInt((sCountRaw || '0').replace(/[^0-9]/g, '')) || 0;

    // Fetch live invite statistics
    let inviteVerificationString = 'Could not fetch invite live data.';
    try {
      const inviteCode = sInvite.split('/').pop();
      const inviteData = await client.fetchInvite(inviteCode, { withCounts: true });
      if (inviteData) {
        inviteVerificationString = `**${inviteData.guild.name}** — ${inviteData.memberCount} members (${inviteData.presenceCount} online)`;
      }
    } catch (e) {
      inviteVerificationString = `❌ Invalid or expired invite link.`;
    }

    let recommendationPing = 'none';
    if (count >= 25 && count <= 79) recommendationPing = 'here';
    if (count >= 80) recommendationPing = 'everyone';

    const submissionReviewEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTitle('🤝 Partnership Application — Ready for Review')
      .addFields(
        { name: 'Server Name', value: sName || 'N/A', inline: false },
        { name: 'Discord Invite', value: sInvite || 'N/A', inline: false },
        { name: 'Minecraft Version & Category', value: sType || 'N/A', inline: false },
        { name: 'Member Count', value: `${count}`, inline: false },
        { name: 'Your Advertisement', value: (sAd || 'N/A').substring(0, 1024), inline: false },
        { name: 'Advertisement Proof', value: '(screenshot attached — see below)', inline: false },
        { name: 'Invite Verification', value: inviteVerificationString, inline: false }
      )
      .setFooter({ text: `Applicant ID: ${message.author.id} • Verified members: ${count}` })
      .setTimestamp();

    if (sProof && sProof.startsWith('http')) {
      submissionReviewEmbed.setImage(sProof);
    }

    const choiceActionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`part_accept_${message.author.id}_${recommendationPing}`)
        .setLabel(`Approve (Ping: @${recommendationPing})`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`part_deny_${message.author.id}_none`)
        .setLabel('Decline Application')
        .setStyle(ButtonStyle.Danger)
    );

    const staffRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('staff') || r.name.toLowerCase().includes('moderator'));
    const pingText = staffRole ? `<@&${staffRole.id}>` : '@staff team';

    await message.channel.send({ content: pingText, embeds: [submissionReviewEmbed], components: [choiceActionRow] });
  }
};
