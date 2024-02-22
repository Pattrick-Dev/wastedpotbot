let playlistQueue = [];
let currentPlaying = null;
let isPlaying = false;
let isRepeatSong = false;
let paused = false;

const addToQueue = (song) => {
  playlistQueue.push(song);
};

const removeFromQueue = (index) => {
  if (index >= 0 && index < playlistQueue.length) {
    return playlistQueue.splice(index, 1);
  }
  return null;
};

const clearQueue = () => {
  playlistQueue = [];
};

const getQueue = () => {
  return playlistQueue;
};

const getCurrentPlaying = () => {
  return currentPlaying;
};

const setCurrentPlaying = (song) => {
  currentPlaying = song;
};

const getIsPlaying = () => {
  return isPlaying;
};

const setPlaying = (playing) => {
  isPlaying = playing;
};

const getIsRepeatSong = () => {
  return isRepeatSong;
};

const setIsRepeatSong = (repeat) => {
  isRepeatSong = repeat;
};

const getIsPaused = () => {
  return paused;
};

const setPaused = (pause) => {
  paused = pause;
};

module.exports = {
  addToQueue,
  removeFromQueue,
  clearQueue,
  getQueue,
  getCurrentPlaying,
  setCurrentPlaying,
  getIsPlaying,
  setPlaying,
  getIsRepeatSong,
  setIsRepeatSong,
  getIsPaused,
  setPaused,
};