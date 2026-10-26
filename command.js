import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { env } from './config/env.js';

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Submit a URL to shorten')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The full http or https URL')
        .setRequired(true)
    )
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(env.discordToken);

try {
  console.log('Registering slash commands...');

  const registeredCommands = await rest.put(
    Routes.applicationCommands(env.discordClientId),
    { body: commands }
  );

  console.log(
    `Successfully registered ${registeredCommands.length} command(s).`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    'Command registration failed:',
    message.replaceAll(env.discordToken, '[REDACTED]')
  );
  process.exitCode = 1;
}