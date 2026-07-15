# Skull SMP Discord Bot

A complete, production-ready Discord.js v14 bot for the Skull SMP Minecraft server. Automatically sets up a professional Minecraft-themed Discord server and includes full moderation, ticketing, leveling, and utility systems.

## Run & Operate

- **Start bot:** Use the "Skull SMP Discord Bot" workflow in Replit
- **Deploy slash commands:** `cd artifacts/discord-bot && node src/deploy-commands.js`
- **Fast guild deploy (dev):** Set `GUILD_ID` secret → commands register instantly instead of ~1 hour

## Required Secrets

| Secret | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → Bot → Token |
| `CLIENT_ID` | Discord Developer Portal → Your App → General Information → Application ID |
| `GUILD_ID` | *(optional)* Your server ID — right-click server icon → Copy Server ID |

## Stack

- **Discord.js v14** — slash commands, embeds, buttons, select menus
- **Node.js ESM** — `"type": "module"` throughout
- **JSON file store** — `artifacts/discord-bot/data/*.json` for warns, levels, mutes, giveaways, tickets

## Where Things Live

```
artifacts/discord-bot/
├── src/
│   ├── index.js               — Entry point, client setup
│   ├── deploy-commands.js     — Register slash commands with Discord
│   ├── config/config.js       — ALL configuration (roles, channels, colors, limits)
│   ├── handlers/              — Dynamic command + event loaders
│   ├── utils/
│   │   ├── serverSetup.js     — /setupserver core logic
│   │   ├── database.js        — JSON file-based storage
│   │   ├── embeds.js          — Reusable embed builders
│   │   └── permissions.js     — Role checks and permission helpers
│   ├── commands/
│   │   ├── admin/             — setupserver, announce, slowmode, lock, unlock, purge, backup
│   │   ├── moderation/        — warn, warnings, clearwarn, mute, unmute, kick, ban, unban, tempban
│   │   └── utility/           — giveaway, poll, suggest
│   └── events/                — ready, guildMemberAdd/Remove, messageCreate/Delete/Update, interactionCreate, guildMemberUpdate
└── data/                      — Auto-created JSON files (warns, levels, mutes, etc.)
```

## Slash Commands

### Admin
| Command | Description |
|---|---|
| `/setupserver` | Sets up the entire server (roles, categories, channels, embeds) — owner only |
| `/announce` | Post a formatted announcement embed |
| `/slowmode` | Set channel slowmode |
| `/lock` / `/unlock` | Lock or unlock a channel |
| `/purge` | Bulk delete messages |
| `/backup` | Export server structure to JSON |

### Moderation
| Command | Description |
|---|---|
| `/warn` | Warn a member (DMs them, logs to mod-logs) |
| `/warnings` | View a member's warnings |
| `/clearwarn` | Clear all or one warning |
| `/mute` | Timeout a member (10m, 1h, 7d, etc.) |
| `/unmute` | Remove a timeout |
| `/kick` | Kick a member |
| `/ban` | Permanently ban a member |
| `/unban` | Unban by user ID |
| `/tempban` | Temporary ban (auto-unbans) |

### Utility
| Command | Description |
|---|---|
| `/giveaway start/end/reroll` | Full giveaway management |
| `/poll` | Create a multi-option poll with reactions |
| `/suggest` | Submit a suggestion with ✅/❌ voting |

## Auto Features

- **Verification** — Button in #verify grants the Verified role
- **Ticket system** — Select menu in #create-ticket opens private ticket channels
- **Welcome/leave messages** — Auto-posted in #welcome and leave-logs
- **Anti-spam** — Auto-mutes spammers for 5 min
- **Anti-link** — Deletes non-whitelisted links from non-staff
- **Leveling** — XP per message with level-up announcements
- **Message logging** — Edits and deletes logged to #message-logs
- **Nickname logging** — Changes logged to #mod-logs
- **Temp ban checker** — Checks every 60s and auto-unbans expired bans

## Configuration

Edit `src/config/config.js` to customize:
- Server IP and links
- Role names and colors
- Category and channel names
- Anti-spam thresholds
- Leveling XP formula
- Ticket types
- Anti-link allowed domains

## User preferences

- Bot is built for Skull SMP Minecraft server
- Minecraft-themed embeds with gold/green color scheme
- All slash commands with ephemeral error replies
