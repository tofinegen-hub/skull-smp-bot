/**
 * Skull SMP — messageDelete
 * Logs deleted messages to message-logs.
 */

import { EmbedBuilder } from 'discord.js';
import { findChannel } from '../utils/permissions.js';
import config from '../config/config.js';

export default {
  name: 'messageDelete',

  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    if (!message.content && !message.attachments?.size) return;

    const logChannel = findChannel(message.guild, '📜・message-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🗑️  Message Deleted')
      .addFields(
        { name: '👤 Author',  value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
        { name: '📍 Channel', value: `${message.channel}`, inline: true },
      )
      .setFooter({ text: config.footer.text, iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    if (message.content) {
      embed.addFields({ name: '📝 Content', value: message.content.slice(0, 1000) });
    }
    if (message.attachments?.size) {
      embed.addFields({ name: '📎 Attachments', value: [...message.attachments.values()].map((a) => a.url).join('\n').slice(0, 1000) });
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
