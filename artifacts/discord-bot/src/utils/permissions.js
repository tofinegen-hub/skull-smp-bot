/**
 * Skull SMP — Permission Helpers
 */

import { PermissionFlagsBits } from 'discord.js';

// Role name constants (must match config.js)
export const Roles = {
  OWNER:           '👑 Owner',
  SERVER_MANAGER:  '💀 Server Manager',
  MODERATOR:       '🟢 Moderator',
  TRIAL_MODERATOR: '🟢 Trial Moderator',
  STAFF:           '🟣 Staff',
  TRIAL_STAFF:     '🟣 Trial Staff',
  PARTNER_MANAGER: '🤝 Partner Manager',
  CREATOR:         '🎥 Creator',
  BOOSTER:         '⭐ Booster',
  VERIFIED:        '✅ Verified',
  MEMBER:          '👤 Member',
  MUTED:           '🚫 Muted',
};

const STAFF_HIERARCHY = [
  Roles.OWNER,
  Roles.SERVER_MANAGER,
  Roles.MODERATOR,
  Roles.TRIAL_MODERATOR,
  Roles.STAFF,
  Roles.TRIAL_STAFF,
];

/**
 * Returns true if the member has any of the given role names.
 */
export function hasRole(member, ...roleNames) {
  return member.roles.cache.some((r) => roleNames.includes(r.name));
}

/**
 * Returns true if the member is staff (any staff role).
 */
export function isStaff(member) {
  return hasRole(member, ...STAFF_HIERARCHY);
}

/**
 * Returns true if the member is at least a Trial Moderator.
 */
export function isMod(member) {
  return hasRole(member, Roles.OWNER, Roles.SERVER_MANAGER, Roles.MODERATOR, Roles.TRIAL_MODERATOR);
}

/**
 * Returns true if the member is Server Manager or Owner.
 */
export function isManager(member) {
  return hasRole(member, Roles.OWNER, Roles.SERVER_MANAGER);
}

/**
 * Returns true if the member is the guild owner or has the Owner role.
 */
export function isOwner(member) {
  return member.id === member.guild.ownerId || hasRole(member, Roles.OWNER);
}

/**
 * Find a role in the guild by name (case-sensitive).
 */
export function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name) ?? null;
}

/**
 * Find a channel by name in the guild.
 */
export function findChannel(guild, name) {
  return guild.channels.cache.find((c) => c.name === name) ?? null;
}

/**
 * Check if the bot can perform an action on a target member.
 * Bot role must be higher than target role.
 */
export function canModerate(guild, targetMember) {
  const botMember = guild.members.me;
  if (!botMember || !targetMember) return false;
  if (targetMember.id === guild.ownerId) return false;
  return botMember.roles.highest.comparePositionTo(targetMember.roles.highest) > 0;
}

/**
 * Permission overwrites for @everyone — restricted by default.
 */
export const everyonePerms = {
  deny: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.CreatePublicThreads,
    PermissionFlagsBits.CreatePrivateThreads,
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.Administrator,
  ],
  allow: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
  ],
};

/**
 * Permission overwrites for the Verified role.
 */
export const verifiedPerms = {
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
};

/**
 * Full permission for staff categories (hidden from @everyone).
 */
export const staffOnlyPerms = {
  everyone: {
    deny: [PermissionFlagsBits.ViewChannel],
  },
};
