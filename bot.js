const Twitter = require('twitter');
const axios = require('axios');
const fs = require('fs');
const request = require('request');

const config = {
  consumer_key: process.env.ART_BOT_CONSUMER_KEY,
  consumer_secret: process.env.ART_BOT_CONSUMER_SECRET,
  access_token_key: process.env.ART_BOT_ACCESS_TOKEN,
  access_token_secret: process.env.ART_BOT_ACCESS_TOKEN_SECRET
};

const ClevelandArtBot = new Twitter(config);
let caption;

const getArchivesCount = () => {
  return axios.get('https://openaccess-api.clevelandart.org/api/artworks/', {
    params: {
      has_image: 1,
    }
  });
}

const getArchiveObject = (offset) => {
  return axios.get('https://openaccess-api.clevelandart.org/api/artworks/', {
    params: {
      has_image: 1,
      skip: offset,
    }
  });
};

const getAndTweetArchiveImage = async () => {
  getArchivesCount().then((response) => {
    return response.data.info.total;
  }).then((collectionTotal) => {
    getArchiveObject(Math.floor(Math.random() * (collectionTotal / 1.2))).then((response) => {
      const item = response.data.data[Math.floor(Math.random() * 1000)];
      const accessNumber = item.accession_number;
      const title = item.title;
      const artist = item.creators ? item.creators[0].description : '';
      const creationDate = item.creation_date;
      const technique = item.technique;
      const image = item.images.web.url;
      caption = `${title} - ${artist}; ${technique}, ${creationDate} | ${accessNumber}`;
      return new Promise((resolve, reject) => {
        download(image, 'image.png', () => resolve(caption));
      })
    }).then(() => {
      const data = fs.readFileSync(`${__dirname}/image.png`);
      return ClevelandArtBot.post('media/upload', { media: data });
    }).then(media => {
      console.log('media uploaded');
      const status = {
        status: caption.substring(0, 280), // Max character for a Tweet is 280
        media_ids: media.media_id_string // Need to upload to get the unique media_id
      }
      return ClevelandArtBot.post('statuses/update', status)
    }).then(tweet => {
      console.log(tweet);
    }).catch((error) => {
      console.log(error);
    });
  });
};

const download = (uri, filename, callback) => {
  request.head(uri, (err, res, body) => {
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

getAndTweetArchiveImage();
