/**
 * Skull SMP — /setupserver
 * Creates the entire professional Minecraft-themed server from scratch.
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { runServerSetup } from '../../utils/serverSetup.js';
import config from '../../config/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setupserver')
    .setDescription('⚙️ Set up the entire Skull SMP server structure automatically.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Only the **Server Owner** can run `/setupserver`.')
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: false });

    try {
      const results = await runServerSetup(interaction.guild, interaction);

      const total   = results.length;
      const success = results.filter((r) => r.includes('✅')).length;
      const skipped = results.filter((r) => r.includes('↳')).length;
      const failed  = results.filter((r) => r.includes('❌')).length;

      const summary = new EmbedBuilder()
        .setColor(failed > 0 ? config.colors.warning : config.colors.success)
        .setTitle('✅  Server Setup Complete — Skull SMP')
        .setDescription(
          `The server has been configured!\n\n` +
          `**Summary:**\n` +
          `✅ Created: **${success}**\n` +
          `↳  Skipped (already exists): **${skipped}**\n` +
          `❌ Failed: **${failed}**`,
        )
        .addFields({
          name: '📋 Full Log',
          value:
            results
              .slice(-20)
              .join('\n')
              .slice(0, 1000) + (results.length > 20 ? '\n...' : ''),
        })
        .setFooter({
          text: config.footer.text,
          iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [summary] });
    } catch (err) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌  Setup Failed')
            .setDescription(`An error occurred during setup:\n\`\`\`${err.message}\`\`\``)
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
      });
    }
  },
};
