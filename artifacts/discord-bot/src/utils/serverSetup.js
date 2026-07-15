/**
 * Skull SMP — /setupserver Core Logic
 * Wipes all roles + channels (except protected), then rebuilds everything fresh.
 */

import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  OverwriteType,
} from 'discord.js';
import config from '../config/config.js';
import logger from './logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name) ?? null;
}

function findCategoryByName(guild, name) {
  return guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name,
  ) ?? null;
}

function log(results, msg) {
  logger.info(`[SETUP] ${msg}`);
  results.push(msg);
}

/** Returns true if a channel name matches any of the protected patterns. */
function isProtected(channelName, patterns) {
  const lower = channelName.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}

// ─── Permission Builders ──────────────────────────────────────────────────────

function publicCategoryOverwrites(guild) {
  const everyone = guild.roles.everyone;
  const verified = findRole(guild, '✅ Verified');
  const muted    = findRole(guild, '🚫 Muted');

  const overwrites = [
    {
      id: everyone.id,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny:  [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  if (verified) {
    overwrites.push({
      id: verified.id,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.UseExternalStickers,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
      ],
    });
  }

  if (muted) {
    overwrites.push({
      id: muted.id,
      type: OverwriteType.Role,
      deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
      ],
    });
  }

  return overwrites;
}

function readOnlyOverwrites(guild) {
  const base = publicCategoryOverwrites(guild);
  const verified = findRole(guild, '✅ Verified');
  if (verified) {
    const entry = base.find((e) => e.id === verified.id);
    if (entry) {
      entry.allow = (entry.allow ?? []).filter((p) => p !== PermissionFlagsBits.SendMessages);
      entry.deny  = [...(entry.deny ?? []), PermissionFlagsBits.SendMessages];
    }
  }
  return base;
}

function staffOnlyOverwrites(guild, minRole = '🟣 Trial Staff') {
  const everyone     = guild.roles.everyone;
  const staffNames   = ['👑 Owner', '💀 Server Manager', '🟢 Moderator', '🟢 Trial Moderator', '🟣 Staff', '🟣 Trial Staff'];
  const allowedNames = staffNames.slice(0, staffNames.indexOf(minRole) + 1);

  const overwrites = [{ id: everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] }];

  for (const name of allowedNames) {
    const role = findRole(guild, name);
    if (role) {
      overwrites.push({
        id: role.id,
        type: OverwriteType.Role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }
  }
  return overwrites;
}

function logChannelOverwrites(guild) {
  const overwrites = [
    { id: guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
  ];
  for (const name of ['👑 Owner', '💀 Server Manager', '🟢 Moderator', '🟣 Staff']) {
    const role = findRole(guild, name);
    if (role) {
      overwrites.push({
        id: role.id,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }
  }
  return overwrites;
}

function partnerCategoryOverwrites(guild) {
  const everyone       = guild.roles.everyone;
  const partnerManager = findRole(guild, '🤝 Partner Manager');

  const overwrites = [
    {
      id: everyone.id,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny:  [PermissionFlagsBits.SendMessages],
    },
  ];

  if (partnerManager) {
    overwrites.push({
      id: partnerManager.id,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }
  return overwrites;
}

// ─── Embed Builders ───────────────────────────────────────────────────────────

function makeFooter(guild) {
  return { text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined };
}

async function postWelcomeEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('⚔️  Welcome to Skull SMP!')
        .setDescription(
          `> Welcome to the official **Skull SMP** Discord server!\n\n` +
          `We are a passionate **Minecraft SMP** community. Whether you're a builder, fighter, or explorer — there's a place for you here.\n\n` +
          `**📋 Getting Started:**\n` +
          `• Read <#rules> to stay out of trouble\n` +
          `• Head to <#verify> to gain full server access\n` +
          `• Introduce yourself in <#general>\n` +
          `• Apply for the Minecraft whitelist: **${config.serverInfo.whitelistLink}**\n\n` +
          `**🌍 Server IP:** \`${config.serverInfo.ip}\`\n` +
          `**🔗 Invite:** ${config.serverInfo.inviteLink}`,
        )
        .setImage(guild.iconURL({ dynamic: true, size: 512 }) ?? null)
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

async function postRulesEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📖  Server Rules')
        .setDescription(
          `By being in this server, you agree to follow the rules below.\n` +
          `Breaking them may result in a warn, mute, kick, or ban.\n\u200b`,
        )
        .addFields(
          { name: '1️⃣  Be Respectful',         value: 'Treat everyone with respect. No harassment, bullying, or hate speech of any kind.' },
          { name: '2️⃣  No Spam',                value: 'Do not spam messages, reactions, mentions, or commands.' },
          { name: '3️⃣  No NSFW',                value: 'Keep all content safe for work and appropriate for all ages.' },
          { name: '4️⃣  No Self-Promotion',      value: 'Do not advertise other Discord servers, YouTube channels, or services without permission.' },
          { name: '5️⃣  English Only',           value: 'Please speak English in public channels so all members can participate.' },
          { name: '6️⃣  No Cheating',            value: 'Hacking, exploiting, or griefing on the Minecraft server is a permanent ban.' },
          { name: '7️⃣  Follow Discord TOS',     value: 'All Discord Terms of Service and Community Guidelines apply here.' },
          { name: '8️⃣  Staff Decisions Are Final', value: 'Do not argue with staff in public. Use tickets if you have a dispute.' },
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

async function postFaqEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('❓  Frequently Asked Questions')
        .addFields(
          { name: '❔ How do I join the Minecraft server?',   value: `Get the whitelist at: **${config.serverInfo.whitelistLink}** then connect to \`${config.serverInfo.ip}\`.` },
          { name: '❔ How do I get the Verified role?',       value: `Head to <#verify> and click the **Verify** button.` },
          { name: '❔ How do I apply for staff?',             value: `Check out <#staff-apps> for open applications.` },
          { name: '❔ I was banned/muted unfairly.',          value: `Open a ticket in <#create-ticket> and select "General Support".` },
          { name: '❔ Can I partner with Skull SMP?',         value: `Read <#partnership-info> and open a partnership ticket.` },
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

async function postVerificationEmbed(channel, guild) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify').setLabel('✅  Verify').setStyle(ButtonStyle.Success),
  );
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('✅  Verification — Skull SMP')
        .setDescription(
          `> Welcome to **Skull SMP**!\n\n` +
          `Press the **Verify** button below to gain access to the server.\n\n` +
          `By verifying, you agree to follow our <#rules>.`,
        )
        .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
    components: [row],
  });
}

async function postTicketEmbed(channel, guild) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_type')
    .setPlaceholder('📂 Select a ticket type...')
    .addOptions(config.ticket.types.map((t) => ({ label: t.label, value: t.value, description: t.description })));

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫  Support — Skull SMP')
        .setDescription(`Need help? Select a ticket type below and our staff will assist you as soon as possible.\n\n**Please do not abuse the ticket system.**`)
        .addFields(
          { name: '🟢 General Support', value: 'Questions, help, general issues.',      inline: true },
          { name: '🔴 Player Report',   value: 'Report a rule-breaking player.',         inline: true },
          { name: '🟡 Staff Report',    value: 'Report a staff member privately.',       inline: true },
          { name: '⬜ Whitelist Help',  value: 'Issues joining the Minecraft server.',   inline: true },
          { name: '🐛 Bug Report',      value: 'Report a Minecraft or Discord bug.',     inline: true },
          { name: '🤝 Partnership',     value: 'Apply for a server partnership.',        inline: true },
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function postStaffAppsEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('📑  Staff Applications')
        .setDescription(
          `**Think you have what it takes to join the Skull SMP Staff Team?**\n\n` +
          `We are always looking for dedicated, mature, and active members.\n\n` +
          `**Requirements:**\n` +
          `• Be at least 13 years old\n` +
          `• Active in the server for 2+ weeks\n` +
          `• No recent punishments\n` +
          `• Able to commit 5+ hours/week\n\n` +
          `**To apply:** Open a ticket in <#create-ticket> and select "General Support".\n\n` +
          `*Positions available: Moderator, Trial Staff*`,
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

async function postPartnershipEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🤝  Partnership Information')
        .setDescription(
          `Want to partner with **Skull SMP**? Here's what you need to know.\n\n` +
          `**Requirements:**\n• 50+ active members\n• No NSFW or illegal content\n• Active community\n\n` +
          `**Perks:**\n• Ad in <#partnerships>\n• 🤝 Partner Manager role\n• Reciprocal advertisement\n\n` +
          `**To apply:** Open a ticket in <#create-ticket> and select "Partnership".`,
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

async function postSuggestionsEmbed(channel, guild) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('💡  Suggestions')
        .setDescription(
          `Have an idea to improve **Skull SMP**? We want to hear it!\n\n` +
          `Use the \`/suggest\` command to submit your suggestion.\n` +
          `Members can vote on suggestions using the reactions below.\n\n` +
          `**Tips:** Be specific, explain why it helps, one idea per suggestion.`,
        )
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });
}

// ─── Deletion Phase ───────────────────────────────────────────────────────────

async function deleteAllChannels(guild, protectedPatterns, results) {
  log(results, '🗑️  Deleting existing channels...');

  // Fetch fresh channel list
  await guild.channels.fetch();

  // Delete non-category channels first (categories must be empty before deletion)
  const nonCategories = guild.channels.cache.filter(
    (c) => c.type !== ChannelType.GuildCategory,
  );

  for (const channel of nonCategories.values()) {
    if (isProtected(channel.name, protectedPatterns)) {
      log(results, `  🔒 Protected (skipped): #${channel.name}`);
      continue;
    }
    try {
      await channel.delete('/setupserver — full rebuild');
      log(results, `  🗑️  Deleted channel: #${channel.name}`);
    } catch (err) {
      log(results, `  ⚠️  Could not delete #${channel.name}: ${err.message}`);
    }
  }

  // Now delete empty categories
  await guild.channels.fetch();
  const categories = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildCategory,
  );

  for (const cat of categories.values()) {
    if (isProtected(cat.name, protectedPatterns)) {
      log(results, `  🔒 Protected category (skipped): ${cat.name}`);
      continue;
    }
    try {
      await cat.delete('/setupserver — full rebuild');
      log(results, `  🗑️  Deleted category: ${cat.name}`);
    } catch (err) {
      log(results, `  ⚠️  Could not delete category ${cat.name}: ${err.message}`);
    }
  }
}

async function deleteAllRoles(guild, results) {
  log(results, '🗑️  Deleting existing roles...');

  await guild.roles.fetch();

  // Keep: @everyone, managed/bot roles, and any role above the bot's highest role
  const botMember     = guild.members.me;
  const botHighest    = botMember?.roles?.highest?.position ?? 0;

  for (const role of guild.roles.cache.values()) {
    // Never delete @everyone
    if (role.id === guild.roles.everyone.id) continue;
    // Never delete managed (bot) roles
    if (role.managed) continue;
    // Never delete roles above or equal to the bot's own position
    if (role.position >= botHighest) continue;

    try {
      await role.delete('/setupserver — full rebuild');
      log(results, `  🗑️  Deleted role: ${role.name}`);
    } catch (err) {
      log(results, `  ⚠️  Could not delete role ${role.name}: ${err.message}`);
    }
  }
}

// ─── Main Setup Function ──────────────────────────────────────────────────────

export async function runServerSetup(guild, interaction) {
  const results = [];
  const { setup } = config;
  const protectedPatterns = setup.protectedChannelPatterns ?? [];

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚙️  Setting up Skull SMP server...')
        .setDescription('Wiping and rebuilding the server. This will take a minute — please wait.')
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });

  // ── Phase 1: Wipe ────────────────────────────────────────────────────────────
  await deleteAllChannels(guild, protectedPatterns, results);
  await deleteAllRoles(guild, results);

  // ── Phase 2: Create Roles ────────────────────────────────────────────────────
  log(results, '✨ Creating roles...');
  const createdRoles = {};

  for (const roleDef of setup.roles) {
    const existing = findRole(guild, roleDef.name);
    if (existing) {
      log(results, `  ↳ Role already exists: ${roleDef.name}`);
      createdRoles[roleDef.name] = existing;
      continue;
    }
    try {
      const role = await guild.roles.create({
        name:        roleDef.name,
        color:       roleDef.color,
        hoist:       roleDef.hoist,
        mentionable: roleDef.mentionable,
        reason:      '/setupserver — Skull SMP',
      });
      createdRoles[roleDef.name] = role;
      log(results, `  ✅ Created role: ${roleDef.name}`);
    } catch (err) {
      log(results, `  ❌ Failed to create role ${roleDef.name}: ${err.message}`);
    }
  }

  // ── Phase 3: Create Categories & Channels ────────────────────────────────────
  log(results, '✨ Creating categories and channels...');

  const categoryDefs = [
    { name: setup.categories.information, overwrites: () => readOnlyOverwrites(guild),         channels: setup.channels.information },
    { name: setup.categories.community,   overwrites: () => publicCategoryOverwrites(guild),   channels: setup.channels.community },
    { name: setup.categories.minecraft,   overwrites: () => publicCategoryOverwrites(guild),   channels: setup.channels.minecraft },
    { name: setup.categories.support,     overwrites: () => publicCategoryOverwrites(guild),   channels: setup.channels.support },
    { name: setup.categories.partners,    overwrites: () => partnerCategoryOverwrites(guild),  channels: setup.channels.partners },
    { name: setup.categories.staff,       overwrites: () => staffOnlyOverwrites(guild, '🟣 Trial Staff'), channels: setup.channels.staff },
    { name: setup.categories.logs,        overwrites: () => logChannelOverwrites(guild),       channels: setup.channels.logs },
  ];

  const createdChannels = {};

  for (const catDef of categoryDefs) {
    let category = findCategoryByName(guild, catDef.name);
    if (!category) {
      try {
        category = await guild.channels.create({
          name: catDef.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: catDef.overwrites(),
          reason: '/setupserver',
        });
        log(results, `  ✅ Created category: ${catDef.name}`);
      } catch (err) {
        log(results, `  ❌ Failed to create category ${catDef.name}: ${err.message}`);
        continue;
      }
    } else {
      log(results, `  ↳ Category exists: ${catDef.name}`);
      try { await category.permissionOverwrites.set(catDef.overwrites()); } catch (_) {}
    }

    for (const chDef of catDef.channels) {
      // Skip if this channel is protected (managed by another bot)
      if (isProtected(chDef.name, protectedPatterns)) {
        log(results, `    🔒 Protected (skipped): ${chDef.name}`);
        const existing = guild.channels.cache.find((c) => c.name === chDef.name);
        if (existing) createdChannels[chDef.name] = existing;
        continue;
      }

      const existing = guild.channels.cache.find(
        (c) => c.name === chDef.name && c.parentId === category.id,
      );
      if (existing) {
        log(results, `    ↳ Channel exists: ${chDef.name}`);
        createdChannels[chDef.name] = existing;
        continue;
      }

      try {
        const ch = await guild.channels.create({
          name:   chDef.name,
          type:   chDef.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
          reason: '/setupserver',
        });
        createdChannels[chDef.name] = ch;
        log(results, `    ✅ Created: ${chDef.name}`);
      } catch (err) {
        log(results, `    ❌ Failed to create ${chDef.name}: ${err.message}`);
      }
    }
  }

  // Ensure #verify channel exists in information category
  if (!guild.channels.cache.find((c) => c.name === '✅・verify')) {
    const infoCat = findCategoryByName(guild, setup.categories.information);
    if (infoCat) {
      try {
        const verifyChannel = await guild.channels.create({
          name:               '✅・verify',
          type:               ChannelType.GuildText,
          parent:             infoCat.id,
          permissionOverwrites: readOnlyOverwrites(guild),
          reason:             '/setupserver — verify channel',
        });
        createdChannels['✅・verify'] = verifyChannel;
        log(results, '    ✅ Created: ✅・verify');
      } catch (err) {
        log(results, `    ❌ Failed to create verify channel: ${err.message}`);
      }
    }
  } else {
    const verifyChannel = guild.channels.cache.find((c) => c.name === '✅・verify');
    if (verifyChannel) createdChannels['✅・verify'] = verifyChannel;
  }

  // ── Phase 4: Post Auto Embeds ─────────────────────────────────────────────────
  log(results, '📝 Posting embeds...');

  const embedTasks = [
    { name: '📌・welcome',          fn: postWelcomeEmbed },
    { name: '📖・rules',            fn: postRulesEmbed },
    { name: '📋・faq',              fn: postFaqEmbed },
    { name: '🎫・create-ticket',    fn: postTicketEmbed },
    { name: '✅・verify',           fn: postVerificationEmbed },
    { name: '📑・staff-apps',       fn: postStaffAppsEmbed },
    { name: '🤝・partnership-info', fn: postPartnershipEmbed },
    { name: '💡・suggestions',      fn: postSuggestionsEmbed },
  ];

  for (const { name, fn } of embedTasks) {
    const channel = createdChannels[name] ?? guild.channels.cache.find((c) => c.name === name);
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    // Skip channels managed by other bots — if the channel wasn't in our created set
    // and is protected, don't post into it
    if (isProtected(channel.name, protectedPatterns) && !createdChannels[name]) {
      log(results, `  🔒 Skipped embed in protected channel: ${name}`);
      continue;
    }

    try {
      const msgs  = await channel.messages.fetch({ limit: 5 });
      const hasUs = msgs.some((m) => m.author.bot && m.author.id === guild.client.user.id);
      if (hasUs) {
        log(results, `  ↳ Embed already exists in ${name}`);
        continue;
      }
      await fn(channel, guild);
      log(results, `  ✅ Posted embed in ${name}`);
    } catch (err) {
      log(results, `  ❌ Failed to post embed in ${name}: ${err.message}`);
    }
  }

  return results;
}
