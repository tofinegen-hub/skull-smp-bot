import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";

import config from "../../config/config.js";
import db from "../../utils/database.js";

export default {

  data: new SlashCommandBuilder()
    .setName("forcecloseticket")
    .setDescription("Force closes the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle("⚡ Ticket Force Closed")
          .setDescription(
            `Ticket force closed by ${interaction.user}.`
          ),
      ],
    });

    db.closeTicket(interaction.channel.id);

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);

  },
};
