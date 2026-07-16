import { findChannel, findRole } from '../utils/permissions.js';
import { welcomeEmbed } from '../utils/embeds.js';
import logger from '../utils/logger.js';

export default {
  name: 'guildMemberAdd',

  async execute(member) {
    const guild = member.guild;

    const memberRole = findRole(guild, '👤 Member');
    if (memberRole) {
      member.roles.add(memberRole).catch(() => {});
    }

    const joinLog = findChannel(guild, '📜・join-logs');
    if (joinLog) {
      const { EmbedBuilder } = await import('discord.js');
      await joinLog.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('👋 Member Joined')
            .setDescription(`${member.user.tag} joined the server.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: '👥 Member #', value: `${guild.memberCount}`, inline: true },
            )
            .setFooter({ text: 'Skull SMP' })
            .setTimestamp(),
        ],
      }).catch(() => {});
    }

    const welcomeChannel = findChannel(guild, '📌・welcome');
    if (!welcomeChannel) return;

    try {
      await welcomeChannel.send({ embeds: [welcomeEmbed(member)] });
    } catch (err) {
      logger.warn(`Could not send welcome message for ${member.user.tag}:`, err.message);
    }
  },
};
