const twilio = require('twilio');
const uuid = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

module.exports = (port, accountSid, authToken, messageRouter) => {

    const twilioClient = twilio(accountSid, authToken);

    app.use(cookieParser());

    app.use(function (req, res, next) {
        if (req.path.indexOf('nosig') === -1) {
            // validate the x-twilio-signature header
            if (twilio.validateExpressRequest(req, authToken, {protocol: req.headers['x-forwarded-proto']})) {
                next();
            } else {
                res
                    .status(403)
                    .type('text/plain')
                    .send('Invalid signature!');
            }
        } else {
            next();
        }
    });

    app.post('/twilio/inbound/:channel', (req, res) => {
        res
            .type('text/xml');
        switch (req.params.channel) {
            case 'sms':
            {
                let initial = false;
                let conversationId = req.cookies['x-conversation-id'];
                if (!req.cookies['x-conversation-id']) {
                    initial = true;
                    res.cookie('x-conversation-id', conversationId = uuid.v4());
                }

                res.send('<Response></Response>');

                const incomingPhoneNumber = req.body.From;
                const text = req.body.Body;
                messageRouter.send({
                    stream: 'external-device-events',
                    partitionKey: conversationId,
                    type: 'sms-message',
                    action: initial ? 'started' : 'received',
                    from: incomingPhoneNumber,
                    conversationId: conversationId,
                    messageBody: text
                });
                break;
            }
            default:
                res.status(404);
                break;
        }
    });

    app.listen(port, () => {

        messageRouter.register('domain-events', (command) => {
            console.log('domain-events:', command);
            if(command.event.name === 'ChatMessagePostedEvent') {
                if(command.event.to !== 'inbound') {
                    twilioClient.messages.create({
                        to: command.event.to,
                        body: event.message
                    });
                }
            }
        });

    });

};
