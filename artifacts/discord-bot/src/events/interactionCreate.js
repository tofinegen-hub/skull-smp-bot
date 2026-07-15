/**
 * Skull SMP — interactionCreate
 * Routes slash commands, buttons, and select menus.
 */

import {
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import config from '../config/config.js';
import db from '../utils/database.js';
import { findRole, isStaff } from '../utils/permissions.js';
import { endGiveaway } from '../commands/utility/giveaway.js';

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    // ── Slash Commands ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Unknown command.')],
          ephemeral: true,
        });
      }

      // Cooldown check
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
      const verifiedRole = findRole(interaction.guild, '✅ Verified');
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
            .setDescription(`Welcome to **${interaction.guild.name}**! You now have full access to the server.\n\nHave fun and remember to follow the rules! ⚔️`)
            .setFooter({ text: config.footer.text, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
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
      const guild      = interaction.guild;

      // Find or create TICKETS category
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

      // Check for existing open ticket
      const existing = guild.channels.cache.find(
        (c) => c.name === `ticket-${interaction.user.id}` || c.topic === `ticket:${interaction.user.id}:${ticketType}`,
      );
      if (existing) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(`⚠️ You already have an open ticket: ${existing}`)],
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

      // Create ticket channel
      const staffRoles = ['👑 Owner', '💀 Server Manager', '🟢 Moderator', '🟢 Trial Moderator', '🟣 Staff', '🟣 Trial Staff'];
      const permOverwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
        },
      ];
      for (const rName of staffRoles) {
        const r = findRole(guild, rName);
        if (r) permOverwrites.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
      }

      const ticketChannel = await guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        type: ChannelType.GuildText,
        parent: ticketCategory?.id,
        topic: `ticket:${interaction.user.id}:${ticketType}`,
        permissionOverwrites: permOverwrites,
        reason: `Ticket opened by ${interaction.user.tag}`,
      });

      db.createTicket({
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        type: ticketType,
        guildId: guild.id,
        createdAt: new Date().toISOString(),
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({
        content: `${interaction.user} | Staff will be with you shortly.`,
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🎫  ${label}`)
            .setDescription(
              `Welcome ${interaction.user}!\n\n` +
              `Please describe your issue in detail and a staff member will assist you.\n\n` +
              `**Ticket Type:** ${label}\n` +
              `**Opened by:** ${interaction.user.tag}`,
            )
            .setFooter({ text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
            .setTimestamp(),
        ],
        components: [closeRow],
      });

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Your ticket has been created: ${ticketChannel}`)],
        ephemeral: true,
      });
      return;
    }

    // ── Ticket Close Button ────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      if (!isStaff(interaction.member) && interaction.user.id !== db.getTicket(interaction.channel.id)?.userId) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Only staff or the ticket owner can close this.')], ephemeral: true });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('🔒  Ticket Closing')
            .setDescription(`This ticket is being closed by ${interaction.user.tag}.\nThe channel will be deleted in 5 seconds.`)
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
      });

      db.closeTicket(interaction.channel.id);
      setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
      return;
    }
  },
};
