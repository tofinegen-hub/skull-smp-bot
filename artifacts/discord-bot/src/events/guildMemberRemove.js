/**
 * Skull SMP — guildMemberRemove
 * Sends leave embed to leave-logs channel.
 */

import { findChannel } from '../utils/permissions.js';
import { leaveEmbed } from '../utils/embeds.js';

export default {
  name: 'guildMemberRemove',

  async execute(member) {
    const guild = member.guild;

    const leaveLog = findChannel(guild, '📜・leave-logs');
    if (!leaveLog) return;

    try {
      await leaveLog.send({ embeds: [leaveEmbed(member)] });
    } catch (_) {}
  },
};
