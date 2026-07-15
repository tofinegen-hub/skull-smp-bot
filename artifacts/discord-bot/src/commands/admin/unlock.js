import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('🔓 Unlock a channel so members can send messages again.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Channel to unlock (defaults to current)').setRequired(false),
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')],
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const everyone = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: null });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🔓  Channel Unlocked')
        .setDescription(`${channel} has been unlocked.`)
        .setFooter({ text: `Unlocked by ${interaction.user.tag} • ${config.footer.text}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ ${channel} has been unlocked.`)],
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Failed: ${err.message}`)],
        ephemeral: true,
      });
    }
  },
};
