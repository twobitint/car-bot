#!/usr/bin/env node

require('dotenv').config();
const Discord = require("discord.js");
const request = require('request');
const jsonRequest = require('request-json');
const og = require('open-graph');

const client = new Discord.Client();
const token = process.env.DISCORD_API_TOKEN;
const id = process.env.DISCORD_BOT_ID;

client.on('ready', () => {
  console.log(`I am ready!`);
});

client.on('message', msg => {
  if (msg.author.id != id) {
    if (msg.content == '') {
      msg.attachments.forEach(function (attachment) {
        checkUrl(attachment.url, msg);
      });
    } else {
      checkUrl(msg.content, msg);
    }
  }
});

client.login(token);

function checkUrl(url, msg) {
  if (!url.startsWith('http')) {
    return;
  }

  var isDiscord = url.startsWith('https://cdn.discordapp') || url.indexOf('blogspot.com') !== -1;

  request.get(url).on('response', function (resp) {
    resp.setEncoding('base64');
    //imageString = "data:" + resp.headers["content-type"] + ";base64,";
    imageString = '';
    resp.on('data', (data) => { imageString += data});
    resp.on('end', () => {
      var type = resp.headers['content-type'];
      var image = null;
      if (isDiscord) {
        image = {
          content: imageString
        };
      } else {
        image = {
          'source': { 'imageUri': url }
        };
      }
      if (type.startsWith('text/html')) {
        og(url, function(err, meta){
          console.log(meta);
          if (meta.image && meta.image.url) {
            image.source.imageUri = meta.image.url;
            checkIfCar(image, msg);
          }
        });
      } else if (type.startsWith('image') && type != 'image/gif') {
        checkIfCar(image, msg);
      }
    });
  }).on('error', (e) => {
      console.log(`Got error: ${e.message}`);
  });
}

function checkIfCar(image, msg) {
  var googleURL = 'https://vision.googleapis.com/v1/images:annotate?key=' + process.env.GOOGLE_VISION_API_KEY;
  var client = jsonRequest.createClient(googleURL);
  var payload = {
    'requests': [
      {
        'image': image,
        'features': [
          {
            'type': 'LABEL_DETECTION',
            'maxResults': 50
          }
        ]
      }
    ]
  };

  client.post(googleURL, payload, function (err, res, body) {
    console.log(payload.requests);
    console.log(body);
    console.log(body.responses[0].error);
    console.log(body.responses[0].labelAnnotations);

    var carLabels = [
      'car',
      'intersection',
      'vehicle',
      'road'
    ];

    if (body.responses && body.responses[0].labelAnnotations) {
      var stop = false;
      body.responses[0].labelAnnotations.forEach(function (l) {
        var label = l.description;
        if (!stop) {
          if (l.score >= 0.9 && (label == 'car' || label == 'motor vehicle')) {
            msg.reply('There\'s a car in that picture, my dude');
            stop = true;
          } else if (l.score < 0.8 && label == 'vehicle') {
            msg.reply('I think that\'s a car? Maybe?');
            stop = true;
          } else if (
            label == 'intersection' ||
            label == 'vehicle' ||
            label == 'road' ||
            label == 'downtown' ||
            label == 'street' ||
            label == 'car' ||
            label == 'motor vehicle'
          ) {
            msg.reply('Hey I think there\'s a car in that picture');
            stop = true;
          } else if (
            label == 'viking ships' ||
            label == 'longship'
          ) {
            sendLongshipMessage(msg);
            stop = true;
          }
        }
      });
    }
  });
}

function sendLongshipMessage(msg)
{
  var client = jsonRequest.createClient('https://api.imgur.com/3/');

  var payload = {
//    'q': 'Katheryn Winnick'
  };
  client.headers['Authorization'] = 'Client-ID ' + process.env.IMGUR_CLIENT_ID;
  client.get('gallery/search/viral/all?q=Katheryn+Winnick', payload, function (err, res, body) {
    var gallery = randomListItem(body.data);
    var image = gallery.is_album ? randomListItem(gallery.images) : gallery;

    msg.channel.send({ files: [image.link]})
       .then((resp) => { msg.reply('That is one sexy longboat you have there'); })
       .catch(console.error);
  });
}

function randomListItem(list)
{
  return list[Math.floor(Math.random()*list.length)];
}
