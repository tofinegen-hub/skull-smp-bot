/**
 * Skull SMP — Event Handler
 * Dynamically loads all events from src/events/
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '../events');
  const files = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
  let loaded = 0;

  for (const file of files) {
    const filePath = join(eventsPath, file);
    try {
      const module = await import(pathToFileURL(filePath).href);
      const event = module.default;

      if (!event?.name || !event?.execute) {
        logger.warn(`Event at ${filePath} is missing "name" or "execute" — skipped.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      loaded++;
    } catch (err) {
      logger.error(`Failed to load event ${filePath}:`, err);
    }
  }

  logger.success(`Loaded ${loaded} events.`);
}
