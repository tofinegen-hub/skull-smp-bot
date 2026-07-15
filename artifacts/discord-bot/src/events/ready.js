/**
 * Skull SMP — ready event
 * Fires once when the bot successfully connects to Discord.
 */

import { ActivityType } from 'discord.js';
import logger from '../utils/logger.js';
import db from '../utils/database.js';

// Check for expired temp bans every 60 seconds
function startTempBanChecker(client) {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      const bans = db.getAllTempBans(guild.id);
      for (const ban of bans) {
        if (Date.now() >= ban.until) {
          try {
            await guild.members.unban(ban.userId, 'Temporary ban expired');
            db.deleteTempBan(guild.id, ban.userId);
            logger.info(`[TempBan] Unbanned ${ban.userId} in ${guild.name}`);
          } catch (_) {
            // User may already be unbanned or not in the ban list
            db.deleteTempBan(guild.id, ban.userId);
          }
        }
      }
    }
  }, 60_000);
}

export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    logger.success(`Logged in as ${client.user.tag} (${client.user.id})`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s) with ${client.users.cache.size} cached user(s).`);

    client.user.setActivity('⚔️ Skull SMP', { type: ActivityType.Watching });

    startTempBanChecker(client);
  },
};
