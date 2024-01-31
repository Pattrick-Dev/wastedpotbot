const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const search = require('yt-search');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { AudioPlayerStatus, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');

// Assuming these are imported or passed as arguments
const playNextInQueue = require('../utils/playNextInQueue');
const { playlistQueue, isPlaying, setPlaying, setPaused, addToQueue, getIsPaused  } = require('../utils/queueManager'); // Example of managing queue state
const searchYouTube = require('../utils/searchYoutube');

async function playCommand(interaction, audioPlayer, connection) {
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
            addToQueue({
              url: item.url,
              title: item.title,
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
          !getIsPaused()
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
    } else 
      if (searchQuery) {
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
          addToQueue({
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
            !getIsPaused()
          ) {
            playNextInQueue(audioPlayer, connection);
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
  
}
module.exports = playCommand;
