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
  '**Question 3 of 6 — Server Type**\nWhat category best describes your server? (e.g. SMP, Parkour, Minigames)',
  '**Question 4 of 6 — Advertisement Description**\nPlease send the exact advertisement text description for your server.',
  '**Question 5 of 6 — Member Count**\nHow many members does your Discord server have?',
  '**Question 6 of 6 — Screenshot Proof**\nPlease upload or attach a direct screenshot showing proof that you posted our advertisement inside your community.'
];

export default {
  name: 'messageCreate',

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Check if channel is an open ticket tracked in the DB
    if (!db.getTicket) return;
    const ticket = db.getTicket(message.channel.id);
    if (!ticket || ticket.status === 'closed' || ticket.type !== 'partnership') return;

    // Fallbacks if data properties are undefined
    if (ticket.currentStep === undefined) ticket.currentStep = 0;
    if (!ticket.applicationAnswers) ticket.applicationAnswers = {};

    let step = ticket.currentStep;

    // User typing "cancel" stops the questionnaire loop
    if (message.content.toLowerCase() === 'cancel') {
      if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 });
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Questionnaire closed.')] });
    }

    // Step 0 handles the activation phrase response
    if (step === 0) {
      ticket.currentStep = 1;
      if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: 1 });
      return message.channel.send(QUESTIONS[0]);
    }

    // Save data from current step
    let currentInput = message.content;
    if (step === 6) {
      // Prioritize attached images or file links for question 6
      const attachment = message.attachments.first();
      if (attachment) {
        currentInput = attachment.url;
      } else if (!message.content.startsWith('http')) {
        return message.reply('⚠️ Please upload a valid screenshot image attachment or send a direct file image URL link.');
      }
    }

    ticket.applicationAnswers[`step_${step}`] = currentInput;
    
    // Progress loop forward
    step += 1;
    ticket.currentStep = step;

    if (db.updateTicket) {
      db.updateTicket(message.channel.id, { 
        currentStep: step, 
        applicationAnswers: ticket.applicationAnswers 
      });
    }

    if (step <= QUESTIONS.length) {
      // Send next text prompt
      return message.channel.send(QUESTIONS[step - 1]);
    }

    // Form complete logic kicks off here
    if (db.updateTicket) db.updateTicket(message.channel.id, { currentStep: -1 }); // locks the loop

    // Extract values collected
    const sName = ticket.applicationAnswers['step_1'];
    const sInvite = ticket.applicationAnswers['step_2'];
    const sType = ticket.applicationAnswers['step_3'];
    const sAd = ticket.applicationAnswers['step_4'];
    const sCountRaw = ticket.applicationAnswers['step_5'];
    const sProof = ticket.applicationAnswers['step_6'];

    const count = parseInt(sCountRaw.replace(/[^0-9]/g, '')) || 0;

    // Fetch details dynamically from the invite link
    let inviteVerificationString = 'Could not verify invite link automatically.';
    try {
      // Extract code from full link (e.g., https://discord.gg/GZNAYpw79k -> GZNAYpw79k)
      const inviteCode = sInvite.split('/').pop();
      const inviteData = await client.fetchInvite(inviteCode, { withCounts: true });
      if (inviteData) {
        inviteVerificationString = `**${inviteData.guild.name}** — ${inviteData.memberCount} members (${inviteData.presenceCount} online)`;
      }
    } catch (e) {
      inviteVerificationString = `❌ Invalid or expired invite link provided.`;
    }

    // Determine target tier and recommendation mapping based on member counts
    let pingTierString = '⚠️ Below Minimum Requirements (< 25)';
    let recommendationPing = 'none';

    if (count >= 25 && count <= 79) {
      pingTierString = '🔹 **25–79 Members Tier**\n• We ping: `@here`';
      recommendationPing = 'here';
    } else if (count >= 80 && count <= 119) {
      pingTierString = '🔸 **80–119 Members Tier**\n• We ping: `@everyone`';
      recommendationPing = 'everyone';
    } else if (count >= 120 && count <= 174) {
      pingTierString = '⭐ **120–174 Members Tier**\n• We ping: `@everyone`';
      recommendationPing = 'everyone';
    } else if (count >= 175 && count <= 249) {
      pingTierString = '💎 **175–249 Members Tier**\n• We ping: `@everyone`';
      recommendationPing = 'everyone';
    } else if (count >= 250) {
      pingTierString = '👑 **Premium Partnership (250+ Members)**\n• Premium ping matching client preference choice.';
      recommendationPing = 'everyone';
    }

    // Build the beautiful review embed layout sent to the staff
    const submissionReviewEmbed = new EmbedBuilder()
      .setColor('#5865F2') // Discord blurple styling
      .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTitle('🤝 Partnership Application — Ready for Review')
      .addFields(
        { name: 'Server Name', value: sName, inline: false },
        { name: 'Discord Invite', value: sInvite, inline: false },
        { name: 'Server Category', value: sType, inline: false },
        { name: 'Member Count', value: `${count}`, inline: false },
        { name: 'Your Advertisement', value: sAd.substring(0, 1024), inline: false },
        { name: 'Advertisement Proof', value: '(screenshot attached — see below)', inline: false },
        { name: 'Invite Verification', value: inviteVerificationString, inline: false }
      )
      .setFooter({ text: `Applicant ID: ${message.author.id} • Verified members: ${count}` })
      .setTimestamp();

    if (sProof.startsWith('http')) {
      submissionReviewEmbed.setImage(sProof);
    }

    // Interactive buttons for evaluation control panel action row
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

    // Ping the staff team in the ticket channel and present the review dashboard layout
    const staffRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('staff') || r.name.toLowerCase().includes('moderator'));
    const pingText = staffRole ? `<@&${staffRole.id}>` : '@staff team';

    await message.channel.send({ 
      content: pingText, 
      embeds: [submissionReviewEmbed], 
      components: [choiceActionRow] 
    });
  }
};
