import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import config from "../../config/config.js";
import db from "../../utils/database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("closeticket")
    .setDescription("Request to close a ticket."),

  async execute(interaction) {

    const ticket = db.getTicket(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription("❌ This isn't a ticket."),
        ],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_confirm_close")
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("ticket_cancel_close")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle("Close Ticket?")
          .setDescription(
            `<@${ticket.userId}>, staff would like to close this ticket.\n\nClick **Confirm** if your issue is solved.`
          ),
      ],
      components: [row],
    });

  },
};
