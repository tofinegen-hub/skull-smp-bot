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
import { findRole, isStaff } from '../utils/permissions.js';
import { endGiveaway } from '../commands/utility/giveaway.js';

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
 * Buttons state adapt dynamically based on claim parameters.
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
  const logChannel = guild.channels.cache.find(c => c.name === '📜・ticket-logs' || c.name === 'ticket-logs');
  if (logChannel && logChannel.isTextBased()) {
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    const guild = interaction.guild;

    // ── Slash Commands ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Unknown command.')],
          ephemeral: true,
        });
      }

      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const timestamps   = cooldowns.get(command.data.name);
      const cooldownMs   = (command.cooldown ?? 3) * 1000;
      const now          = Date.now();
      const userStamp    = timestamps.get(interaction.user.id);

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
      const giveaway  = db.getGiveaway(messageId);

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

      const typeLabels = {
        general:       '🟢 General Support',
        report:        '🔴 Player Report',
        'staff-report':'🟡 Staff Report',
        whitelist:     '⬜ Whitelist Help',
        bug:           '🐛 Bug Report',
        partnership:   '🤝 Partnership',
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

      const permOver
