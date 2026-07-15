import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../../config/config.js';
import db from '../../utils/database.js';
import { isManager } from '../../utils/permissions.js';

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎉 Manage giveaways.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) =>
      s.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption((o) => o.setName('prize').setDescription('Prize to give away').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('Duration e.g. 1h, 7d').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(false))
        .addChannelOption((o) => o.setName('channel').setDescription('Channel for the giveaway').setRequired(false)),
    )
    .addSubcommand((s) =>
      s.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((o) => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption((o) => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)),
    ),

  async execute(interaction) {
    if (!isManager(interaction.member)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Server Manager+ only.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize    = interaction.options.getString('prize');
      const durStr   = interaction.options.getString('duration');
      const winners  = interaction.options.getInteger('winners') ?? 1;
      const channel  = interaction.options.getChannel('channel') ?? interaction.channel;
      const durMs    = parseDuration(durStr);

      if (!durMs) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Invalid duration.')], ephemeral: true });

      const endsAt = Date.now() + durMs;

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🎉  GIVEAWAY')
        .setDescription(
          `**Prize:** ${prize}\n\n` +
          `Click the button below to enter!\n\n` +
          `**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n` +
          `**Winners:** ${winners}\n` +
          `**Hosted by:** ${interaction.user.tag}`,
        )
        .setFooter({ text: `${config.footer.text} • Ends`, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp(new Date(endsAt));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway_enter').setLabel('🎉 Enter').setStyle(ButtonStyle.Success),
      );

      const msg = await channel.send({ embeds: [embed], components: [row] });

      db.createGiveaway({
        messageId: msg.id,
        channelId: channel.id,
        guildId: interaction.guildId,
        prize,
        winners,
        endsAt,
        hostId: interaction.user.id,
        entries: [],
        ended: false,
      });

      // Auto-end scheduler
      setTimeout(async () => {
        await endGiveaway(msg.id, interaction.guild, channel);
      }, durMs);

      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Giveaway started in ${channel}! Prize: **${prize}**`)], ephemeral: true });
    }

    if (sub === 'end') {
      const msgId = interaction.options.getString('message_id');
      await endGiveaway(msgId, interaction.guild);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription('✅ Giveaway ended.')], ephemeral: true });
    }

    if (sub === 'reroll') {
      const msgId   = interaction.options.getString('message_id');
      const giveaway = db.getGiveaway(msgId);
      if (!giveaway || !giveaway.ended) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Giveaway not found or not ended.')], ephemeral: true });

      if (giveaway.entries.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ No entries to reroll.')], ephemeral: true });
      }

      const newWinner = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
      const channel   = interaction.guild.channels.cache.get(giveaway.channelId);

      if (channel) {
        await channel.send({
          embeds: [new EmbedBuilder().setColor(config.colors.gold).setTitle('🎉  Giveaway Rerolled!').setDescription(`The new winner is: <@${newWinner}>! Congratulations! 🎊`).setFooter({ text: config.footer.text }).setTimestamp()],
        });
      }
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ Rerolled! New winner: <@${newWinner}>`)], ephemeral: true });
    }
  },
};

export async function endGiveaway(messageId, guild, channel) {
  const giveaway = db.getGiveaway(messageId);
  if (!giveaway || giveaway.ended) return;

  db.updateGiveaway(messageId, { ended: true });

  const ch = channel ?? guild.channels.cache.get(giveaway.channelId);
  if (!ch) return;

  const entries = giveaway.entries ?? [];
  if (entries.length === 0) {
    await ch.send({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('🎉  Giveaway Ended').setDescription(`**Prize:** ${giveaway.prize}\n\nNo one entered — no winners.`).setFooter({ text: config.footer.text }).setTimestamp()] });
    return;
  }

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const winners  = shuffled.slice(0, giveaway.winners);
  const mention  = winners.map((id) => `<@${id}>`).join(', ');

  await ch.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🎉  Giveaway Ended!')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winners:** ${mention}\n\nCongratulations! 🎊`)
        .setFooter({ text: config.footer.text })
        .setTimestamp(),
    ],
  });

  db.updateGiveaway(messageId, { winnerIds: winners });
}
