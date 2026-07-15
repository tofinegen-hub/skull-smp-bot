/**
 * Skull SMP — /setupserver Core Logic
 * Creates all roles, categories, channels, and auto-embeds.
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

function findChannelInCategory(guild, channelName, category) {
  return guild.channels.cache.find(
    (c) => c.name === channelName && c.parentId === category?.id,
  ) ?? null;
}

function log(results, msg) {
  logger.info(`[SETUP] ${msg}`);
  results.push(msg);
}

// ─── Permission Builders ──────────────────────────────────────────────────────

/**
 * Build standard overwrites for a public category.
 * @everyone can view/read but NOT send.
 * Verified can send.
 * Muted cannot send.
 */
function publicCategoryOverwrites(guild, { staffCanManage = false } = {}) {
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

/** Overwrites for read-only announcement channels (only staff can post). */
function readOnlyOverwrites(guild) {
  const base = publicCategoryOverwrites(guild);
  const verified = findRole(guild, '✅ Verified');

  // Revoke send from verified in this channel
  const verifiedEntry = base.find((e) => e.id === findRole(guild, '✅ Verified')?.id);
  if (verifiedEntry) {
    verifiedEntry.deny = [
      ...(verifiedEntry.deny ?? []),
      PermissionFlagsBits.SendMessages,
    ];
    verifiedEntry.allow = (verifiedEntry.allow ?? []).filter(
      (p) => p !== PermissionFlagsBits.SendMessages,
    );
  }
  return base;
}

/** Overwrites for staff-only channels (hidden from @everyone). */
function staffOnlyOverwrites(guild, minRole = '🟣 Trial Staff') {
  const everyone = guild.roles.everyone;
  const staffRoleNames = [
    '👑 Owner', '💀 Server Manager', '🟢 Moderator',
    '🟢 Trial Moderator', '🟣 Staff', '🟣 Trial Staff',
  ];
  const staffStartIdx = staffRoleNames.indexOf(minRole);
  const allowedRoles = staffRoleNames.slice(0, staffStartIdx + 1);

  const overwrites = [
    {
      id: everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
  ];

  for (const roleName of allowedRoles) {
    const role = findRole(guild, roleName);
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

/** Overwrites for log channels (only Server Manager and Owner). */
function logChannelOverwrites(guild) {
  const everyone = guild.roles.everyone;
  const overwrites = [
    { id: everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
  ];
  for (const name of ['👑 Owner', '💀 Server Manager']) {
    const role = findRole(guild, name);
    if (role) {
      overwrites.push({
        id: role.id,
        type: OverwriteType.Role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }
  return overwrites;
}

/** Overwrites for the partnership category. */
function partnerCategoryOverwrites(guild) {
  const everyone = guild.roles.everyone;
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

// ─── Auto Embed Builders ──────────────────────────────────────────────────────

function makeFooter(guild) {
  return { text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined };
}

async function postWelcomeEmbed(channel, guild) {
  const embed = new EmbedBuilder()
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
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postRulesEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📖  Server Rules')
    .setDescription(
      `By being in this server, you agree to follow the rules below.\n` +
      `Breaking them may result in a warn, mute, kick, or ban.\n\u200b`,
    )
    .addFields(
      { name: '1️⃣  Be Respectful', value: 'Treat everyone with respect. No harassment, bullying, or hate speech of any kind.', inline: false },
      { name: '2️⃣  No Spam', value: 'Do not spam messages, reactions, mentions, or commands.', inline: false },
      { name: '3️⃣  No NSFW', value: 'Keep all content safe for work and appropriate for all ages.', inline: false },
      { name: '4️⃣  No Self-Promotion', value: 'Do not advertise other Discord servers, YouTube channels, or services without permission.', inline: false },
      { name: '5️⃣  English Only', value: 'Please speak English in public channels so all members can participate.', inline: false },
      { name: '6️⃣  No Cheating', value: 'Hacking, exploiting, or griefing on the Minecraft server is a permanent ban.', inline: false },
      { name: '7️⃣  Follow Discord TOS', value: 'All Discord Terms of Service and Community Guidelines apply here.', inline: false },
      { name: '8️⃣  Staff Decisions Are Final', value: 'Do not argue with staff in public. Use tickets if you have a dispute.', inline: false },
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postFaqEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('❓  Frequently Asked Questions')
    .addFields(
      { name: '❔ How do I join the Minecraft server?', value: `Get the whitelist at: **${config.serverInfo.whitelistLink}** then connect to \`${config.serverInfo.ip}\`.`, inline: false },
      { name: '❔ How do I get the Verified role?', value: `Head to <#verify> and click the **Verify** button.`, inline: false },
      { name: '❔ How do I apply for staff?', value: `Check out <#staff-apps> for open applications.`, inline: false },
      { name: '❔ I was banned/muted unfairly. What do I do?', value: `Open a ticket in <#create-ticket> and select "General Support".`, inline: false },
      { name: '❔ Can I partner with Skull SMP?', value: `Read the info in <#partnership-info> and open a partnership ticket.`, inline: false },
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postVerificationEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('✅  Verification — Skull SMP')
    .setDescription(
      `> Welcome to **Skull SMP**!\n\n` +
      `Press the **Verify** button below to gain access to the server.\n\n` +
      `By verifying, you agree to follow our <#rules>.`,
    )
    .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
    .setFooter(makeFooter(guild))
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify')
      .setLabel('✅  Verify')
      .setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function postTicketEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎫  Support — Skull SMP')
    .setDescription(
      `Need help? Select a ticket type below and our staff will assist you as soon as possible.\n\n` +
      `**Please do not abuse the ticket system.**`,
    )
    .addFields(
      { name: '🟢 General Support', value: 'Questions, help, general issues.', inline: true },
      { name: '🔴 Player Report', value: 'Report a rule-breaking player.', inline: true },
      { name: '🟡 Staff Report', value: 'Report a staff member privately.', inline: true },
      { name: '⬜ Whitelist Help', value: 'Issues joining the Minecraft server.', inline: true },
      { name: '🐛 Bug Report', value: 'Report a Minecraft or Discord bug.', inline: true },
      { name: '🤝 Partnership', value: 'Apply for a server partnership.', inline: true },
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_type')
    .setPlaceholder('📂 Select a ticket type...')
    .addOptions(
      config.ticket.types.map((t) => ({
        label: t.label,
        value: t.value,
        description: t.description,
      })),
    );

  const row = new ActionRowBuilder().addComponents(menu);
  await channel.send({ embeds: [embed], components: [row] });
}

async function postStaffAppsEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('📑  Staff Applications')
    .setDescription(
      `**Think you have what it takes to join the Skull SMP Staff Team?**\n\n` +
      `We are always looking for dedicated, mature, and active members to help moderate the community.\n\n` +
      `**Requirements:**\n` +
      `• Be at least 13 years old\n` +
      `• Active in the server for 2+ weeks\n` +
      `• No recent punishments\n` +
      `• Able to commit 5+ hours/week to moderation\n\n` +
      `**To apply:** Open a ticket in <#create-ticket> and select "General Support".\n\n` +
      `*Positions available: Moderator, Trial Staff*`,
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postPartnershipEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🤝  Partnership Information')
    .setDescription(
      `Want to partner with **Skull SMP**? Here's what you need to know.\n\n` +
      `**Requirements:**\n` +
      `• Must have 50+ active members\n` +
      `• No harmful, NSFW, or illegal content\n` +
      `• Must be an active community\n\n` +
      `**Perks:**\n` +
      `• Advertisement in <#partnerships>\n` +
      `• 🤝 Partner Manager role\n` +
      `• Reciprocal advertisement on partner server\n\n` +
      `**To apply:** Open a ticket in <#create-ticket> and select "Partnership".`,
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postSuggestionsEmbed(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('💡  Suggestions')
    .setDescription(
      `Have an idea to improve **Skull SMP**? We want to hear it!\n\n` +
      `Use the \`/suggest\` command to submit your suggestion.\n` +
      `Members can vote on suggestions using the reactions below.\n\n` +
      `**Tips for good suggestions:**\n` +
      `• Be specific and detailed\n` +
      `• Explain *why* it would improve the server\n` +
      `• One idea per suggestion`,
    )
    .setFooter(makeFooter(guild))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// ─── Main Setup Function ──────────────────────────────────────────────────────

export async function runServerSetup(guild, interaction) {
  const results = [];
  const { setup } = config;

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚙️  Setting up Skull SMP server...')
        .setDescription('This may take a minute. Please wait.')
        .setFooter(makeFooter(guild))
        .setTimestamp(),
    ],
  });

  // ── Step 1: Create Roles ────────────────────────────────────────────────────
  log(results, 'Creating roles...');
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
        name: roleDef.name,
        color: roleDef.color,
        hoist: roleDef.hoist,
        mentionable: roleDef.mentionable,
        reason: '/setupserver — Skull SMP',
      });
      createdRoles[roleDef.name] = role;
      log(results, `  ✅ Created role: ${roleDef.name}`);
    } catch (err) {
      log(results, `  ❌ Failed to create role ${roleDef.name}: ${err.message}`);
    }
  }

  // ── Step 2: Create Categories & Channels ────────────────────────────────────
  log(results, 'Creating categories and channels...');

  const categoryDefs = [
    {
      key: 'information',
      name: setup.categories.information,
      overwrites: () => readOnlyOverwrites(guild),
      channels: setup.channels.information,
    },
    {
      key: 'community',
      name: setup.categories.community,
      overwrites: () => publicCategoryOverwrites(guild),
      channels: setup.channels.community,
    },
    {
      key: 'minecraft',
      name: setup.categories.minecraft,
      overwrites: () => publicCategoryOverwrites(guild),
      channels: setup.channels.minecraft,
    },
    {
      key: 'support',
      name: setup.categories.support,
      overwrites: () => publicCategoryOverwrites(guild),
      channels: setup.channels.support,
    },
    {
      key: 'partners',
      name: setup.categories.partners,
      overwrites: () => partnerCategoryOverwrites(guild),
      channels: setup.channels.partners,
    },
    {
      key: 'staff',
      name: setup.categories.staff,
      overwrites: () => staffOnlyOverwrites(guild, '🟣 Trial Staff'),
      channels: setup.channels.staff,
    },
    {
      key: 'logs',
      name: setup.categories.logs,
      overwrites: () => logChannelOverwrites(guild),
      channels: setup.channels.logs,
    },
  ];

  const createdChannels = {};

  for (const catDef of categoryDefs) {
    // Create or find category
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
      log(results, `  ↳ Category already exists: ${catDef.name}`);
      try {
        await category.permissionOverwrites.set(catDef.overwrites());
      } catch (_) {}
    }

    // Create channels inside this category
    for (const chDef of catDef.channels) {
      const existing = findChannelInCategory(guild, chDef.name, category);
      if (existing) {
        log(results, `    ↳ Channel already exists: ${chDef.name}`);
        createdChannels[chDef.name] = existing;
        continue;
      }

      try {
        const channelType =
          chDef.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

        const channel = await guild.channels.create({
          name: chDef.name,
          type: channelType,
          parent: category.id,
          reason: '/setupserver',
        });
        createdChannels[chDef.name] = channel;
        log(results, `    ✅ Created channel: ${chDef.name}`);
      } catch (err) {
        log(results, `    ❌ Failed to create channel ${chDef.name}: ${err.message}`);
      }
    }
  }

  // ── Step 3: Create Ticket Transcript Channel (hidden) ──────────────────────
  // (part of support, we'll add it under the support category if not present)

  // ── Step 4: Post Auto Embeds ────────────────────────────────────────────────
  log(results, 'Posting auto embeds...');

  const embedTasks = [
    { name: '📌・welcome',          fn: postWelcomeEmbed },
    { name: '📖・rules',            fn: postRulesEmbed },
    { name: '📋・faq',              fn: postFaqEmbed },
    { name: '🎫・create-ticket',    fn: postTicketEmbed },
    { name: '✅・verify',           fn: postVerificationEmbed },  // may not exist unless created separately
    { name: '📑・staff-apps',       fn: postStaffAppsEmbed },
    { name: '🤝・partnership-info', fn: postPartnershipEmbed },
    { name: '💡・suggestions',      fn: postSuggestionsEmbed },
  ];

  // Find verify channel — it may be in the information category
  // First try to find/create a #verify channel in information
  let verifyChannel = guild.channels.cache.find((c) => c.name === '✅・verify');
  if (!verifyChannel) {
    const infoCat = findCategoryByName(guild, setup.categories.information);
    if (infoCat) {
      try {
        verifyChannel = await guild.channels.create({
          name: '✅・verify',
          type: ChannelType.GuildText,
          parent: infoCat.id,
          permissionOverwrites: readOnlyOverwrites(guild),
          reason: '/setupserver — verify channel',
        });
        createdChannels['✅・verify'] = verifyChannel;
        log(results, '    ✅ Created channel: ✅・verify');
      } catch (err) {
        log(results, `    ❌ Failed to create verify channel: ${err.message}`);
      }
    }
  }
  if (verifyChannel) createdChannels['✅・verify'] = verifyChannel;

  for (const { name, fn } of embedTasks) {
    const channel = createdChannels[name] ?? guild.channels.cache.find((c) => c.name === name);
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    // Check if already has a bot message to avoid duplicates
    try {
      const messages = await channel.messages.fetch({ limit: 5 });
      const hasBot = messages.some((m) => m.author.bot && m.author.id === guild.client.user.id);
      if (hasBot) {
        log(results, `  ↳ Embed already exists in ${name}`);
        continue;
      }
      await fn(channel, guild);
      log(results, `  ✅ Posted embed in ${name}`);
    } catch (err) {
      log(results, `  ❌ Failed to post embed in ${name}: ${err.message}`);
    }
  }

  // ── Step 5: Summary ──────────────────────────────────────────────────────────
  return results;
}
