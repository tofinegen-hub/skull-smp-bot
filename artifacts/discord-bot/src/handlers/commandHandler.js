/**
 * Skull SMP — Command Handler
 * Dynamically loads all commands from src/commands/
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '../commands');
  const folders = readdirSync(commandsPath);
  let loaded = 0;

  for (const folder of folders) {
    const folderPath = join(commandsPath, folder);
    const files = readdirSync(folderPath).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const filePath = join(folderPath, file);
      try {
        const module = await import(pathToFileURL(filePath).href);
        const command = module.default;

        if (!command?.data || !command?.execute) {
          logger.warn(`Command at ${filePath} is missing "data" or "execute" — skipped.`);
          continue;
        }

        client.commands.set(command.data.name, command);
        loaded++;
      } catch (err) {
        logger.error(`Failed to load command ${filePath}:`, err);
      }
    }
  }

  logger.success(`Loaded ${loaded} commands.`);
}
