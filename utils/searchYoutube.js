const search = require('yt-search');

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

module.exports = searchYouTube;