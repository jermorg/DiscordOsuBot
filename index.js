const fs = require('fs');
const path = require('node:path');
let config = JSON.parse(fs.readFileSync('config.json'));
const Banchojs = require("bancho.js");
const client = new Banchojs.BanchoClient({ username: config["login"], password: config["password"], apiKey: config["apiKey"]});

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Collection,
  REST, Routes
} = require("discord.js");

const { discordToken } = require("./config.json");

var tokenOsu;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildWebhooks,
  ],
});

bot.on("ready", async () => {

  const rest = new REST().setToken(discordToken);

  // rest.put(Routes.applicationCommands('1184071317767602186'), { body: [] })
  //   .then(() => console.log('Successfully deleted all application commands.'))
  //   .catch(console.error);

  bot.commands = new Collection();

  const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));//*

  let commands = [];

  for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      commands.push(command.data);
      bot.commands.set(command.data.name, command);
  }

  await rest.put( Routes.applicationCommands('1184071317767602186'), { body: commands },);

  fetch('https://osu.ppy.sh/oauth/token', {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "client_id={your-osu-client-id}&client_secret={your-osu-client-secret}&grant_type=client_credentials&scope=public"
  }).then(res => res.json())
  .then(async data => {
    tokenOsu = data.access_token
    console.log("ready");
    client.connect()
  });
});

bot.on("interactionCreate", async (interaction) => {

  if(interaction.isButton()){

    const command = interaction.client.commands.get(interaction.message.interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
      switch(interaction.message.interaction.commandName){
        case 'create_lobby': 
          await command.execute(interaction, tokenOsu, client, config, bot);
        break;
      }
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }

  } else if(interaction.isChatInputCommand() || interaction.isAutocomplete()){

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
      switch(interaction.commandName){
        case 'user': 
          await command.execute(interaction, tokenOsu);
        break;
        case 'create_lobby': 
          await command.execute(interaction, tokenOsu, client, config, bot);
        break;
        case 'ping': 
          await command.execute(interaction, bot);
        break;
      }
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
  }
});

bot.login(discordToken);
