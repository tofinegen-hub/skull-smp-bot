/**
 * Skull SMP Discord Bot — Entry Point
 */

import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import logger from './utils/logger.js';
import 'dotenv/config';

// ─── Client Setup ────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // Privileged — enable in Dev Portal → Bot → Server Members Intent
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,    // Privileged — enable in Dev Portal → Bot → Message Content Intent
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
  ],
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Anti-spam tracking
client.spamMap = new Map();    // userId → { count, lastMessage, timestamps[] }
client.raidMap = new Map();    // guildId → { recentJoins: [] }

// ─── Load Handlers ───────────────────────────────────────────────────────────

await loadCommands(client);
await loadEvents(client);

// ─── Global Error Handlers ───────────────────────────────────────────────────

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// ─── Login ───────────────────────────────────────────────────────────────────

if (!process.env.DISCORD_TOKEN) {
  logger.error('Missing DISCORD_TOKEN environment variable. Please set it and restart.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
