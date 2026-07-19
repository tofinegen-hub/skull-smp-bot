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
    if (message.author.bot || !message.guild) return;

    if (!db.getTicket) return;
    const ticket = db.getTicket(message.channel.id);
    
    // Only process active partnership tickets
    if (!ticket || ticket.status === 'closed' || ticket.type !== 'partnership') return;

    // Ensure step and answers objects exist
    if (ticket.currentStep === undefined) ticket.currentStep = 0;
    if (!ticket.applicationAnswers) ticket.applicationAnswers = {};

    let step = ticket.currentStep;

    // Allow user to cancel the questionnaire
    if (message.content.toLowerCase() === 'cancel') {
      if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 });
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Questionnaire closed.')] });
    }

    // Step -1 means the questionnaire is finished or cancelled, so ignore messages
    if (step === -1) return;

    // Step 0 triggers initial question prompt execution
    if (step === 0) {
      if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: 1 });
      return message.channel.send(QUESTIONS[0]);
    }

    // We are on Step 1 through 6, processing the user's answer
    let currentInput = message.content;
    
    // Special handling for the screenshot on step 6
    if (step === 6) {
      const attachment = message.attachments.first();
      if (attachment) {
        currentInput = attachment.url;
      } else if (!message.content.startsWith('http')) {
        return message.reply('⚠️ Please upload a valid screenshot image attachment or send a direct image link.');
      }
    }

    // Save the answer for the current step
    ticket.applicationAnswers[`step_${step}`] = currentInput;
    
    // Increment the step for the next question
    step += 1;

    // Save the updated step and answers to the database
    if (db.updateTicket) {
      db.updateTicket(message.channel.id, { currentStep: step, applicationAnswers: ticket.applicationAnswers });
    }

    // If there are more questions, send the next one
    if (step <= QUESTIONS.length) {
      return message.channel.send(QUESTIONS[step - 1]);
    }

    // If we've reached this point, all 6 questions are answered. 
    // Clear step state to secure data locking
    if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 });

    const sName = ticket.applicationAnswers['step_1'];
    const sInvite = ticket.applicationAnswers['step_2'];
    const sType = ticket.applicationAnswers['step_3'];
    const sAd = ticket.applicationAnswers['step_4'];
    const sCountRaw = ticket.applicationAnswers['step_5'];
    const sProof = ticket.applicationAnswers['step_6'];

    const count = parseInt(sCountRaw.replace(/[^0-9]/g, '')) || 0;

    // Direct automated Invite Verification query lookups
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

    // Allocate recommendations tier based on raw input properties metrics
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
