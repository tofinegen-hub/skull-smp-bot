/**
 * Skull SMP — guildMemberRemove
 * Logs when a member leaves the server.
 */

import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import { findChannel } from '../utils/permissions.js';

export default {
  name: 'guildMemberRemove',

  async execute(member) {
    const guild = member.guild;
    const logChannel = findChannel(guild, '🚪・welcome-leave') || findChannel(guild, 'welcome-leave');
    if (!logChannel) return;

    const leaveEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🚪 Member Left')
      .setDescription(`Goodbye **${member.user.tag}**! We are sad to see you go.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User Tag', value: member.user.tag, inline: true },
        { name: 'Total Members Now', value: `${guild.memberCount}`, inline: true }
      )
      .setFooter({ text: config.footer.text })
      .setTimestamp();

    await logChannel.send({ embeds: [leaveEmbed] }).catch((err) => {
      console.error('Failed to send leave message:', err);
    });
  }
};
