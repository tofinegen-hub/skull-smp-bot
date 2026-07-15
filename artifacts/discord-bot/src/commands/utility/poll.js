import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config/config.js';
import { isStaff } from '../../utils/permissions.js';

const REACTIONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('🗳️ Create a poll.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption((o) => o.setName('options').setDescription('Options separated by | e.g. Yes|No|Maybe').setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to post in (defaults to current)').setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Staff only.')], ephemeral: true });
    }

    const question = interaction.options.getString('question');
    const rawOpts  = interaction.options.getString('options').split('|').map((o) => o.trim()).filter(Boolean);
    const channel  = interaction.options.getChannel('channel') ?? interaction.channel;

    if (rawOpts.length < 2) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ At least 2 options required.')], ephemeral: true });
    if (rawOpts.length > 10) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Max 10 options.')], ephemeral: true });

    const optionLines = rawOpts.map((opt, i) => `${REACTIONS[i]} ${opt}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`🗳️  Poll — ${question}`)
      .setDescription(optionLines + '\n\u200b')
      .setFooter({ text: `${config.footer.text} • Poll by ${interaction.user.tag}`, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });

    for (let i = 0; i < rawOpts.length; i++) {
      await msg.react(REACTIONS[i]);
    }

    await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Poll posted in ${channel}.`)], ephemeral: true });
  },
};
