/**
 * Skull SMP — Reusable Embed Builders
 */

import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';

/**
 * Returns a base embed pre-loaded with the Skull SMP footer and timestamp.
 * @param {import('discord.js').Guild} [guild]
 */
export function baseEmbed(guild) {
  const embed = new EmbedBuilder()
    .setFooter({
      text: config.footer.text,
      iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
    })
    .setTimestamp();
  return embed;
}

export function successEmbed(description, guild) {
  return baseEmbed(guild)
    .setColor(config.colors.success)
    .setDescription(`✅  ${description}`);
}

export function errorEmbed(description, guild) {
  return baseEmbed(guild)
    .setColor(config.colors.error)
    .setDescription(`❌  ${description}`);
}

export function warningEmbed(description, guild) {
  return baseEmbed(guild)
    .setColor(config.colors.warning)
    .setDescription(`⚠️  ${description}`);
}

export function infoEmbed(title, description, guild) {
  return baseEmbed(guild)
    .setColor(config.colors.primary)
    .setTitle(title)
    .setDescription(description);
}

export function modLogEmbed({ action, target, moderator, reason, duration, guild }) {
  const embed = baseEmbed(guild)
    .setColor(config.colors.modlog)
    .setTitle(`🛡 Moderation — ${action}`)
    .addFields(
      { name: '👤 Target',    value: `${target.tag ?? target} (${target.id ?? target})`, inline: true },
      { name: '🔨 Moderator', value: `${moderator.tag ?? moderator}`, inline: true },
      { name: '📝 Reason',    value: reason ?? 'No reason provided', inline: false },
    );
  if (duration) embed.addFields({ name: '⏱ Duration', value: duration, inline: true });
  return embed;
}

export function warnEmbed({ target, moderator, reason, warnCount, guild }) {
  return baseEmbed(guild)
    .setColor(config.colors.warning)
    .setTitle('⚠️ Warning Issued')
    .setThumbnail(target.displayAvatarURL?.({ dynamic: true }))
    .addFields(
      { name: '👤 User',      value: `${target.tag} (${target.id})`, inline: true },
      { name: '🔨 Moderator', value: moderator.tag, inline: true },
      { name: '📝 Reason',    value: reason, inline: false },
      { name: '📊 Total Warns', value: `${warnCount}`, inline: true },
    );
}

export function welcomeEmbed(member) {
  const guild = member.guild;
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`⚔️  Welcome to **${guild.name}**!`)
    .setDescription(
      `Hey ${member}, welcome to **${guild.name}**!\n\n` +
      `> 📖 Read <#rules> to stay out of trouble.\n` +
      `> ✅ Head to <#verify> to unlock the server.\n` +
      `> 🌍 Join us at **${config.serverInfo.ip}**\n` +
      `> 📋 Get whitelisted: ${config.serverInfo.whitelistLink}\n`,
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://i.imgur.com/tFVBJuJ.png') // Minecraft banner placeholder
    .addFields({ name: '👥 Member Count', value: `You are member #**${guild.memberCount}**!`, inline: false })
    .setFooter({ text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTimestamp();
}

export function leaveEmbed(member) {
  const guild = member.guild;
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`👋  ${member.user.tag} has left the server`)
    .setDescription(`We now have **${guild.memberCount}** members.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: config.footer.text, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTimestamp();
}

export function levelUpEmbed(member, newLevel, guild) {
  return baseEmbed(guild)
    .setColor(config.colors.gold)
    .setTitle('⬆️  Level Up!')
    .setDescription(`${member} has reached **Level ${newLevel}**! 🎉`)
    .setThumbnail(member.user?.displayAvatarURL({ dynamic: true }));
}
