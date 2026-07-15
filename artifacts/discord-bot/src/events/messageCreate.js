/**
 * Skull SMP — messageCreate
 * Handles: anti-spam, anti-link, anti-raid, leveling system.
 */

import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../config/config.js';
import db from '../utils/database.js';
import { findChannel, isStaff } from '../utils/permissions.js';
import { levelUpEmbed } from '../utils/embeds.js';

export default {
  name: 'messageCreate',

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const member = message.member;
    if (!member) return;

    // ── Anti-Link ────────────────────────────────────────────────────────────
    if (config.antiLink.enabled && !isStaff(member)) {
      const urlRegex = /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+)/gi;
      if (urlRegex.test(message.content)) {
        const domain = (message.content.match(urlRegex)?.[0] ?? '').replace('https://', '').replace('http://', '').split('/')[0];
        const allowed = config.antiLink.allowedDomains.some((d) => domain.includes(d));
        if (!allowed) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription(`🔗 ${member}, links are not allowed here.`)
                .setFooter({ text: config.footer.text })
                .setTimestamp(),
            ],
          });
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }
      }
    }

    // ── Anti-Spam ────────────────────────────────────────────────────────────
    if (!isStaff(member)) {
      const { maxMessages, intervalMs, muteDurationMs } = config.antiSpam;
      const key = `${message.guild.id}_${message.author.id}`;
      const now = Date.now();

      if (!client.spamMap) client.spamMap = new Map();
      let spam = client.spamMap.get(key) ?? { count: 0, timestamps: [] };

      spam.timestamps = spam.timestamps.filter((t) => now - t < intervalMs);
      spam.timestamps.push(now);
      spam.count = spam.timestamps.length;
      client.spamMap.set(key, spam);

      if (spam.count >= maxMessages) {
        client.spamMap.delete(key);
        try {
          await member.timeout(muteDurationMs, 'Auto-mute: Spam');
          await message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription(`🔇 ${member}, you have been auto-muted for **5 minutes** for spamming.`)
                .setFooter({ text: config.footer.text })
                .setTimestamp(),
            ],
          });
          const logCh = findChannel(message.guild, '📜・mod-logs');
          if (logCh) {
            await logCh.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(config.colors.modlog)
                  .setTitle('🤖  Auto-Mod: Spam')
                  .setDescription(`${member.user.tag} was auto-muted for spamming.`)
                  .setFooter({ text: config.footer.text })
                  .setTimestamp(),
              ],
            }).catch(() => {});
          }
        } catch (_) {}
      }
    }

    // ── Leveling ─────────────────────────────────────────────────────────────
    const { xpPerMessage, xpCooldownMs, xpFormula } = config.leveling;
    const xpKey = `${message.guild.id}_${message.author.id}_xp_cooldown`;

    if (!client._xpCooldowns) client._xpCooldowns = new Map();
    const lastXpTime = client._xpCooldowns.get(xpKey) ?? 0;

    if (Date.now() - lastXpTime >= xpCooldownMs) {
      client._xpCooldowns.set(xpKey, Date.now());

      const earned = Math.floor(Math.random() * (xpPerMessage.max - xpPerMessage.min + 1)) + xpPerMessage.min;
      const data   = db.getLevelData(message.guild.id, message.author.id);
      data.xp      += earned;
      data.messages = (data.messages ?? 0) + 1;

      const xpNeeded = xpFormula(data.level);
      if (data.xp >= xpNeeded) {
        data.xp -= xpNeeded;
        data.level += 1;
        db.setLevelData(message.guild.id, message.author.id, data);

        // Announce level up
        await message.channel.send({
          embeds: [levelUpEmbed(member, data.level, message.guild)],
        }).catch(() => {});
      } else {
        db.setLevelData(message.guild.id, message.author.id, data);
      }
    }
  },
};
