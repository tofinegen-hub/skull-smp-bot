import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('🐢 Set slowmode on a channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((o) =>
      o.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600),
    )
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Channel (defaults to current)').setRequired(false),
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')],
        ephemeral: true,
      });
    }

    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    await channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

    const msg = seconds === 0
      ? `✅ Slowmode disabled in ${channel}.`
      : `✅ Slowmode set to **${seconds}s** in ${channel}.`;

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(msg).setFooter({ text: config.footer.text }).setTimestamp()],
    });
  },
};
