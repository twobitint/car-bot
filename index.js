#!/usr/bin/env node

require('dotenv').config();

const Discord = require("discord.js");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
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
    removeMsg(msg);
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.open('HEAD', url);
  xhttp.onreadystatechange = function () {
    if (this.readyState == this.DONE) {
      var type = this.getResponseHeader('Content-type');
      if (type == null) {
        removeMsg(msg);
      } else if (type.startsWith('text/html')) {
        og(url, function(err, meta){
          if ((meta.image && meta.image.type && meta.image.type == 'image/gif')
            || (meta.video) || (meta.type && meta.type == 'video.other')) {
            //
          } else {
            removeMsg(msg);
          }
        });
      } else if (!type.startsWith('image/gif') 
        && !type.startsWith('video/webm')
          && !type.startsWith('video/mp4')) {
        removeMsg(msg);
      }
    }
  };
  xhttp.onerror = function () {
    removeMsg(msg);
  };
  xhttp.send();
}

function removeMsg(msg) {
  msg.delete();
  msg.reply('Only gifs in here!');
}
