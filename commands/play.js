const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const searchYouTube = require('../utils/searchYoutube');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { AudioPlayerStatus, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const { playlistQueue, setPlaying, setPaused, addToQueue, isPlaying, getIsPaused } = require('../utils/queueManager');

// Assuming 'playNextInQueue' handles playback logic and doesn't need to be awaited or directly manipulated for state changes here.
const playNextInQueue = require('../utils/playNextInQueue');

async function playCommand(interaction, audioPlayer) {
    const url = interaction.options.getString("url");
    const searchQuery = interaction.options.getString("search");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply("You need to be in a voice channel to use this command.");
    }

    // Connect to voice channel if not already connected
    let connection;
    try {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        connection.subscribe(audioPlayer);
    } catch (error) {
        console.error(error);
        return interaction.reply("Failed to join the voice channel.");
    }

    // Handle direct URL or search query
    try {
        if (url) {
            await handleUrl(interaction, url);
        } else if (searchQuery) {
            await handleSearch(interaction, searchQuery);
        }

      if (!getIsPaused() && !isPlaying()) {
          playNextInQueue();
      }

    } catch (error) {
        console.error(error);
        interaction.reply("There was an error processing your request.");
    }
}

async function handleUrl(interaction, url) {
    if (ytpl.validateID(url)) {
        const playlist = await ytpl(url);
        playlist.items.forEach(item => addToQueue(item));
        interaction.reply(`Added playlist ${playlist.title} to the queue.`);
    } else if (ytdl.validateURL(url)) {
        const videoInfo = await ytdl.getInfo(url);
        addToQueue({ url, title: videoInfo.videoDetails.title });
        interaction.reply(`Added ${videoInfo.videoDetails.title} to the queue.`);
    } else {
        interaction.reply("Invalid YouTube URL or playlist ID.");
    }
}

async function handleSearch(interaction, searchQuery) {
    const searchResults = await searchYouTube(searchQuery);
    if (searchResults.length === 0) {
        return interaction.reply("No search results found.");
    }

    const searchEmbed = new EmbedBuilder()
        .setTitle("Top 5 search results:")
        .setColor(0x3498db)
        .addFields(searchResults.slice(0, 5).map((result, index) => ({
            name: `${index + 1}. ${result.title}`,
            value: `[Watch](${result.url})`,
        })));

    const buttons = searchResults.slice(0, 5).map((result, index) => new ButtonBuilder()
        .setCustomId(`select_video_${index}`)
        .setLabel(`Select ${index + 1}`)
        .setStyle(1));

    await interaction.reply({
        embeds: [searchEmbed],
        components: [new ActionRowBuilder().addComponents(buttons)],
        ephemeral: true,
    });
}

module.exports = playCommand;
