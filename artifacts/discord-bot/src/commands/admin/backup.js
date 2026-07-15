import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import config from '../../config/config.js';
import { isManager } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('💾 Create a server structure backup (roles, channels, permissions).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isManager(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Server Manager+ only.')],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        name: r.name,
        color: r.hexColor,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: r.permissions.bitfield.toString(),
        position: r.position,
      }));

    const channels = guild.channels.cache
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map((c) => ({
        name: c.name,
        type: c.type,
        parentName: c.parent?.name ?? null,
        position: c.rawPosition,
      }));

    const backup = {
      guildName: guild.name,
      guildId: guild.id,
      createdAt: new Date().toISOString(),
      memberCount: guild.memberCount,
      roles,
      channels,
    };

    const json = JSON.stringify(backup, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(json, 'utf8'), {
      name: `backup-${guild.id}-${Date.now()}.json`,
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('💾  Server Backup Created')
          .setDescription(
            `Backed up **${roles.length}** roles and **${channels.length}** channels.\n\n` +
            `The JSON file is attached below. Keep it safe!`,
          )
          .setFooter({ text: config.footer.text })
          .setTimestamp(),
      ],
      files: [attachment],
    });
  },
};
