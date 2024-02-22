const { getQueue, getCurrentPlaying } = require('../utils/queueManager');

async function queueCommand(interaction) {
    let response = "";
    const currentPlaying = getCurrentPlaying();
    const playlistQueue = getQueue();

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
}

module.exports = queueCommand;