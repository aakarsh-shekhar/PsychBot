// server.js
// where your node app starts

// init project
var express = require('express');
var spark = require('ciscospark/env');
var request_ = require('request');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());

//http://hack.nuance.mobi/CognitivePlatform/Question?teamKey=<TEAM_KEY>&questi on=<QUESTION_TEXT> 


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

const JOIN_GROUP_CMD = "i want to join a support group to ";

app.post("/webhook", async function (request, response) {
  console.log(request.body);
  response.sendStatus(200);
  if (request.body.data.personEmail === "psychbot@sparkbot.io") {
    return;
  }
  var message = await spark.messages.get(request.body.data.id);
  // message.text contains the text of the message sent to the bot
  console.log(message.text);
  
  if(message.text.toLowerCase().indexOf(JOIN_GROUP_CMD) == 0) {
    addUserToGroup(message.personEmail, message.text.substring(JOIN_GROUP_CMD.length), message.roomId);
    return;
  }
  var nuanceUrl = "http://hack.nuance.mobi/CognitivePlatform/Question?teamKey=" + process.env.NUANCE_TEAM_KEY + "&question=" + encodeURIComponent(message.text);
  request_(nuanceUrl, {json: true}, (err, res, body) => {
  
    spark.messages.create({
      roomId: message.roomId,
      text: "Answer: " + bestAnswer(body)
    });
  });
});

function bestAnswer (body) {
  var best = body.answers[0].summary;
  
  for(var i=0; i< Math.min(body.answers.length, 3); i++)
  {
    var ans = body.answers[i];
    if(ans.score>50 && ans.summary.length<best.length)
    {
      best = ans.summary;
    }
  }
  
  if(best.length>1000)
    best = best.substring(0, best.indexOf(".")+1);
  if(best.score<30)
    best = "Sorry I don't understand that";
  
  return best;
}

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

async function getOrCreateGroupForName(groupName) {
  var existing = await spark.rooms.list();
  for (var i = 0; i < existing.items.length; i++) {
    if (existing.items[i].title === groupName) return existing.items[i];
  }
  return await spark.rooms.create({title: groupName});
}

async function addUserToGroup(userEmail, groupName, orgGroup) {
      spark.messages.create({
      roomId: orgGroup,
      text: "Added you to a support group."
    });  
  var group = await getOrCreateGroupForName(groupName);
  try {
    var membership = await spark.memberships.create({personEmail: userEmail, roomId: group.id});
  } catch (e) {
    console.log(e);
    //already in the room?
  }
  spark.messages.create({
    roomId: group.id,
    text: "Welcome to the " + groupName + " group. You can share your experiences with others who are going through, or have gone through, the same situation, and can offer advice."
  });
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  //enableSparkWebhook(); not needed after initial registration
});