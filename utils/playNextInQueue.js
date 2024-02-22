const { createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
 // Adjust the path as needed

 // Adjust the path as needed

// Import the necessary functions from queueManager
const { getQueue, setPlaying, setCurrentPlaying, isPlaying } = require('../utils/queueManager');

function playNextInQueue(audioPlayer, connection) {
  const playlistQueue = getQueue(); // Retrieve the playlistQueue using getQueue

  if (playlistQueue.length === 0) {
    console.log("Queue is empty, stopping playback.");
    setPlaying(false);
    setCurrentPlaying(null);
    return;
  }

  setPlaying(true);
  const video = playlistQueue.shift(); // Remove the first element from the queue
  setCurrentPlaying(video);

  console.log(`Playing: ${video.title}`);

  const stream = ytdl(video.url, { filter: 'audioonly' });
  const resource = createAudioResource(stream);

  try {
    const { audioPlayer } = require('../utils/audioPlayer');
    audioPlayer.play(resource);
    if (connection) {
      connection.subscribe(audioPlayer);
    } else {
      console.error('No voice connection to subscribe to.');
      setPlaying(false);
    }
  } catch (error) {
    console.error('Error playing audio:', error);
    setPlaying(false);
  }
}

module.exports = playNextInQueue;