import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isManager } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 Send a formatted announcement to a channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Channel to post in').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('title').setDescription('Announcement title').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Announcement body').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('ping').setDescription('Who to ping? (everyone / here / none)').setRequired(false)
        .addChoices(
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' },
          { name: 'None', value: 'none' },
        ),
    ),

  async execute(interaction) {
    if (!isManager(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Server Manager+ only.')],
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('channel');
    const title   = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const ping    = interaction.options.getString('ping') ?? 'none';

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle(`📢  ${title}`)
      .setDescription(message)
      .setFooter({
        text: `${config.footer.text} • Announced by ${interaction.user.tag}`,
        iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setTimestamp();

    const content = ping === 'everyone' ? '@everyone' : ping === 'here' ? '@here' : null;

    try {
      await channel.send({ content, embeds: [embed] });
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Announcement posted in ${channel}.`)],
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Could not post: ${err.message}`)],
        ephemeral: true,
      });
    }
  },
};
