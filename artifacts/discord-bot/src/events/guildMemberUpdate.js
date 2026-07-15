/**
 * Skull SMP — guildMemberUpdate
 * Logs nickname changes to mod-logs.
 */

import { EmbedBuilder, AuditLogEvent } from 'discord.js';
import { findChannel } from '../utils/permissions.js';
import config from '../config/config.js';

export default {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember) {
    if (oldMember.nickname === newMember.nickname) return;

    const logChannel = findChannel(newMember.guild, '📜・mod-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('📝  Nickname Changed')
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User',      value: `${newMember.user.tag} (${newMember.id})`, inline: true },
        { name: '📝 Old Nick',  value: oldMember.nickname ?? '*None*', inline: true },
        { name: '📝 New Nick',  value: newMember.nickname ?? '*None*', inline: true },
      )
      .setFooter({ text: config.footer.text, iconURL: newMember.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
