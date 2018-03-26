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

  var isDiscord = url.startsWith('https://cdn.discordapp');

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
          if (meta.image && meta.image.type && meta.image.type != 'image/gif') {
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
            'type': 'LABEL_DETECTION'
          }
        ]
      }
    ]
  };

  client.post(googleURL, payload, function (err, res, body) {
    console.log(body.responses[0].labelAnnotations);
    if (body.responses && body.responses[0].labelAnnotations) { 
      body.responses[0].labelAnnotations.forEach(function (label) {
        if (label.description == 'car') {
          msg.reply('Hey I think there\'s a car in that picture');
        }
      });
    }
  });
}
