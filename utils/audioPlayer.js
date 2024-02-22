const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');

// Create the audio player
const audioPlayer = createAudioPlayer();

/**
 * Plays an audio resource and returns a promise.
 * @param {AudioResource} resource - The audio resource to play.
 * @returns {Promise<void>} A promise that resolves when playback is complete.
 */
function playAudioResource(resource) {
  return new Promise((resolve, reject) => {
    // Subscribe to the 'idle' event to resolve the promise when playback finishes
    const onIdle = () => {
      audioPlayer.removeListener('error', onError); // Clean up the error listener
      resolve();
    };

    // Subscribe to the 'error' event to reject the promise on error
    const onError = (error) => {
      audioPlayer.removeListener(AudioPlayerStatus.Idle, onIdle); // Clean up the idle listener
      reject(error);
    };

    audioPlayer.once(AudioPlayerStatus.Idle, onIdle);
    audioPlayer.once('error', onError);

    // Start playing the audio resource
    audioPlayer.play(resource);
  });
}

module.exports = { audioPlayer, playAudioResource };