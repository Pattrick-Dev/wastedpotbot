const { AudioPlayerStatus } = require('@discordjs/voice');
const { getIsPaused, setPaused } = require('../utils/queueManager');
const updateBotNickname = require('../utils/updateBotNickname');

async function pauseCommand(interaction, audioPlayer) {
    if (!audioPlayer) {
        await interaction.reply({
            content: "Not currently playing audio.",
            ephemeral: true,
        });
        return;
    }

    // const isPaused = getIsPaused();

    if (audioPlayer.state.status === AudioPlayerStatus.Playing) {
        audioPlayer.pause();
        updateBotNickname(true, interaction)
        await interaction.reply({
            content: "Paused audio playback.",
            ephemeral: true,
        });
    } else if (audioPlayer.state.status === AudioPlayerStatus.Paused){
        audioPlayer.unpause();
        updateBotNickname(false, interaction)
        await interaction.reply({
            content: "Resumed audio playback.",
            ephemeral: true,
        });
    } 
}

module.exports = pauseCommand;
