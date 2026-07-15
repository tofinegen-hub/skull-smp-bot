/**
 * Skull SMP — messageUpdate
 * Logs edited messages to message-logs.
 */

import { EmbedBuilder } from 'discord.js';
import { findChannel } from '../utils/permissions.js';
import config from '../config/config.js';

export default {
  name: 'messageUpdate',

  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const logChannel = findChannel(newMessage.guild, '📜・message-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('✏️  Message Edited')
      .setURL(newMessage.url)
      .addFields(
        { name: '👤 Author',  value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: '📍 Channel', value: `${newMessage.channel}`, inline: true },
        { name: '📝 Before',  value: (oldMessage.content || '*empty*').slice(0, 500), inline: false },
        { name: '📝 After',   value: (newMessage.content || '*empty*').slice(0, 500), inline: false },
      )
      .setFooter({ text: config.footer.text, iconURL: newMessage.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
