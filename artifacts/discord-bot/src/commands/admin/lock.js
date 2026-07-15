import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('🔒 Lock a channel so members cannot send messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Channel to lock (defaults to current)').setRequired(false),
    )
    .addStringOption((o) =>
      o.setName('reason').setDescription('Reason for locking').setRequired(false),
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')],
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';
    const everyone = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false });

      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔒  Channel Locked')
        .setDescription(`${channel} has been locked.\n\n**Reason:** ${reason}`)
        .setFooter({ text: `Locked by ${interaction.user.tag} • ${config.footer.text}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ ${channel} has been locked.`)],
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
