const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, } = require("discord.js");
const fs = require('fs');
let userList = JSON.parse(fs.readFileSync('userList.json'));

const getBitMupp = require("../func/getBitMupp");

var cHost;
let lobby;
let botLobby = {};


function hostRotate (currentHost, slots, timer, id) {
    setTimeout(() => {
        players = [];
        for (var i = 0; i < botLobby[id].size; i++) {
            if (slots[i] !== null) players.push(slots[i].user.ircUsername)
        }
        var nextHost = players.indexOf(currentHost) + 1
        if (nextHost > players.length - 1) botLobby[id].setHost(players[0])
        else botLobby[id].setHost(players[nextHost])}, timer);
}

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("create_lobby")
    .setDescription("create lobby")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Назва")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("beatmap")
        .setDescription("beatmap id")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("max_difficulty")
        .setDescription("Max difficulty rating (3.00 - 10+)")
        .setMinValue(3)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('team_mode')
        .setDescription('Team mode lobby')
        .addChoices(
            { name: 'Head-to-head', value: '0' },
            { name: 'Tag co-op', value: '1' },
            { name: 'Team VS', value: '2' },
            { name: 'Tag Team VS', value: '3' },
        )
    )
    .addStringOption(option =>
      option.setName('win_condition')
        .setDescription('Win condition lobby')
        .addChoices(
            { name: 'Score', value: '0' },
            { name: 'Accuracy', value: '1' },
            { name: 'Combo', value: '2' },
        )
    ),
  async execute(interaction, tokenOsu, client, config) {
    if (interaction.isAutocomplete()) {
      const focusedValue = interaction.options.getFocused();

      const url = new URL(
          "https://osu.ppy.sh/api/v2/beatmapsets/search"
      );

      const params = {
          "cursor_string": focusedValue
      };
      Object.keys(params)
          .forEach(key => url.searchParams.append(key, params[key]));

      let res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${tokenOsu}`,
          },
      })

      res = await res.json();

      let results = [];

      for (var i = 0; i < res.beatmapsets.length; i++) {
        let truncatedString = res.beatmapsets[i].title.length > 50
          ? res.beatmapsets[i].title.substring(0, 50) + "..."
          : res.beatmapsets[i].title;

        let truncatedVersion = res.beatmapsets[i].beatmaps[0].version.length > 40
          ? res.beatmapsets[i].beatmaps[0].version.substring(0, 40) + "..."
          : res.beatmapsets[i].beatmaps[0].version;

        results.push({ name: `${truncatedString} [${truncatedVersion}]`, value: res.beatmapsets[i].beatmaps[0].id })
      }

      results.length = 24;

      const filtered = results.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
      await interaction.respond(
        filtered.map(choice => ({ name: choice.name, value: choice.value })),
      );
    } else if(interaction.isChatInputCommand()){

      if(interaction.guildId == null) return interaction.reply(`use command on guild!`);
      if(botLobby[interaction.user.id] != undefined && botLobby[interaction.user.id] != null) return interaction.reply(`can't create 2 or more lobbys!`);


      console.log(botLobby)

      const cmdPrefix = config["commandPrefix"];
      const afkTimer = config["afkTimer"];
      let currentAfkTimer = afkTimer;
      var beatmapChanged = false;

      var mupssHistory = [];
      let mapDiscord;

      const { options } = interaction;

      await interaction.deferReply();

      let nameChanel = options.getString("name");
      nameChanel = `${nameChanel} - ${Math.floor(Math.random() * 30)}`;
      const beatmapsId = options.getInteger("beatmap");
      let maxDeiff = options.getNumber("max_difficulty") || 3.00;
      let teamMode = options.getString("team_mode") || 0;
      let winCondition = options.getString("win_condition") || 0;

      const beatMup = await getBitMupp(beatmapsId, tokenOsu);


      if (beatMup.error === null) {
        return interaction.editReply(`Бит мапа с айди:${beatmapsId} не существует`);
      }

        const stop = new ButtonBuilder()
          .setLabel('Close')
          .setCustomId('stop')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
          .addComponents(stop);


        const channel = await client.createLobby(nameChanel);
        botLobby[interaction.user.id] = channel.lobby; 
        await Promise.all([botLobby[interaction.user.id].setMap(beatmapsId), botLobby[interaction.user.id].setPassword(config["lobbyPassword"])]);
        botLobby[interaction.user.id].setSettings(teamMode, winCondition)

        mupssHistory[0] = beatmapsId;
        mapDiscord = { name: 'Beatmap', value: `- [**${beatMup.beatmapset.title} [${beatMup.version}]**](https://osu.ppy.sh/beatmapsets/${beatMup.beatmapset_id}#osu/${beatMup.id})\n - by ${beatMup.beatmapset.creator}\n- Rating: ${beatMup.difficulty_rating.toFixed(2)} 🌟\n- HP Drain: ${beatMup.drain.toFixed(2)} 💢\n- AR: ${beatMup.ar} 💨` };


        const embed = new EmbedBuilder()
            .setColor(0x7447fc)
            .setAuthor({ name: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
            .setTitle(`Lobby: ${botLobby[interaction.user.id].name}`)
            .setDescription(`Max difficulty: **${maxDeiff}**\n[Multiplayer link](https://osu.ppy.sh/mp/${botLobby[interaction.user.id].id})`)
            .addFields({ name: 'Status', value: '🟡 Waiting...' })
            .addFields(mapDiscord)
            .addFields({ name: 'Lobby Players', value: 'none' })

        let interFetch = await interaction.editReply({
            embeds: [embed],
            components: [row],
            fetchReply: true,
        });

        var players = [];
        botLobby[interaction.user.id].on("playerJoined", async (obj) => {
            setTimeout( async () => {
                obj.player.user.sendMessage(`Welcome to ${nameChanel} lobby! Max difficulty: ${maxDeiff}`);
                players = [];
                let playerList = '';
                for (var i = 0; i < botLobby[interaction.user.id].size; i++) {
                    if (botLobby[interaction.user.id].slots[i] !== null) {
                        players.push(botLobby[interaction.user.id].slots[i].user.username)
                        if(botLobby[interaction.user.id].slots[i].isHost){
                            playerList = `${playerList}👑 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                        } else {
                            playerList = `${playerList}👤 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                        }
                    }
                }
                
                if (players.length === 1) botLobby[interaction.user.id].setHost(obj.player.user.username)
                if(playerList == '') playerList = 'none';

                let embedOnStart = interFetch.embeds[0];
                embedOnStart.data.fields[2].value = playerList;

                await interFetch.edit({
                    embeds: [embedOnStart],
                });
              }, 1000);
        });
        botLobby[interaction.user.id].on("hostCleared", async (obj) => {
            players = [];
            let playerList = '';
            for (var i = 0; i < botLobby[interaction.user.id].size; i++) {
                if (botLobby[interaction.user.id].slots[i] !== null) {
                    players.push(botLobby[interaction.user.id].slots[i].user.username)
                    if(botLobby[interaction.user.id].slots[i].isHost){
                        playerList = `${playerList}👑 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                    } else {
                        playerList = `${playerList}👤 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                    }
                }
            }

            if(playerList == '') playerList = 'none';

            let embedOnStart = interFetch.embeds[0];
            embedOnStart.data.fields[2].value = playerList;

            await interFetch.edit({
                embeds: [embedOnStart],
            });
        });
        botLobby[interaction.user.id].on("playerLeft", async (obj) => {
            players = [];
            let playerList = '';
            for (var i = 0; i < botLobby[interaction.user.id].size; i++) {
                if (botLobby[interaction.user.id].slots[i] !== null) {
                    players.push(botLobby[interaction.user.id].slots[i].user.username)
                    if(botLobby[interaction.user.id].slots[i].isHost){
                        playerList = `${playerList}👑 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                    } else {
                        playerList = `${playerList}👤 ${botLobby[interaction.user.id].slots[i].user.username}\n`
                    }
                }
            }

            if(playerList == '') playerList = 'none';

            let embedOnStart = interFetch.embeds[0];
            embedOnStart.data.fields[2].value = playerList;

            await interFetch.edit({
                embeds: [embedOnStart],
            });
        });

        botLobby[interaction.user.id].on("matchFinished", async () => {
            currentAfkTimer = afkTimer;
            try {
                hostRotate(botLobby[interaction.user.id].getHost().user.ircUsername, botLobby[interaction.user.id].slots, 500, interaction.user.id);
                //cHost = botLobby[interaction.user.id].getHost().user.ircUsername;
            } catch (UnhandledPromiseRejectionWarning) {
                players = [];
                for (var i = 0; i < botLobby[interaction.user.id].size; i++) {
                    if (botLobby[interaction.user.id].slots[i] !== null) players.push(botLobby[interaction.user.id].slots[i].user.ircUsername);
                }
                botLobby[interaction.user.id].setHost(players[0]);
            }
            if (botLobby[interaction.user.id].slots.filter(player => player != null).length > -1 && botLobby[interaction.user.id].getHost().user.ircUsername == cHost) hostRotate(lobby.getHost().user.ircUsername, lobby.slots, 5000);
            beatmapChanged = false;

            let embedOnStart = interFetch.embeds[0];
            embedOnStart.data.fields[0] = { name: 'Status', value: '🟡 Waiting...',},
            embedOnStart.data.fields[1] = mapDiscord

            await interFetch.edit({
                embeds: [embedOnStart],
            });
        });
        botLobby[interaction.user.id].on("allPlayersReady", async () => {
            currentAfkTimer = afkTimer;
            botLobby[interaction.user.id].startMatch(5);

            let embedOnStart = interFetch.embeds[0];

            embedOnStart.data.fields[0] = { name: 'Status', value: '🟢 Playing',},
            embedOnStart.data.fields[1] = mapDiscord

            await interFetch.edit({
                embeds: [embedOnStart],
            });
        });
        botLobby[interaction.user.id].on("refereeChangedName", () => {
            console.log(lobby.name)
            botLobby[interaction.user.id].getHost.user.sendMessage("pls don't change lobby name")
            hostRotate(botLobby[interaction.user.id].getHost().user.ircUsername, lobby.slots, 1000, interaction.user.id);
        });
        botLobby[interaction.user.id].on("passwordChanged", () => {
            botLobby[interaction.user.id].getHost.user.sendMessage("pls don't change password")
            hostRotate(botLobby[interaction.user.id].getHost().user.ircUsername, botLobby[interaction.user.id].slots, 1000, interaction.user.id);
        });
        botLobby[interaction.user.id].on("beatmap", async (mupp) => {
            console.log('mapp')
            if(mupp == null) return;
            if(mupp.difficultyRating > maxDeiff){
                botLobby[interaction.user.id].setMap(mupssHistory[0])
            } else {
                mapDiscord = { name: 'Beatmap', value: `- [**${mupp.title} [${mupp.version}]**](https://osu.ppy.sh/beatmapsets/${mupp.setId}#osu/${mupp.id})\n - by ${mupp.creator}\n- Rating: ${mupp.difficultyRating.toFixed(2)} 🌟\n- HP Drain: ${mupp.diffDrain} 💢\n- AR: ${mupp.diffApproach} 💨` };

                mupssHistory[0] = mupp.id;

                let embedOnStart = interFetch.embeds[0];
                    embedOnStart.data.fields[0] = { name: 'Status', value: '🟡 Waiting...',},
                    embedOnStart.data.fields[1] = mapDiscord


                await interFetch.edit({
                    embeds: [embedOnStart],
                });
            }
        });
        client.on("PM", async ({user, message}) => {
            if (message[0] !== cmdPrefix) return;
            const command = message.split(" ")[0].toLowerCase();
            userList = JSON.parse(fs.readFileSync('userList.json'));
            switch (command) {
                case cmdPrefix + "restart":
                    for (var i = 0; i < userList["admin"].length; i++) {
                        if (userList["admin"][i]["userName"] === user.ircUsername && userList["admin"][i]["permissionLevel"] >= 2) {
                            botLobby[interaction.user.id].closeLobby();
                            const channel = await client.createLobby(nameChanel);
                            botLobby[interaction.user.id] = channel.lobby;
                            await Promise.all([botLobby[interaction.user.id].setMap(1012131), botLobby[interaction.user.id].setPassword(config["lobbyPassword"])]);
                            botLobby[interaction.user.id].setSettings(config["teamMode"], config["winCondition"])
                            console.log("Lobby created! Name: "+botLobby[interaction.user.id].name);
                            console.log("Multiplayer link: https://osu.ppy.sh/mp/"+botLobby[interaction.user.id].id);
                        }
                    }
                break;
                case cmdPrefix + "close":
                
                    if(botLobby[interaction.user.id].getHost() != null){
                        if(botLobby[interaction.user.id].getHost().user.username == user.username){
                            botLobby[interaction.user.id].closeLobby();
                            await interFetch.edit({
                                content: `Game closed By **${user.username}**`,
                                embeds: [],
                                components: [],
                            });
                        }
                    } else {

                    }
                    
                break;
                case cmdPrefix + "host":
                    for (var i = 0; i < userList["admin"].length; i++) {
                        if (userList["admin"][i]["userName"] === user.ircUsername && userList["admin"][i]["permissionLevel"] >= 1) {
                            lobby.setHost(message.split(" ")[1]);
                        }
                    }
                    break; 
                case cmdPrefix + "settings":
                    for (var i = 0; i < userList["admin"].length; i++) {
                        if (userList["admin"][i]["userName"] === user.ircUsername && userList["admin"][i]["permissionLevel"] >= 1) {
                            botLobby[interaction.user.id].setSettings(message.split(" ")[1], message.split(" ")[2]);
                        }
                    }
                    break; 
                case cmdPrefix + "mods":
                    for (var i = 0; i < userList["admin"].length; i++) {
                        if (userList["admin"][i]["userName"] === user.ircUsername && userList["admin"][i]["permissionLevel"] >= 1) {
                            botLobby[interaction.user.id].setMods(message.split(" ")[1], message.split(" ")[2]);
                        }
                    }
                    break;
                case cmdPrefix + "info":
                    msg_welcome = JSON.parse(fs.readFileSync('config.json'))["msg_welcome"];
                    user.sendMessage(msg_welcome);
                    break;
                case cmdPrefix + "lobbyinfo":
                    user.sendMessage("Name:" + botLobby[interaction.user.id].name);
                    user.sendMessage("Players:");
                    players = botLobby[interaction.user.id].slots.filter(player => player != null);
                    for (var i = 0; i < players.length;i++) user.sendMessage(players[i].user.ircUsername+ '');
                    user.sendMessage("Map:" + botLobby[interaction.user.id].beatmapId);
                    user.sendMessage("Host:" + botLobby[interaction.user.id].getHost().user.ircUsername);
                    for (var i = 0; i < botLobby[interaction.user.id].mods.length;i++) user.sendMessage(botLobby[interaction.user.id].mods[i]+ '');
                    user.sendMessage("Freemod:" + botLobby[interaction.user.id].freemod);
                    user.sendMessage("Settings:" + botLobby[interaction.user.id].teamMode + "" + botLobby[interaction.user.id].winCondition);
                    break;
            }
        });

        setInterval(function () {
            if (botLobby[interaction.user.id] != null
                && botLobby[interaction.user.id].name != ""
                && botLobby[interaction.user.id].playing == false
                && botLobby[interaction.user.id].slots.filter(player => player != null).length > 1) {

                currentAfkTimer -= 1;

                if (currentAfkTimer == 0) {
                    hostRotate(botLobby[interaction.user.id].getHost().user.ircUsername, botLobby[interaction.user.id].slots, 1000, interaction.user.id);
                    currentAfkTimer = afkTimer;
                }
                botLobby[interaction.user.id].on("beatmap", () => {
                    currentAfkTimer = afkTimer;
                });
            }
            else {
                currentAfkTimer = afkTimer;
            }
        }, 1000);

        process.on("SIGINT", async () => {
            console.log("Closing lobby and disconnecting...");
            if(botLobby[interaction.user.id] != null){
                await botLobby[interaction.user.id].closeLobby();
                await interFetch.edit({
                    content: `game ended`,
                    embeds: [],
                    components: [],
                });
            }
            await client.disconnect();
                process.exit(1)
            });
    } else if(interaction.isButton()){
        if(interaction.customId == 'stop') {
            if(interaction.user.id != interaction.message.interaction.user.id) return interaction.reply({ content: `You don't have permission to close lobby`, ephemeral: true })
                console.log(botLobby[interaction.message.interaction.user.id])
            if(botLobby[interaction.message.interaction.user.id] != undefined){
                await botLobby[interaction.message.interaction.user.id].closeLobby();
                botLobby[interaction.message.interaction.user.id] = null
                await interaction.message.edit({
                    content: `Game closed By **<@${interaction.user.id}>**`,
                    embeds: [],
                    components: [],
                })

            } else {
                interaction.message.delete();
                return interaction.reply({ content: `Sorry, we can't close lobby, but we delete message)`, ephemeral: true })
            }
        }
    }
  },
};