/**
 * Skull SMP — Central Configuration
 * Edit this file to customize the bot's behavior.
 */

export const config = {
  // ─── Bot Identity ─────────────────────────────────────────────────────────
  botName: 'Skull SMP',
  prefix: '!', // legacy fallback prefix (not actively used — slash commands only)

  // ─── Colors ───────────────────────────────────────────────────────────────
  colors: {
    primary:   0x00AA00,  // Minecraft grass green
    gold:      0xFFAA00,  // Minecraft gold
    error:     0xE74C3C,  // Red
    success:   0x2ECC71,  // Green
    warning:   0xF39C12,  // Orange
    info:      0x3498DB,  // Blue
    modlog:    0x992D22,  // Dark red
    dark:      0x2C2F33,  // Dark grey
    mute:      0x607D8B,  // Muted grey
  },

  // ─── Embed Footer ─────────────────────────────────────────────────────────
  footer: {
    text: 'Skull SMP',
    // iconURL is set dynamically from guild icon in embeds.js
  },

  // ─── Server Setup ─────────────────────────────────────────────────────────
  setup: {
    // Role names — must match exactly when checking for duplicates
    roles: [
      { name: '👑 Owner',          color: 0xFFD700, hoist: true,  mentionable: false },
      { name: '💀 Server Manager', color: 0x992D22, hoist: true,  mentionable: false },
      { name: '🟢 Moderator',      color: 0x2ECC71, hoist: true,  mentionable: true  },
      { name: '🟢 Trial Moderator',color: 0xA8FF78, hoist: true,  mentionable: true  },
      { name: '🟣 Staff',          color: 0x9B59B6, hoist: true,  mentionable: true  },
      { name: '🟣 Trial Staff',    color: 0xFF69B4, hoist: true,  mentionable: true  },
      { name: '🤝 Partner Manager',color: 0xE67E22, hoist: false, mentionable: false },
      { name: '🎥 Creator',        color: 0xE74C3C, hoist: false, mentionable: false },
      { name: '⭐ Booster',        color: 0xFF69B4, hoist: false, mentionable: false },
      { name: '✅ Verified',       color: 0x5DADE2, hoist: false, mentionable: false },
      { name: '👤 Member',         color: 0x99AAB5, hoist: false, mentionable: false },
      { name: '🚫 Muted',          color: 0x546E7A, hoist: false, mentionable: false },
    ],

    // Category names with Unicode styling
    categories: {
      information: '══════「 📢 INFORMATION 」══════',
      community:   '══════「 🌍 COMMUNITY 」══════',
      minecraft:   '══════「 🎮 MINECRAFT 」══════',
      support:     '══════「 🛠 SUPPORT 」══════',
      partners:    '══════「 🤝 PARTNERS 」══════',
      staff:       '══════「 👑 STAFF 」══════',
      logs:        '══════「 📊 LOGS 」══════',
      private:     '══════「 🔒 PRIVATE 」══════',
    },

    // Channels per category
    channels: {
      information: [
        { name: '📌・welcome',       type: 'text' },
        { name: '📖・rules',         type: 'text' },
        { name: '📢・announcements', type: 'text' },
        { name: '📅・updates',       type: 'text' },
        { name: '📋・faq',           type: 'text' },
        { name: '🎉・giveaways',     type: 'text' },
      ],
      community: [
        { name: '💬・general',       type: 'text' },
        { name: '😂・memes',         type: 'text' },
        { name: '📸・media',         type: 'text' },
        { name: '🎥・content',       type: 'text' },
        { name: '🤖・bots',          type: 'text' },
        { name: '🎵・music',         type: 'text' },
        { name: '🎙・voice-chat',    type: 'voice' },
      ],
      minecraft: [
        { name: '🌍・server-chat',   type: 'text' },
        { name: '📸・screenshots',   type: 'text' },
        { name: '🎬・clips',         type: 'text' },
        { name: '💡・suggestions',   type: 'text' },
        { name: '🗳・polls',         type: 'text' },
        { name: '📢・events',        type: 'text' },
      ],
      support: [
        { name: '🎫・create-ticket', type: 'text' },
        { name: '📨・appeals',       type: 'text' },
        { name: '❓・help',          type: 'text' },
      ],
      partners: [
        { name: '🤝・partnership-info', type: 'text' },
        { name: '📢・partnerships',     type: 'text' },
      ],
      staff: [
        { name: '🛡・staff-chat',    type: 'text' },
        { name: '📑・staff-apps',    type: 'text' },
        { name: '📋・staff-logs',    type: 'text' },
      ],
      logs: [
        { name: '📜・join-logs',     type: 'text' },
        { name: '📜・leave-logs',    type: 'text' },
        { name: '📜・message-logs',  type: 'text' },
        { name: '📜・mod-logs',      type: 'text' },
      ],
    },
  },

  // ─── Leveling ─────────────────────────────────────────────────────────────
  leveling: {
    xpPerMessage: { min: 15, max: 25 },
    xpCooldownMs: 60_000, // 1 minute cooldown between XP gains
    xpFormula: (level) => 5 * level * level + 50 * level + 100, // XP needed for next level
  },

  // ─── Anti-Spam ────────────────────────────────────────────────────────────
  antiSpam: {
    maxMessages: 5,        // messages before mute
    intervalMs: 5_000,     // within 5 seconds
    muteDurationMs: 300_000, // 5 minutes
  },

  // ─── Anti-Raid ────────────────────────────────────────────────────────────
  antiRaid: {
    joinThreshold: 10,     // joins to trigger raid mode
    joinWindowMs: 10_000,  // within 10 seconds
  },

  // ─── Anti-Link ────────────────────────────────────────────────────────────
  antiLink: {
    enabled: true,
    allowedDomains: ['discord.gg', 'discord.com', 'tenor.com', 'giphy.com'],
  },

  // ─── Ticket System ────────────────────────────────────────────────────────
  ticket: {
    categoryName: '🎫 TICKETS',
    transcriptChannelName: '📜・ticket-logs',
    types: [
      { label: '🟢 General Support',   value: 'general',     description: 'Need help? Open a general support ticket.' },
      { label: '🔴 Player Report',      value: 'report',      description: 'Report a player for breaking the rules.' },
      { label: '🟡 Staff Report',       value: 'staff-report',description: 'Report a staff member.' },
      { label: '⬜ Whitelist Help',     value: 'whitelist',   description: 'Get help with the Minecraft whitelist.' },
      { label: '🐛 Bug Report',         value: 'bug',         description: 'Found a bug? Let us know!' },
      { label: '🤝 Partnership',        value: 'partnership', description: 'Apply for a server partnership.' },
    ],
  },

  // ─── Whitelist / Server Info ───────────────────────────────────────────────
  serverInfo: {
    ip: 'play.skullsmp.net',        // Replace with your actual IP
    whitelistLink: 'https://skullsmp.net/whitelist', // Replace with your actual link
    websiteLink: 'https://skullsmp.net',
    inviteLink: 'https://discord.gg/skullsmp',  // Replace with actual invite
  },
};

export default config;
