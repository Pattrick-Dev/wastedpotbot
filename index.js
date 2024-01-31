const {
  Client,
  GatewayIntentBits,
} = require("discord.js");

const token = process.env["TOKEN"];

// Command Imports //
const playCommand = require("./commands/play");
const joinCommand = require('./commands/join');
const queueCommand = require('./commands/queue');
const pauseCommand = require('./commands/pause');


// Event Imports //
const playNextInQueue = require("./utils/playNextInQueue");
//
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
// const googleTTS = require("google-tts-api");


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
module.exports = client;
let connection;
let playlistQueue = [];
const audioPlayer = require('./utils/audioPlayer');

audioPlayer.on("stateChange", (oldState, newState) => {
  console.log(
    `Audio player state changed from ${oldState.status} to ${newState.status}`,
  );

  if (newState.status === AudioPlayerStatus.Idle) {
    // Play the next song in the queue when the current song finishes
    playNextInQueue(audioPlayer, connection);
  }
});

let currentPlaying = null;

const commands = [
  {
    name: "pog",
    description: "pog",
  },
  {
    name: "timer",
    description: "Set timer",
    options: [
      {
        name: "minutes",
        description: "in minutes",
        type: 4, // Type 4 corresponds to INTEGER
        required: true,
      },
    ],
  },
  {
    name: "skip",
    description:
      "Skip the currently playing song or a specified number of songs",
    options: [
      {
        name: "count",
        description: "Number of songs to skip (default is 1)",
        type: 4, // Type 4 corresponds to INTEGER
        required: true,
      },
    ],
  },
  {
    name: "repeat",
    description: "Toggle repeat mode for the queue",
    options: [
      {
        name: "song",
        description: "Set to true to repeat song instead of playlist",
        type: 5,
        required: false,
      },
    ],
  },
  {
    name: "pause",
    description: "Pause or resume the current audio playback",
  },
  {
    name: "resume",
    description: "Pause or resume the current audio playback",
  },
  {
    name: "queue",
    description: "Display the current music queue",
  },
  {
    name: "join",
    description: "Join a voice channel",
  },
  {
    name: "remove",
    description: "Remove a song from the queue",
    options: [
      {
        name: "index",
        description: "The index of the song to remove",
        type: 4, // Type 4 corresponds to INTEGER
        required: true,
      },
    ],
  },
  {
    name: "shuffle",
    description: "Shuffle the queue.",
  },
  {
    name: "play",
    description: "Play a YouTube video",
    options: [
      {
        name: "url",
        description: "The URL of the YouTube video or playlist",
        type: 3, // Type 3 corresponds to STRING
        required: false,
      },
      {
        name: "search",
        description:
          "Search for a YouTube video and choose from the top 10 results",
        type: 3, // Type 3 corresponds to STRING
        required: false,
      },
    ],
  },
  {
    name: "help",
    description: "List all available commands and their descriptions",
  },
];

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setUsername("wastedpotbot");
  // Set up slash commands for the bot
  client.guilds.cache
    .first()
    .commands.set(commands)
    .then(() => console.log("Slash commands registered"))
    .catch(console.error);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  try {
    if (commandName === "join") {
      connection = await joinCommand(interaction, connection);
    } else if (commandName === "play") {
      await playCommand(interaction, audioPlayer, connection);
    } else 
      if (interaction.commandName === "queue") {
      await queueCommand(interaction);
    } else 
        if (
      interaction.commandName === "pause" ||
      interaction.commandName === "resume"
    ) {
          await pauseCommand(interaction, audioPlayer);
    } else if (interaction.commandName === "repeat") {
      await interaction.reply({
        content: `That's a premium feature! aka its fucking broken`,
        ephemeral: true,
      });
    } else if (commandName === "help") {
      // Provide a list of available commands and their descriptions
      const commandList = commands
        .map((cmd) => `**/${cmd.name}**: ${cmd.description}`)
        .join("\n");
      const embed = {
        title: "Available Commands",
        description: commandList,
        color: 0x3498db, // blue
      };
      interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (interaction.commandName === "skip") {
      if (!connection || !audioPlayer) {
        await interaction.reply({
          content: "Not currently playing audio.",
          ephemeral: true,
        });
        return;
      }

      const count = interaction.options.getInteger("count") || 1; // Default to skipping 1 song if count is not specified
      if (count < 1) {
        await interaction.reply({
          content: "Invalid skip count. Please specify a positive integer.",
          ephemeral: true,
        });
        return;
      }

      // Skip the specified number of songs
      for (let i = 0; i < count; i++) {
        if (playlistQueue.length === 0 && !audioPlayer.state.resource) {
          // If there are no more songs in the queue and the audio player is idle, there's nothing to skip
          break;
        }
        // Stop the current audio player to skip to the next song
        audioPlayer.stop();
      }

      await interaction.reply({
        content: `Skipped ${count} ${count === 1 ? "song" : "songs"}.`,
        ephemeral: true,
      });
    } else if (interaction.commandName === "remove") {
      const indexToRemove = interaction.options.getInteger("index");

      if (
        !Number.isInteger(indexToRemove) ||
        indexToRemove <= 0 ||
        indexToRemove > playlistQueue.length
      ) {
        interaction.reply({
          content:
            "Invalid song index. Please specify a valid index to remove.",
          ephemeral: true,
        });
        return;
      }

      const removedSong = playlistQueue.splice(indexToRemove - 1, 1);

      interaction.reply({
        content: `Removed song at index ${indexToRemove}: ${removedSong[0].title}`,
        ephemeral: true,
      });
    } else if (interaction.commandName === "shuffle") {
      if (playlistQueue.length < 2) {
        interaction.reply({
          content: "Queue must have at least two songs to shuffle.",
          ephemeral: true,
        });
        return;
      }

      // Shuffle the playlistQueue
      for (let i = playlistQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlistQueue[i], playlistQueue[j]] = [
          playlistQueue[j],
          playlistQueue[i],
        ];
      }

      interaction.reply({
        content: "Queue has been shuffled.",
        ephemeral: true,
      });
    } else if (commandName === "timer") {
      // Handle the /timer command
      const minutes = interaction.options.getInteger("minutes");

      if (!minutes || minutes < 1) {
        await interaction.reply({
          content: "Please provide a valid number of minutes greater than 0.",
          ephemeral: true,
        });
        return;
      }

      // Calculate the target time in seconds
      const currentTime = Math.floor(Date.now() / 1000);
      const targetTime = currentTime + minutes * 60;

      // Create a message with a dynamic timestamp
      const timestampCode = `<t:${targetTime}:R>`;
      await interaction.reply({
        content: `Timer set for ${minutes} minute(s): ${timestampCode}`,
        ephemeral: false,
      });
    } else if (commandName === "pog") {
      interaction.reply({
        content: "https://i.gyazo.com/161fbc1c0b0da5355ed06a5250477bd6.gif",
        ephemeral: false,
      });
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "There was an error processing your request.",
        ephemeral: true,
      });
    }
  }
});

function updateBotNickname(isPaused) {
  // Update the bot's nickname to indicate whether it's paused or not
  client.guilds.cache.first().id;
  const botUserId = "889320148643749899";
  const pauseEmoji = "\u23F8";
  const newNickname = isPaused ? `${pauseEmoji} wastedpotbot` : "wastedpotbot";

  // Find the guild
  const guild = client.guilds.cache.first();

  if (!guild) {
    console.error("Guild not found.");
    return;
  }

  // Find the bot's member within the guild using its user ID
  const botMember = guild.members.cache.get(botUserId);

  if (!botMember) {
    console.error("Bot member not found in the guild.");
    return;
  }

  // Change the bot's nickname
  botMember
    .setNickname(newNickname)
    .then((updatedMember) => {
      console.log(`Bot's nickname updated to ${updatedMember.displayName}`);
    })
    .catch((error) => {
      console.error("Error changing nickname:", error);
    });
}

client.login(token);
