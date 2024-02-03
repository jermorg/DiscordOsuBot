# DiscordOsuBot
Discord bot that can view a profile in osu! and has the ability to create lobbyes 
## Usage
In ``config.json`` change the following values
```JSON
{
  "discordToken": "your-discord-bot-token",
  "login": "your-osu-username",
  "password": "{A}",
  "apiKey": "{B}",
  "commandPrefix": "prefix-in-osu-lobby (default is $)",
}
```
- In **`{A}`** field, you must enter your IRC password, which can be found here: https://osu.ppy.sh/home/account/edit#legacy-api.
(There you must create a new IRC password and enter it in `password`)

![IRC pass](https://github.com/jermorg/DiscordOsuBot/assets/111356637/8c62a6c8-758d-4372-84ff-9e9cda9e28c3)

- In **`{B}`** field, you need to create an `api` (shown in the picture) and enter the value of `api key`

![API key](https://github.com/jermorg/DiscordOsuBot/assets/111356637/d1636c11-f186-4202-a839-7e93ec7cc4d1)

### Start project
```node index.js``` in console
