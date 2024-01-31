const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");

const token = process.env['TOKEN']

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
// const googleTTS = require("google-tts-api");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const search = require("yt-search");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let connection;
let playlistQueue = [];
let isPlaying = false;
audioPlayer = createAudioPlayer();

audioPlayer.on('stateChange', (oldState, newState) => {
  console.log(`Audio player state changed from ${oldState.status} to ${newState.status}`);
});

audioPlayer.on('error', error => {
  console.error('Error:', error.message);
});

let currentPlaying = null;
let isRepeatSong = false;
const timers = new Map();
let paused = false;

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
    .get("398293933416906782")
    .commands.set(commands)
    .then(() => console.log("Slash commands registered"))
    .catch(console.error);

});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  try {
    if (commandName === "join") {
      const guild = interaction.guild;
      const member = guild.members.cache.get(user.id);

      if (!member.voice.channel) {
        await interaction.reply({
          content: "You must be in a voice channel to use this command.",
          ephemeral: true,
        });
        return;
      }

      const channel = member.voice.channel;

      if (!connection) {
        connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        });
      }

      await interaction.reply({
        content: `Joined channel ${channel.name}`,
        ephemeral: true,
      });
    } 
    else if (commandName === "play") {
      const url = interaction.options.getString("url");
      const member = interaction.member;
      const searchQuery = interaction.options.getString("search");
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        await interaction.reply("You need to be in a voice channel to use this command.");
        return;
      }

      try {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        connection.subscribe(audioPlayer); // Subscribe the audio player immediately
      } catch (error) {
        console.error(error);
        await interaction.reply("Failed to join the voice channel.");
      }
      if (!url && !searchQuery) {
        interaction.reply({
          content: "Please provide a valid YouTube URL or a search query.",
          ephemeral: true,
        });
        return;
      }

      if (url) {
        try {
          if (ytpl.validateID(url)) {
            // Handle YouTube playlist
            const playlist = await ytpl(url);
            playlist.items.forEach((item) => {
              playlistQueue.push({
                url: item.url,
                title: item.title + " (" + item.length + ")",
              });
            });
            interaction.reply({
              content: `Added playlist ${playlist.title} to the queue.`,
              ephemeral: true,
            });
          } else if (ytdl.validateURL(url)) {
            // Handle single YouTube video
            const videoInfo = await ytdl.getInfo(url);
            playlistQueue.push({ url, title: videoInfo.videoDetails.title });
            interaction.reply({
              content: `Added ${videoInfo.videoDetails.title} to the queue.`,
              ephemeral: true,
            });
          } else {
            interaction.reply({
              content: "Invalid YouTube URL or playlist ID.",
              ephemeral: true,
            });
            return;
          }

          // Check if audio is currently playing; if not, start playback
          if (
            !isPlaying &&
            audioPlayer.state.status !== AudioPlayerStatus.Playing &&
            !paused
          ) {
            playNextInQueue();
          }
        } catch (error) {
          console.error(error);
          interaction.reply({
            content: "There was an error processing your request.",
            ephemeral: true,
          });
        }
      } else if (searchQuery) {
        // Handle YouTube search ------------------------------------
        const searchResults = await searchYouTube(searchQuery);

        if (searchResults.length === 0) {
          interaction.reply({
            content: "No search results found.",
            ephemeral: true,
          });
          return;
        }

        // Create an embed with clickable URLs and buttons for the top 5 search results
        const searchEmbed = new EmbedBuilder()
          .setTitle("Top 5 search results:")
          .setColor(0x3498db); 

        const fields = searchResults.slice(0, 5).map((result, index) => ({
          name: `${index + 1}. ${result.title}`,
          value: `[Watch](${result.url})`,
        }));

          searchEmbed.addFields(fields);

        // Create clickable buttons for the same search results
        const buttonComponents = searchResults
          .slice(0, 5)
          .map((result, index) => {
            return new ButtonBuilder()
              .setCustomId(`select_video_${index}`)
              .setLabel(`Select ${index + 1}`)
              .setStyle(1);
          });

        const actionRow = new ActionRowBuilder().addComponents(
          buttonComponents,
        );
        // Send a message with the embed and buttons
        const searchMessage = await interaction.reply({
          embeds: [searchEmbed], 
          components: [actionRow],
          ephemeral: true,
        });

        // Handle button interactions for selecting videos
        const filter = (i) => i.customId.startsWith("select_video_");
        const collector = searchMessage.createMessageComponentCollector({
          filter,
          time: 15000, 
        });

        collector.on("collect", async (i) => {
          const index = parseInt(i.customId.split("_")[2]);
          if (!isNaN(index) && index >= 0 && index < searchResults.length) {
            const selectedVideo = searchResults[index];
            playlistQueue.push({
              url: selectedVideo.url,
              title: selectedVideo.title,
            });

            // Disable all buttons
            const disabledButtons = buttonComponents.map(button => 
              new ButtonBuilder(button.data).setDisabled(true)
            );
            const actionRow = new ActionRowBuilder().addComponents(disabledButtons);

            // Update the original message to disable the buttons
            await i.update({
              content: `Selected: ${selectedVideo.title}`,
              components: [actionRow],
              embeds: [] // Clear any embeds if you don't want them to persist
            });

            // Reply to inform the user that the song has been added to the queue
            await i.followUp({
              content: `Added ${selectedVideo.title} to the queue.`,
              ephemeral: true,
            });

            // Check if audio is currently playing; if not, start playback
            if (
              !isPlaying &&
              audioPlayer.state.status !== AudioPlayerStatus.Playing &&
              !paused
            ) {
              playNextInQueue();
            }
          }
        });


        collector.on("end", (collected) => {
          if (collected.size === 0) {
            interaction.followUp({
              content: "You didn't select a video within the time limit.",
              ephemeral: true,
            });
          }
        });
      }
    } else if (interaction.commandName === "queue") {
      let response = "";

      // Check if there is a song currently playing and include it in the response
      if (currentPlaying) {
        response += `Playing: **${currentPlaying.title}**\n`;
      }

      // Add the queued songs to the response
      if (playlistQueue.length === 0) {
        response += "The queue is currently empty.";
      } else {
        const queueMessage = playlistQueue
          .map((item, index) => `**${index + 1}. ${item.title}**`)
          .join("\n");
        response += `Queue:\n${queueMessage}`;
      }

      await interaction.reply({ content: response, ephemeral: true });
    } else if (
      interaction.commandName === "pause" ||
      interaction.commandName === "resume"
    ) {
      if (!connection || !audioPlayer) {
        await interaction.reply({
          content: "Not currently playing audio.",
          ephemeral: true,
        });
        return;
      }

      if (audioPlayer.state.status === AudioPlayerStatus.Playing) {
        audioPlayer.pause();
        updateBotNickname(true);
        paused = true;
        await interaction.reply({
          content: "Paused audio playback.",
          ephemeral: true,
        });
      } else if (audioPlayer.state.status === AudioPlayerStatus.Paused) {
        audioPlayer.unpause();
        updateBotNickname(false);
        paused = false;
        await interaction.reply({
          content: "Resumed audio playback.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "No audio is currently playing.",
          ephemeral: true,
        });
      }
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
    } 
    else if (interaction.commandName === "shuffle") {
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
  const guildId = "398293933416906782";
  const botUserId = "889320148643749899";
  const pauseEmoji = "\u23F8";
  const newNickname = isPaused ? `${pauseEmoji} wastedpotbot` : "wastedpotbot";

  // Find the guild
  const guild = client.guilds.cache.get(guildId);

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

function playNextInQueue() {
  if (playlistQueue.length === 0) {
    console.log("Queue is empty, stopping playback.");
    isPlaying = false;
    currentPlaying = null;
    return;
  }

  isPlaying = true;
  const video = playlistQueue.shift();
  currentPlaying = video;

  console.log(`Playing: ${video.title}`);

  const stream = ytdl(video.url, { filter: "audioonly" });
  const resource = createAudioResource(stream);

  try {
    audioPlayer.play(resource);
    if (connection) {
      connection.subscribe(audioPlayer);
    } else {
      console.error('No voice connection to subscribe to.');
    }
  } catch (error) {
    console.error('Error playing audio:', error);
    isPlaying = false;
  }
}

async function searchYouTube(query) {
  return new Promise((resolve, reject) => {
    search(query, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          res.videos.slice(0, 10).map((video) => ({
            title: video.title,
            url: video.url,
          })),
        );
      }
    });
  });
}

client.login(
  token,
);