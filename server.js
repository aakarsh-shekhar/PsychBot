// server.js
// where your node app starts

// init project
var express = require('express');
var spark = require('ciscospark/env');
var request = require('request');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/dreams", function (request, response) {
  response.send(dreams);
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});

// Simple in-memory store for now
var dreams;

app.post("/webhook", async function (request, response) {
  console.log(request.body);
  response.sendStatus(200);
  if (request.body.data.personEmail === "psychbot@sparkbot.io") {
    return;
  }
  var message = await spark.messages.get(request.body.data.id);
  // message.text contains the text of the message sent to the bot
  console.log(message.text);
  await spark.messages.create({
    roomId: message.roomId,
    text: "Echo: " + message.text
  });
});

async function removeAllWebhooks() {
  var webhooks = await spark.webhooks.list({});
  
  return Promise.all(webhooks.items.map((a) => spark.webhooks.remove(a)));
}

async function enableSparkWebhook() {
  // https://ciscospark.github.io/spark-js-sdk/api/#webhookscreate
  await removeAllWebhooks();
  var webhook = await spark.webhooks.create({
    "resource": "messages",
    "event": "created",
    "targetUrl": "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/webhook",
    "name": "Main webhook"
  });
  //console.log(webhook);
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  //enableSparkWebhook(); not needed after initial registration
});
