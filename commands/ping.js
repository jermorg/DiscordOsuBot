const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("status")
    .toJSON(),
  async execute(interaction, bot) {
    await interaction.deferReply();

    const reply = await interaction.fetchReply();

    const ping = reply.createdTimestamp - interaction.createdTimestamp;

    interaction.editReply(
      `Pong! Client ${ping}ms | Websocket: ${bot.ws.ping}ms`
    );
  },
};
