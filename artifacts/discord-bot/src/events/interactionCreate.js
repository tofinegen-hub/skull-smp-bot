/**
 * Skull SMP — interactionCreate
 * Routes slash commands, buttons, and select menus.
 * Upgraded premium ticket system integration.
 */

import {
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import config from '../config/config.js';
import db from '../utils/database.js';
import { findRole } from '../utils/permissions.js';

// exact staff roles permitted for ticket operations
const ALLOWED_STAFF_ROLES = ['👑 Owner', '🟣 Staff', '🟢 Trial Moderator', '🟢 Moderator'];

/**
 * Checks if a member has one of the specific staff roles requested
 */
function hasStaffPermissions(member) {
  if (!member) return false;
  return member.roles.cache.some(role => ALLOWED_STAFF_ROLES.includes(role.name));
}

/**
 * Creates the premium control panel action row.
 */
function createControlPanel(claimedBy = null) {
  const claimButton = new ButtonBuilder()
    .setCustomId('ticket_claim')
    .setLabel(claimedBy ? `Claimed by ${claimedBy}` : '👤 Claim Ticket')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(claimedBy !== null);

  const closeButton = new ButtonBuilder()
    .setCustomId('ticket_close_request')
    .setLabel('🔒 Close Ticket')
    .setStyle(ButtonStyle.Danger);

  const transcriptButton = new ButtonBuilder()
    .setCustomId('ticket_transcript')
    .setLabel('📜 Transcript')
    .setStyle(ButtonStyle.Secondary);

  const forceCloseButton = new ButtonBuilder()
    .setCustomId('ticket_force_close')
    .setLabel('⚡ Force Close')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(claimButton, closeButton, transcriptButton, forceCloseButton);
}

/**
 * Generates an HTML transcript from channel messages.
 */
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sortedMessages = Array.from(messages.values()).reverse();

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Transcript - ${channel.name}</title>
    <style>
      body { background-color: #36393f; color: #dcddde; font-family: sans-serif; padding: 20px; }
      .message { display: flex; margin-bottom: 15px; border-bottom: 1px solid #40444b; padding-bottom: 10px; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; }
      .content { display: flex; flex-direction: column; }
      .header { display: flex; align-items: center; margin-bottom: 5px; }
      .author { font-weight: bold; color: #ffffff; margin-right: 10px; }
      .time { font-size: 0.8em; color: #72767d; }
      .text { white-space: pre-wrap; word-break: break-word; }
      .embed { background-color: #2f3136; border-left: 4px solid #00b0f4; border-radius: 4px; padding: 10px; margin-top: 5px; max-width: 500px; }
      .embed-title { font-weight: bold; color: #ffffff; margin-bottom: 5px; }
      .embed-desc { font-size: 0.9em; }
      .attachment { margin-top: 5px; max-width: 300px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Transcript for Channel: #${channel.name}</h1>
    <p>Generated at: ${new Date().toLocaleString()}</p>
    <hr>
  `;

  for (const msg of sortedMessages) {
    if (msg.author.bot && msg.components.length > 0 && msg.embeds.length > 0) continue;

    const avatarURL = msg.author.displayAvatarURL({ extension: 'png' }) || 'https://discord.com/assets/1f0ecd0a6dd43f2a56d10c63a2cd92a1.svg';
    html += `
    <div class="message">
      <img class="avatar" src="${avatarURL}" alt="avatar">
      <div class="content">
        <div class="header">
          <span class="author">${msg.author.tag}</span>
          <span class="time">${msg.createdAt.toLocaleString()}</span>
        </div>
        <div class="text">${msg.cleanContent || ''}</div>
    `;

    for (const embed of msg.embeds) {
      html += `
      <div class="embed" style="border-left-color: ${embed.hexColor || '#00b0f4'}">
        ${embed.title ? `<div class="embed-title">${embed.title}</div>` : ''}
        ${embed.description ? `<div class="embed-desc">${embed.description}</div>` : ''}
      </div>
      `;
    }

    for (const attachment of msg.attachments.values()) {
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        html += `<img class="attachment" src="${attachment.url}" alt="Attachment">`;
      } else {
        html += `<div style="margin-top: 5px;"><a href="${attachment.url}" target="_blank" style="color: #00b0f4;">📎 ${attachment.name}</a></div>`;
      }
    }

    html += `
      </div>
    </div>
    `;
  }

  html += `
  </body>
  </html>
  `;

  return new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `transcript-${channel.name}.html` });
}

async function sendTicketLog(guild, embed) {
  const logChannel = guild.channels.cache.find(c => c.name === '📜・mod-logs' || c.name === 'mod-logs');
  if (logChannel && logChannel.isTextBased()) {
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    const guild = interaction.guild;
    if (!guild) return;

    // ── Slash Commands ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Unknown command.')],
          ephemeral: true,
        });
      }

      const cooldowns = client.cooldowns;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const timestamps = cooldowns.get(command.data.name);
      const cooldownMs = (command.cooldown ?? 3) * 1000;
      const now = Date.now();
      const userStamp = timestamps.get(interaction.user.id);

      if (userStamp && now < userStamp + cooldownMs) {
        const remaining = ((userStamp + cooldownMs - now) / 1000).toFixed(1);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(`⏳ Please wait **${remaining}s** before using this command again.`)],
          ephemeral: true,
        });
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Command error (${interaction.commandName}):`, err);
        const reply = { embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ An error occurred: ${err.message}`)], ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // ── Verify Button ─────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'verify') {
      const verifiedRole = findRole(guild, '✅ Verified');
      if (!verifiedRole) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Verified role not found. Please ask an admin to run `/setupserver`.')],
          ephemeral: true,
        });
      }

      if (interaction.member.roles.cache.has(verifiedRole.id)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('✅ You are already verified!')],
          ephemeral: true,
        });
      }

      await interaction.member.roles.add(verifiedRole, 'Verified via button');
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅  Verified!')
            .setDescription(`Welcome to **${guild.name}**! You now have full access to the server.\n\nHave fun and remember to follow the rules! ⚔️`)
            .setFooter({ text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
      return;
    }

    // ── Giveaway Entry Button ─────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'giveaway_enter') {
      const messageId = interaction.message.id;
      const giveaway = db.getGiveaway(messageId);

      if (!giveaway) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This giveaway could not be found.')], ephemeral: true });
      }
      if (giveaway.ended) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This giveaway has already ended.')], ephemeral: true });
      }
      if (giveaway.entries.includes(interaction.user.id)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('⚠️ You have already entered this giveaway!')], ephemeral: true });
      }

      giveaway.entries.push(interaction.user.id);
      db.updateGiveaway(messageId, { entries: giveaway.entries });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`🎉 You have entered the giveaway for **${giveaway.prize}**! Good luck!\n\nTotal entries: **${giveaway.entries.length}**`)
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
      return;
    }

    // ── Ticket Type Select Menu ────────────────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type') {
      const ticketType = interaction.values[0];

      let ticketCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === '🎫 TICKETS',
      );
      if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
          name: '🎫 TICKETS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }],
        }).catch(() => null);
      }

      const allActiveChannels = guild.channels.cache.filter(c => c.parentId === ticketCategory?.id && c.type === ChannelType.GuildText);
      const userDuplicate = allActiveChannels.find(c => {
        const tInfo = db.getTicket ? db.getTicket(c.id) : null;
        if (tInfo) {
          return tInfo.userId === interaction.user.id && tInfo.status !== 'closed';
        }
        return c.topic && c.topic.includes(`ticket:${interaction.user.id}:`);
      });

      if (userDuplicate) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(`⚠️ You already have an open ticket: ${userDuplicate}`)],
          ephemeral: true,
        });
      }

      // Updated to map the new staff-app value!
      const typeLabels = {
        general:       '🟢 General Support',
        report:        '🔴 Player Report',
        'staff-report':'🟡 Staff Report',
        whitelist:     '⬜ Whitelist Help',
        bug:           '🐛 Bug Report',
        partnership:   '🤝 Partnership',
        'staff-app':   '📝 Staff Application',
      };

      const label = typeLabels[ticketType] ?? ticketType;

      let nextNumber = 1;
      if (db.getTicketCounter) {
        nextNumber = db.getTicketCounter() || 1;
        db.incrementTicketCounter();
      } else {
        const rawTickets = db.getAllTickets ? db.getAllTickets() : [];
        if (rawTickets && rawTickets.length > 0) {
          nextNumber = rawTickets.length + 1;
        }
      }
      const formattedNum = String(nextNumber).padStart(4, '0');

      const permOverwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
        },
      ];

      for (const rName of ALLOWED_STAFF_ROLES) {
        const r = findRole(guild, rName);
        if (r) {
          permOverwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles],
          });
        }
      }

      const ticketChannel = await guild.channels.create({
        name: `ticket-${formattedNum}`,
        type: ChannelType.GuildText,
        parent: ticketCategory?.id,
        topic: `ticket:${interaction.user.id}:${ticketType}`,
        permissionOverwrites: permOverwrites,
        reason: `Ticket #${formattedNum} opened by ${interaction.user.tag}`,
      });

      const ticketData = {
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        type: ticketType,
        guildId: guild.id,
        createdAt: new Date().toISOString(),
        ticketNumber: formattedNum,
        claimedBy: null,
        status: 'open'
      };

      if (db.createTicket) {
        db.createTicket(ticketData);
      }

      const controlPanel = createControlPanel();

      // Dynamically display application questions if the ticket is a staff application
      let descriptionText = `Welcome ${interaction.user} to Skull SMP Support! Please provide all necessary details below. A representative will be with you shortly.`;
      
      if (ticketType === 'staff-app') {
        descriptionText = `Welcome ${interaction.user} to your **Staff Application**!\n\nPlease answer the following questions to submit your application:\n\n` +
          `**1.** How old are you?\n` +
          `**2.** What timezone are you in?\n` +
          `**3.** Why do you want to join the Skull SMP Staff Team?\n` +
          `**4.** What prior experience do you have?\n` +
          `**5.** How active can you be weekly?\n\n` +
          `*Please write your answers below. The Administrative team will review them soon!*`;
      }

      const ticketEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎫 Ticket #${formattedNum} — ${label}`)
        .setDescription(descriptionText)
        .addFields(
          { name: '👤 Opened By', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📂 Category', value: label, inline: true },
          { name: '📈 Claim Status', value: 'Unclaimed', inline: true },
          { name: '🛡️ Staff Action Panel', value: 'Use the buttons below to coordinate control actions on this thread.' },
          { name: '📝 User Instructions', value: ticketType === 'staff-app' ? 'Carefully fill out the application details above.' : 'Be patient, state details clearly, and upload any relevant files.' }
        )
        .setFooter({ text: `${config.footer.text} • Premium Ticketing Module`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();

      await ticketChannel.send({
        content: `${interaction.user} | Staff will help you here.`,
        embeds: [ticketEmbed],
        components: [controlPanel],
      });

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Your ticket has been successfully initialized: ${ticketChannel}`)],
        ephemeral: true,
      });

      const creationLog = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🎫 Ticket Opened')
        .setDescription(`Ticket **#${formattedNum}** has been created.`)
        .addFields(
          { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: 'Type', value: label, inline: true },
          { name: 'Channel', value: `${ticketChannel}`, inline: true }
        )
        .setTimestamp();
      await sendTicketLog(guild, creationLog);
      return;
    }

    // ── Ticket Claim Button ─────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
      if (!hasStaffPermissions(interaction.member)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ This action can only be performed by Staff.')], ephemeral: true });
      }

      const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
      if (ticket && ticket.claimedBy) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('⚠️ This ticket is already claimed.')], ephemeral: true });
      }

      if (db.updateTicket) {
        db.updateTicket(interaction.channel.id, { claimedBy: interaction.user.id });
      }

      const updatedPanel = createControlPanel(interaction.user.username);
      await interaction.message.edit({ components: [updatedPanel] }).catch(() => {});

      const claimEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`👤 This ticket has been claimed by ${interaction.user}.`)
        .setTimestamp();

      await interaction.reply({ embeds: [claimEmbed] });

      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('👤 Ticket Claimed')
        .setDescription(`Ticket channel ${interaction.channel} has been claimed.`)
        .addFields(
          { name: 'Staff Member', value: `${interaction.user.tag}`, inline: true },
          { name: 'Channel', value: `${interaction.channel.name}`, inline: true }
        )
        .setTimestamp();
      await sendTicketLog(guild, logEmbed);
      return;
    }

    // ── Close Ticket Button (Initiation) ──────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_close_request') {
      const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
      const isCreator = ticket ? (interaction.user.id === ticket.userId) : false;
      const isStaffUser = hasStaffPermissions(interaction.member);

      if (!isCreator && !isStaffUser) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ You must be the ticket owner or staff to do this.')], ephemeral: true });
      }

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('✅ Confirm Close').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: `${interaction.user}, please confirm you want to close this ticket.`,
        components: [confirmRow],
        ephemeral: false
      });
    }

    // ── Confirm Close Button ────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_confirm_close') {
      const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
      const isCreator = ticket ? (interaction.user.id === ticket.userId) : false;
      const isStaffUser = hasStaffPermissions(interaction.member);

      if (!isCreator && !isStaffUser) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ You do not have permission to confirm this close request.')], ephemeral: true });
      }

      await interaction.update({ content: '🔒 **Closing ticket...** Channel will delete in 5 seconds.', components: [] });

      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('🔒 Ticket Closing')
            .setDescription(`This ticket has been marked closed by **${interaction.user.tag}**.\n\nChannel will delete in **5 seconds**.`)
            .setTimestamp()
        ]
      });

      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket channel **${interaction.channel.name}** closed.`)
        .addFields({ name: 'Closed By', value: `${interaction.user.tag}`, inline: true })
        .setTimestamp();
      await sendTicketLog(guild, logEmbed);

      if (db.closeTicket) db.closeTicket(interaction.channel.id);
      setTimeout(() => interaction.channel.delete('Ticket closed by user/staff.').catch(() => {}), 5000);
      return;
    }

    // ── Cancel Close Button ─────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_cancel_close') {
      const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
      const isCreator = ticket ? (interaction.user.id === ticket.userId) : false;
      const isStaffUser = hasStaffPermissions(interaction.member);

      if (!isCreator && !isStaffUser) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ You do not have permission to cancel this close request.')], ephemeral: true });
      }

      await interaction.update({ content: '✅ Close request successfully cancelled.', components: [] });
      return;
    }

    // ── Force Close Button ────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_force_close') {
      if (!hasStaffPermissions(interaction.member)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Only qualified Staff can force close tickets.')], ephemeral: true });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('⚡ Force Closed')
            .setDescription(`⚡ Ticket force closed by ${interaction.user}.\n\nThis channel will be terminated instantly in **5 seconds**.`)
            .setTimestamp()
        ]
      });

      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('⚡ Ticket Force Closed')
        .setDescription(`Ticket channel **${interaction.channel.name}** was forced shut by Staff.`)
        .addFields({ name: 'Staff Action Executed By', value: `${interaction.user.tag}`, inline: true })
        .setTimestamp();
      await sendTicketLog(guild, logEmbed);

      if (db.closeTicket) db.closeTicket(interaction.channel.id);
      setTimeout(() => interaction.channel.delete('Ticket Force Closed').catch(() => {}), 5000);
      return;
    }

    // ── Transcript Button ─────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_transcript') {
      if (!hasStaffPermissions(interaction.member)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Only Staff can generate message transcripts.')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const ticket = db.getTicket ? db.getTicket(interaction.channel.id) : null;
        const transcriptAttachment = await generateTranscript(interaction.channel);

        let creatorString = 'Unknown User';
        if (ticket && ticket.userId) {
          const userObj = await client.users.fetch(ticket.userId).catch(() => null);
          creatorString = userObj ? `${userObj.tag} (<@${userObj.id}>)` : `<@${ticket.userId}>`;
        }

        let claimedString = 'None';
        if (ticket && ticket.claimedBy) {
          const claimedObj = await client.users.fetch(ticket.claimedBy).catch(() => null);
          claimedString = claimedObj ? `${claimedObj.tag}` : `<@${ticket.claimedBy}>`;
        }

        // Search for your specific mod-logs channel (matching the exact name in your screenshot)
        const logChannel = guild.channels.cache.find(c => c.name === '📜・mod-logs' || c.name === 'mod-logs');
        if (!logChannel) {
          return interaction.editReply({ 
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Unable to find `#📜・mod-logs` channel.')] 
          });
        }

        const transcriptEmbed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`📜 Transcript — Ticket #${ticket?.ticketNumber || interaction.channel.name.split('-')[1] || 'Unknown'}`)
          .addFields(
            { name: '🎫 Ticket Number', value: `#${ticket?.ticketNumber || 'N/A'}`, inline: true },
            { name: '👤 Creator', value: creatorString, inline: true },
            { name: '📂 Type', value: `${ticket?.type || 'Standard'}`, inline: true },
            { name: '👥 Claimed By', value: claimedString, inline: true },
            { name: '🛠️ Generated By', value: `${interaction.user.tag}`, inline: true },
            { name: '⏰ Generation Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: config.footer.text })
          .setTimestamp();

        // Send the file and embed straight to mod-logs
        await logChannel.send({ embeds: [transcriptEmbed], files: [transcriptAttachment] });
        
        await interaction.editReply({ 
          embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Transcript created and logged to ${logChannel}.`)] 
        });

      } catch (err) {
        console.error('Error compiling transcript:', err);
        await interaction.editReply({ 
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Error occurred building transcript compilation.')] 
        });
      }
      return;
    }
  }
};
