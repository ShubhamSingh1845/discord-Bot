# Discord URL Bot

A Node.js Discord bot that saves HTTP and HTTPS URLs in MongoDB, generates unique 12-character short IDs, and optionally returns clickable short links through a built-in redirect server.

Repository: [ShubhamSingh1845/discord-Bot](https://github.com/ShubhamSingh1845/discord-Bot)

## Features

- Save URLs using the **!create** message command or **/create** slash command.
- Automatically detect URLs pasted into normal Discord messages.
- Store each URL, its short ID, the Discord user ID, command source, and timestamps in MongoDB.
- Generate IDs with Node.js crypto and enforce uniqueness through a MongoDB index.
- Return a short ID, or a full short URL when PUBLIC_BASE_URL is configured.
- Redirect short URLs to their saved destination using the built-in HTTP server.
- Respond to **/ping** with **Pong!** and **hii** with **Hi! How can I help?**.
- Ignore messages sent by bots.
- Acknowledge slash commands before database work, then update the response.

## Technology

| Component | Purpose |
| --- | --- |
| Node.js and JavaScript ES modules | Application runtime |
| discord.js v14 | Discord client, events, and slash commands |
| Mongoose v8 | MongoDB connection and document model |
| dotenv v16 | Environment configuration |
| Node.js crypto | Random short ID generation |
| Node.js HTTP server | URL redirection |

## Project structure

~~~text
discord-Bot/
├── .env                  # Local credentials; excluded from Git
├── .env.example          # Placeholder configuration
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── index.js              # Discord handlers and HTTP redirect server
├── command.js            # Registers /ping and /create
├── config/
│   ├── env.js            # Loads and validates environment settings
│   └── database.js       # Connects to MongoDB and initializes the model
├── models/
│   └── Url.js            # URL schema and unique shortId index
└── services/
    └── urlService.js     # URL validation, ID generation, and persistence
~~~

The database runs in MongoDB. The source files define its connection and schema.

## Requirements

- Node.js 22 or newer and npm.
- A Discord application with a bot token.
- A running MongoDB server or a MongoDB Atlas cluster.
- A public URL routed to the redirect server if other people should be able to open the short links.

The project has been set up using Node.js 24.13.1.

## Installation

### 1. Clone the repository

~~~powershell
git clone https://github.com/ShubhamSingh1845/discord-Bot.git
cd discord-Bot
npm install
~~~

If you already have this project on your computer, open a terminal in its folder and run npm install.

### 2. Configure the Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application.
3. On the **Bot** page, obtain the bot token and enable **Message Content Intent**.
4. Copy the **Application ID** from the application's general information.
5. Invite the bot to your server using the **bot** and **applications.commands** scopes.
6. Give the bot permission to view channels, send messages, and read message history in the channels where you will use it.

Message Content Intent is needed for message commands and automatic URL detection.

### 3. Set up MongoDB

Choose one of these options.

**Local MongoDB**

Start MongoDB Community Server on your computer and use:

~~~dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/discord_bot
~~~

The mongoose npm package is the database client library. MongoDB Community Server must also be installed and running for a local connection.

**MongoDB Atlas**

1. Create a project and a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. A Free/M0 cluster can be used for learning and development.
3. Create a database user with read/write access to the discord_bot database.
4. Add your current public IP address to the project's IP access list.
5. In the cluster's **Connect** dialog, select **Drivers** and copy the Node.js connection string.
6. Replace the username and password placeholders with your database user's credentials.
7. Set MONGODB_URI to that connection string.

Percent-encode reserved characters such as @, /, and # in a username or password before inserting them into a connection string. Atlas database credentials are separate from your Atlas account login.

The application selects **discord_bot** as the database name and **urls** as the collection. The collection and unique shortId index are initialized during startup.

Official guides: [Create a Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/) and [Connect to Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

### 4. Configure the environment

Create a local .env file from .env.example. In PowerShell, this command preserves an existing .env:

~~~powershell
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
~~~

Open .env and configure:

~~~dotenv
DISCORD_TOKEN=YOUR_BOT_TOKEN
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID
MONGODB_URI=mongodb://127.0.0.1:27017/discord_bot

PUBLIC_BASE_URL=
PORT=3000
~~~

Replace the YOUR_ placeholders. Use your Atlas connection string instead of the local URI when using Atlas.

| Variable | Required | Description |
| --- | --- | --- |
| DISCORD_TOKEN | Yes | Your Discord bot token |
| DISCORD_CLIENT_ID | Yes | Your application's ID, stored as text |
| MONGODB_URI | Yes | The MongoDB connection string |
| PUBLIC_BASE_URL | No | The externally reachable base URL for short links; leave empty for short ID replies |
| PORT | No | HTTP server port; defaults to 3000 and must be between 1 and 65535 |

The settings loader reads .env from the project folder. Configure all three required settings before running either the bot or command registration.

Save .env and restart the bot after changing settings.

### 5. Register the slash commands

~~~powershell
npm run register
~~~

Expected output:

~~~text
Registering slash commands...
Successfully registered 2 command(s).
~~~

This updates the application's global slash command list to **/ping** and **/create**. Register again when the command definitions change.

### 6. Start the bot

~~~powershell
npm start
~~~

Expected output:

~~~text
Connected to MongoDB (database: discord_bot, collection: urls).
Redirect server listening on port 3000
Bot connected as YourBot#0000
~~~

Your own bot name will appear in the final line.

Keep this process running while using the bot or opening its redirect links.

For development, use Node.js watch mode:

~~~powershell
npm run dev
~~~

## Commands and examples

| Input | Result |
| --- | --- |
| !create https://example.com | Saves the URL and replies with its ID or short URL |
| /create with the url field filled in | Saves the URL using a slash command |
| A message containing https://example.com | Automatically detects and saves the URL |
| /ping | Replies Pong! |
| hii | Replies Hi! How can I help? |

Other messages without URLs are ignored.

### Message command

~~~text
!create https://chatgpt.com/
~~~

### Slash command

Select **/create** in Discord's command picker, then set its **url** field to:

~~~text
https://chatgpt.com/
~~~

### Automatic detection

You can also paste a URL into a normal message. Multiple distinct URLs are processed separately. Repeated copies of the same extracted URL within one message are processed once.

Submitting a URL again in a later message or command creates another stored record and a new short ID.

### Reply with no public base URL configured

~~~text
Saved to MongoDB.
Short ID: a1b2c3d4e5f6
Set PUBLIC_BASE_URL to enable a clickable short URL.
~~~

### Reply with a public base URL configured

For example, with PUBLIC_BASE_URL set to a publicly reachable domain pointing to this application:

~~~text
Saved to MongoDB.
Short URL: https://your-domain.example/a1b2c3d4e5f6
~~~

The IDs and domain in these examples are illustrative.

## Short URL redirection

The HTTP server starts on PORT, which defaults to 3000.

For testing in a browser on the same computer, configure:

~~~dotenv
PUBLIC_BASE_URL=http://localhost:3000
PORT=3000
~~~

After restarting the bot and creating a new record, open the returned localhost link in a browser on that computer.

For links other users can open, PUBLIC_BASE_URL must be a publicly reachable address that routes to the running HTTP server. A localhost address refers to the computer of the person opening it.

Use the base address without an additional path or a short ID. An HTTPS public address requires your hosting service or reverse proxy to forward requests to this application's HTTP port.

| Request | Result |
| --- | --- |
| `GET /<shortId>` | 302 redirect to the stored URL |
| `HEAD /<shortId>` | Redirect response headers without a response body |
| Invalid or unknown short ID | 404 |
| Unsupported HTTP method | 405 |
| Database lookup failure | 500 |

The bot's HTTP server and MongoDB connection must remain available for links to resolve.

## MongoDB records

Database: **discord_bot**  
Collection: **urls**

Example document:

~~~json
{
  "url": "https://chatgpt.com/",
  "shortId": "a1b2c3d4e5f6",
  "discordUserId": "123456789012345678",
  "commandSource": "message",
  "createdAt": "2026-10-26T10:00:00.000Z",
  "updatedAt": "2026-10-26T10:00:00.000Z"
}
~~~

MongoDB also assigns an _id field. The commandSource value is message or slash.

To view records, open **discord_bot → urls** in Atlas Data Explorer or MongoDB Compass. You can search using:

~~~json
{
  "shortId": "a1b2c3d4e5f6"
}
~~~

Each ID contains 12 lowercase hexadecimal characters generated from six random bytes. A unique MongoDB index prevents duplicate short IDs. The service makes up to five insertion attempts if an ID collision occurs.

Successful records remain in MongoDB after the bot restarts. A success reply is sent only after the save completes.

## npm scripts

| Command | Purpose |
| --- | --- |
| npm install | Install the project's dependencies |
| npm start | Run the bot and HTTP redirect server |
| npm run dev | Run with Node.js watch mode |
| npm run register | Register or update the global slash commands |

## Troubleshooting

| Problem | Check |
| --- | --- |
| Missing or placeholder environment setting | Save real values for all three required settings in .env |
| Invalid Discord token | Use the token from the application's Bot page and restart the process |
| MongoDB connection refused | Start your local MongoDB server and check the URI |
| Atlas connection or authentication failure | Check the database user, password encoding, connection string, and current IP access list |
| Message commands or pasted URLs get no response | Enable Message Content Intent, check channel permissions, and keep the bot running |
| Slash command does not respond | Keep the bot running and run npm run register after changing command definitions |
| Port is already in use | Stop the previous instance or choose another PORT; update the local PUBLIC_BASE_URL port too |
| Short link works only on your computer | Configure a public base URL that routes to the redirect server |
| Short link returns 404 | Check the exact short ID and the urls collection in the connected database |
| URLs cannot be saved | Check the application's error output and MongoDB availability |

## Credentials and GitHub

The local .env file contains your credentials and is excluded by .gitignore. The .env.example file should contain placeholders only.

Keep bot tokens and MongoDB passwords in your local configuration. Commit source code, documentation, package files, and the placeholder example file.

## Documentation

- [Discord.js documentation](https://discord.js.org/docs)
- [Discord slash command responses](https://discordjs.guide/legacy/slash-commands/response-methods)
- [Mongoose connections](https://mongoosejs.com/docs/connections.html)
- [MongoDB Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
