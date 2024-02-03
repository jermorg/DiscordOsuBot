const { SlashCommandBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

const getUser = require("../func/getUser");
const getBestResult = require("../func/getBestResult");

const kordsPos =
{
  "userName_X": 218,
  "userName_Y": 182,

  "avatar_X": 48,
  "avatar_Y": 99,
}

function drawBestsRresults(context, slice, arr, stratY, o){
  const startX = 63
  context.drawImage(slice, 48, stratY, 605, 75);

  context.font = '14px Poppins';
  context.fillStyle = '#ffffff';
  context.fillText(`${arr[o].beatmapset.title}`, startX, stratY + 25);
  const withafterName = context.measureText(`${arr[o].beatmapset.title}`).width;

  context.font = '11px Poppins';
  context.fillStyle = 'rgba(255, 255, 255, 0.58)';
  context.fillText(` ${arr[o].beatmapset.artist}`, startX + withafterName, stratY + 25);

  context.font = '14px Poppins';
  context.fillStyle = '#ffffff';
  context.fillText(`${arr[o].statistics.count_300}`, startX, stratY + 50 + 15);
  context.fillText(`${arr[o].statistics.count_100}`, 137, stratY + 50 + 15);
  context.fillText(`${arr[o].statistics.count_50}`, 238, stratY + 50 + 15);
  context.fillText(`${arr[o].accuracy.toFixed(2)}`, 339, stratY + 50 + 15);
  context.textAlign = "right";
  context.fillText(`${Math.round(arr[o].weight.pp)}`, 638, stratY + 50 + 15);
  context.textAlign = "left";
}

function formatNumber(text){
  var optNumber = { style: 'decimal', useGrouping: true };
  if(text == null){
    return '---'
  }
  return text.toLocaleString('en-US', optNumber).replace(/,/g, ' ');
}

function formatSeconds(seconds) {
  var days = Math.floor(seconds / (3600 * 24));
  var hours = Math.floor((seconds % (3600 * 24)) / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);

  var formattedString = days + 'd ' + hours + 'h ' + minutes + 'm';
  return formattedString;
}

function clipper(ctx,img, x,y,w,h,rad){
  ctx.beginPath();
  ctx.arc(x+rad, y+rad, rad, Math.PI, Math.PI+Math.PI/2 , false);
  ctx.lineTo(x+w - rad, y);
  ctx.arc(x+w-rad, y+rad, rad, Math.PI+Math.PI/2, Math.PI*2 , false);
  ctx.lineTo(x+w,y+h - rad);
  ctx.arc(x+w-rad,y+h-rad,rad,Math.PI*2,Math.PI/2,false);
  ctx.lineTo(x+rad,y+h);
  ctx.arc(x+rad,y+h-rad,rad,Math.PI/2,Math.PI,false);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.drawImage(img,x,y,w,h);
  ctx.restore();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Info user")
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("id or username user Osu!")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .toJSON(),
  async execute(interaction, tokenOsu) {
    if (interaction.isAutocomplete()) {

      const focusedValue = interaction.options.getFocused();

      if(focusedValue == '') return;

      const url = new URL(
          "https://osu.ppy.sh/api/v2/search"
      );

      const params = {
        "mode": "user",
        "query": focusedValue,
        "page": "1",
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

      res.user.data.length = 26

      let results = [];
      let num = 0;

      if(res.user.data.length > 24){
        n = 24
      } else {
        n = res.user.data.length
      }

      for (var i = 0; i < n; i++) {
        if(res.user.data[i]) {
          results.push({ name: `${res.user.data[i].username}`, value: `${res.user.data[i].id}` })
        }
      }

      results.length = 24;

      const filtered = results.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
      await interaction.respond(
        filtered.map(choice => ({ name: choice.name, value: choice.value })),
      );

    } else {
      const { options } = interaction;
      await interaction.deferReply();
      const id = options.getString("user");
      const user = await getUser(id, tokenOsu);

      console.log(user)

      if (user.error === null) {
        return interaction.editReply(`Player with id or username:${id} not found!`);
      }

      const userBitMupp = await getBestResult(user.id, tokenOsu);

      GlobalFonts.registerFromPath('font/Poppins-Regular.ttf', 'Poppins' )

      const canvas = createCanvas(705, 952);
      const context = canvas.getContext('2d');

      var gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#682ee6");
      gradient.addColorStop(1, "#3a2ee6");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const banner = await loadImage(user.cover_url);
      const avatar = await loadImage(user.avatar_url);

      context.filter = "blur(60px)";
      context.drawImage(banner, 0 - canvas.width / 2, 0, canvas.width * 2, canvas.height + 90);
      context.fillStyle = 'rgba(0, 0, 0, 0.29)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.filter = "blur(0px)";

      if(userBitMupp.length != 0) {
        const background = await loadImage('./img/Slice 1.png');
        const slice = await loadImage('./img/Slice 2.png');

        context.drawImage(background, 0, 0, canvas.width, canvas.height);

        let slice_Y = 514;

        for (var o = 0; o < userBitMupp.length; o++) {
          drawBestsRresults(context, slice, userBitMupp, slice_Y, o);
          slice_Y = slice_Y + 85;
        }
      } else {
        const background = await loadImage('./img/Slice 1.2.jpg');
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
      }

      context.drawImage(banner, 0, 0, canvas.width, 174);

      context.fillStyle = 'black';
      context.globalAlpha = 0.3;
      context.fillRect(0, 0, canvas.width, 174);
      context.globalAlpha = 1.0;

      clipper(context, avatar, kordsPos.avatar_X, kordsPos.avatar_Y, 150, 150, 28);

      context.shadowOffsetX = 0;
      context.shadowOffsetY = 4;
      context.shadowBlur = 23;
      context.shadowColor = 'rgba(0, 0, 0, 1)';

      context.shadowColor = 'rgba(0, 0, 0, 0)';
      context.shadowOffsetY = 0;
      context.shadowBlur = 0;
      context.font = '25px Poppins';
      context.fillStyle = '#ffffff';
      context.fillText(user.username, kordsPos.userName_X, kordsPos.userName_Y + 25);

      if(user.is_supporter){
        const widthNick = context.measureText(`${user.username}`).width;
        context.drawImage(await loadImage('./img/sponsor.png'), 218 + widthNick + 10, 185, 49, 24);
      }

      context.textAlign = "left";
      context.font = '23px Poppins';
      context.fillStyle = '#ffffff';
      context.fillText(`#${formatNumber(user.statistics.global_rank)}`, 48, 317 + 25);

      context.font = '23px Poppins';
      context.fillStyle = '#ffffff';
      context.fillText(`#${formatNumber(user.statistics.country_rank)}`, 192, 317 + 25);

      context.font = '23px Poppins';
      context.fillStyle = '#ffffff';
      context.fillText(`${formatSeconds(user.statistics.play_time)}`, 351, 317 + 25);

      context.textAlign = "right";
      context.fillText(`${formatNumber(user.statistics.pp)}`, canvas.width - 52, 317 + 25);

      context.textAlign = "left";
      context.fillText(`${user.statistics.count_300}`, 48, 423 + 25);

      context.fillText(`${user.statistics.count_100}`, 162, 423 + 25);

      context.fillText(`${user.statistics.count_50}`, 275, 423 + 25);

      context.textAlign = "right";
      context.fillText(`${user.statistics.hit_accuracy}`, canvas.width - 52, 423 + 25);

      const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });

      const link = new ButtonBuilder()
          .setLabel('Profile')
          .setStyle('Link')
          .setURL('https://osu.ppy.sh/users/'+user.id)

        const row = new ActionRowBuilder()
          .addComponents(link);

      await interaction.editReply({
        files: [attachment],
        components: [row],
      });
    }
  },
};