/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/webhooks              ->  index
 * POST    /api/webhooks              ->  create
 * GET     /api/webhooks/:id          ->  show
 * PUT     /api/webhooks/:id          ->  update
 * DELETE  /api/webhooks/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import Webhook from './webhook.model';
import Botkit from 'botkit';
import request from 'request';

const BOT_CONTROLLER = Botkit.facebookbot({
                  access_token: process.env.ACCESS_TOKEN,
                  verify_token: process.env.VERIFY_TOKEN
                 });

const bot = BOT_CONTROLLER.spawn({});

BOT_CONTROLLER.on('facebook_optin', function (bot, message) {
  bot.reply(message, 'Welcome, friend')
})

// user said hello
BOT_CONTROLLER.hears(['hello'], 'message_received', function (bot, message) {
  var attachment = {
        'type':'template',
        'payload':{
            'template_type':'generic',
            'elements':[
                {
                    'title':'Chocolate Cookie',
                    'image_url':'http://cookies.com/cookie.png',
                    'subtitle':'A delicious chocolate cookie',
                    'buttons':[
                        {
                        'type':'postback',
                        'title':'Eat Cookie',
                        'payload':'chocolate'
                        }
                    ]
                },
            ]
        }
    };

  bot.reply(message, { attachment: attachment });
})

// user said hello
BOT_CONTROLLER.hears(['sino pinaka pogi sa mundo?'], 'message_received', function (bot, message) {
  bot.reply(message, 'si Master Sese lamang ang nag iisang pogi sa mundo');
})

// user says anything else
BOT_CONTROLLER.hears('(.*)', 'message_received', function (bot, message) {
  request('http://labs.bible.org/api/?passage=random&type=text&formatting=plain',
    function(err, resp, body) {
      if (!err && resp.statusCode === 200) {
        bot.reply(message, body);
      }
  });
})

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      res.status(statusCode).json(entity);
    }
  };
}

// function saveUpdates(updates) {
//   return function(entity) {
//     var updated = _.merge(entity, updates);
//     return updated.save()
//       .then(updated => {
//         return updated;
//       });
//   };
// }

// function removeEntity(res) {
//   return function(entity) {
//     if (entity) {
//       return entity.remove()
//         .then(() => {
//           res.status(204).end();
//         });
//     }
//   };
// }

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// this function processes the POST request to the webhook
var handler = function (obj) {
  BOT_CONTROLLER.debug('Message received from FB')
  var message
  if (obj.entry) {
    for (var e = 0; e < obj.entry.length; e++) {
      for (var m = 0; m < obj.entry[e].messaging.length; m++) {
        var facebook_message = obj.entry[e].messaging[m]
        // normal message
        if (facebook_message.message) {
          message = {
            text: facebook_message.message.text,
            user: facebook_message.sender.id,
            channel: facebook_message.sender.id,
            timestamp: facebook_message.timestamp,
            seq: facebook_message.message.seq,
            mid: facebook_message.message.mid,
            attachments: facebook_message.message.attachments
          }

          // save if user comes from m.me adress or Facebook search
          // create_user_if_new(facebook_message.sender.id, facebook_message.timestamp)

          BOT_CONTROLLER.receiveMessage(bot, message)
        }
        // When a user clicks on "Send to Messenger"
        else if (facebook_message.optin ||
                (facebook_message.postback && facebook_message.postback.payload === 'optin')) {
          message = {
            optin: facebook_message.optin,
            user: facebook_message.sender.id,
            channel: facebook_message.sender.id,
            timestamp: facebook_message.timestamp
          }

            // save if user comes from "Send to Messenger"
          // create_user_if_new(facebook_message.sender.id, facebook_message.timestamp)

          BOT_CONTROLLER.trigger('facebook_optin', [bot, message])
        }
        // clicks on a postback action in an attachment
        else if (facebook_message.postback) {
          // trigger BOTH a facebook_postback event
          // and a normal message received event.
          // this allows developers to receive postbacks as part of a conversation.
          message = {
            payload: facebook_message.postback.payload,
            user: facebook_message.sender.id,
            channel: facebook_message.sender.id,
            timestamp: facebook_message.timestamp
          }

          BOT_CONTROLLER.trigger('facebook_postback', [bot, message])

          message = {
            text: facebook_message.postback.payload,
            user: facebook_message.sender.id,
            channel: facebook_message.sender.id,
            timestamp: facebook_message.timestamp
          }

          BOT_CONTROLLER.receiveMessage(bot, message)
        }
        // message delivered callback
        else if (facebook_message.delivery) {
          message = {
            optin: facebook_message.delivery,
            user: facebook_message.sender.id,
            channel: facebook_message.sender.id,
            timestamp: facebook_message.timestamp
          }

          BOT_CONTROLLER.trigger('message_delivered', [bot, message])
        }
        else {
          BOT_CONTROLLER.log('Got an unexpected message from Facebook: ', facebook_message)
        }
      }
    }
  }
}

// var create_user_if_new = function (id, ts) {
//   BOT_CONTROLLER.storage.users.get(id, function (err, user) {
//     if (err) {
//       console.log(err)
//     }
//     else if (!user) {
//       BOT_CONTROLLER.storage.users.save({id: id, created_at: ts})
//     }
//   })
// }

// Gets a list of Webhooks
export function index(req, res) {
  // console.log(controller);
  // res.status(200);
  // return Webhook.find().exec()
  //   .then(respondWithResult(res))
  //   .catch(handleError(res));
  if (req.query['hub.verify_token'] === 'Godisgood') {
    res.send(req.query['hub.challenge']);
    console.log('Bot is now online');
  } else {
    res.send('Error, wrong validation token');    
  }
}

// Gets a single Webhook from the DB
// export function show(req, res) {
//   return Webhook.findById(req.params.id).exec()
//     .then(handleEntityNotFound(res))
//     .then(respondWithResult(res))
//     .catch(handleError(res));
// }

// Creates a new Webhook in the DB
export function create(req, res) {
  handler(req.body);
  res.send('ok');
}

// Updates an existing Webhook in the DB
// export function update(req, res) {
//   if (req.body._id) {
//     delete req.body._id;
//   }
//   return Webhook.findById(req.params.id).exec()
//     .then(handleEntityNotFound(res))
//     .then(saveUpdates(req.body))
//     .then(respondWithResult(res))
//     .catch(handleError(res));
// }

// Deletes a Webhook from the DB
// export function destroy(req, res) {
//   return Webhook.findById(req.params.id).exec()
//     .then(handleEntityNotFound(res))
//     .then(removeEntity(res))
//     .catch(handleError(res));
// }
