import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config/config.js';
import { findChannel } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('💡 Submit a suggestion for the server.')
    .addStringOption((o) => o.setName('suggestion').setDescription('Your suggestion').setRequired(true).setMaxLength(1000)),

  async execute(interaction) {
    const text    = interaction.options.getString('suggestion');
    const channel = findChannel(interaction.guild, '💡・suggestions');

    if (!channel) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Suggestions channel not found. Run `/setupserver` first.')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('💡  New Suggestion')
      .setDescription(text)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .addFields({ name: '📊 Status', value: '⏳ Pending Review', inline: true })
      .setFooter({ text: config.footer.text, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
    await msg.react('❌');

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Your suggestion has been submitted to ${channel}! Thank you.`).setFooter({ text: config.footer.text }).setTimestamp()],
      ephemeral: true,
    });
  },
};
