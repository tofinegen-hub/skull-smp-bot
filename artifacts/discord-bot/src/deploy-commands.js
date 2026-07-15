/**
 * Skull SMP — Deploy Slash Commands to Discord
 * Run: node src/deploy-commands.js
 */

import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from './utils/logger.js';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // optional — for dev/fast registration

if (!token || !clientId) {
  logger.error('Missing DISCORD_TOKEN or CLIENT_ID environment variables.');
  process.exit(1);
}

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = join(commandsPath, folder);
  const commandFiles = readdirSync(folderPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = join(folderPath, file);
    const command = await import(pathToFileURL(filePath).href);
    if ('data' in command.default && 'execute' in command.default) {
      commands.push(command.default.data.toJSON());
    } else {
      logger.warn(`[WARNING] ${filePath} is missing "data" or "execute".`);
    }
  }
}

const rest = new REST().setToken(token);

try {
  logger.info(`Refreshing ${commands.length} application (/) commands...`);

  let data;
  if (guildId) {
    // Guild commands update instantly (good for development)
    data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    logger.info(`Successfully registered ${data.length} guild commands to ${guildId}.`);
  } else {
    // Global commands take ~1 hour to propagate
    data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info(`Successfully registered ${data.length} global commands.`);
  }
} catch (error) {
  logger.error('Failed to deploy commands:', error);
  process.exit(1);
}
