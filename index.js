import { createServer } from 'node:http';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import Url from './models/Url.js';
import { InvalidUrlError, saveUrl } from './services/urlService.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function logError(context, error) {
  const message = error instanceof Error ? error.message : String(error);
  const withoutCredentials = message
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, '$1[REDACTED]@')
    .replaceAll(env.discordToken, '[REDACTED]');

  console.error(`${context}: ${withoutCredentials}`);
}

function formatSavedReply(record) {
  if (!env.publicBaseUrl) {
    return `Saved to MongoDB.\nShort ID: ${record.shortId}\nSet PUBLIC_BASE_URL to enable a clickable short URL.`;
  }

  return `Saved to MongoDB.\nShort URL: ${env.publicBaseUrl}/${record.shortId}`;
}

async function createShortLink({ url, discordUserId, commandSource }) {
  try {
    const record = await saveUrl({ url, discordUserId, commandSource });
    return formatSavedReply(record);
  } catch (error) {
    if (error instanceof InvalidUrlError) {
      return 'Please provide a valid HTTP or HTTPS URL.';
    }

    logError('Could not save URL', error);
    return 'Sorry, the URL could not be saved. Please try again later.';
  }
}

async function handleCreate({ respond, ...details }) {
  await respond(await createShortLink(details));
}

function startRedirectServer() {
  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    let shortId;
    try {
      shortId = new URL(request.url ?? '/', 'http://localhost').pathname.slice(1);
    } catch {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    if (!/^[a-f0-9]{12}$/.test(shortId)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    try {
      const record = await Url.findOne({ shortId }).select('url').lean();
      if (!record) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(302, {
        Location: record.url,
        'Cache-Control': 'no-store'
      });
      response.end();
    } catch (error) {
      logError('Could not resolve short URL', error);
      response.writeHead(500);
      response.end('Could not resolve short URL');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      server.on('error', (error) => logError('Redirect server error', error));
      console.log(`Redirect server listening on port ${env.port}`);
      resolve();
    });
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot connected as ${readyClient.user.tag}`);
});

client.on('error', (error) => {
  logError('Discord client error', error);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content.toLowerCase() === 'hii') {
    await message.reply({
      content: 'Hi! How can I help?',
      allowedMentions: { parse: [], repliedUser: false }
    }).catch((error) => logError('Could not reply to greeting', error));
    return;
  }

  const match = content.match(/^!create(?:\s+([\s\S]*))?$/i);
  if (match) {
    await handleCreate({
      url: match[1] ?? '',
      discordUserId: message.author.id,
      commandSource: 'message',
      respond: async (content) => {
        await message.reply({
          content,
          allowedMentions: { parse: [], repliedUser: false }
        });
      }
    }).catch((error) => logError('Could not reply to message command', error));
    return;
  }

  const urls = [...new Set(
    content.match(/https?:\/\/[^\s<>]+/gi)?.map((url) => url.replace(/[.,!?;:]+$/, ''))
      .filter(Boolean) ?? []
  )];
  if (!urls.length) return;

  const replies = await Promise.all(urls.map((url) => createShortLink({
    url,
    discordUserId: message.author.id,
    commandSource: 'message'
  })));

  await message.reply({
    content: replies.join('\n'),
    allowedMentions: { parse: [], repliedUser: false }
  }).catch((error) => logError('Could not reply with short URLs', error));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'ping') {
      await interaction.reply('Pong!');
      return;
    }

    if (interaction.commandName !== 'create') return;

    await interaction.deferReply();
    await handleCreate({
      url: interaction.options.getString('url', true),
      discordUserId: interaction.user.id,
      commandSource: 'slash',
      respond: async (content) => {
        await interaction.editReply(content);
      }
    });
  } catch (error) {
    logError('Could not handle slash command', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        'Sorry, the command could not be completed. Please try again later.'
      ).catch((replyError) => {
        logError('Could not send slash command error reply', replyError);
      });
    } else {
      await interaction.reply({
        content: 'Sorry, the command could not be completed. Please try again later.',
        ephemeral: true
      }).catch((replyError) => {
        logError('Could not acknowledge slash command', replyError);
      });
    }
  }
});

async function start() {
  await connectDatabase(env.mongodbUri);
  await startRedirectServer();
  await client.login(env.discordToken);
}

start().catch((error) => {
  logError('Startup failed', error);
  process.exitCode = 1;
});
