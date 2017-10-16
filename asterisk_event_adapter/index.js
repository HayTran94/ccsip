// sip integration
const ASTERISK_HOST = process.env.ASTERISK_HOST || process.env.PRIVATE_ADDR || 'ccsip-asterisk-0.open-cc.org';
const ASTERISK_API_USER = process.env.ASTERISK_API_USER;
const ASTERISK_API_SECRET = process.env.ASTERISK_API_SECRET;

const ariIntegration = require('./src/integration/ari');
const meshage = require('meshage');

// state
const channels = {};
const channelSounds = {};

// init ari
ariIntegration.init(ASTERISK_HOST, ASTERISK_API_USER, ASTERISK_API_SECRET).get((ari) => {

    if (process.env.SIGNALING_PROXY_HOST) {
        console.log(`signaling proxy host set to ${process.env.SIGNALING_PROXY_HOST}`);
        const staticNodes = [{
            id: `asterisk-api-adapter`,
            self: true,
            host: process.env.PRIVATE_ADDR,
            port: 9991
        }, {
            id: `kamailio-event-adapter`,
            self: false,
            host: process.env.SIGNALING_PROXY_HOST,
            port: 9991
        }];
        new meshage.MessageRouter(
            9992,
            new meshage.GossiperCluster(9991, new meshage.StaticPeerProvider(staticNodes))
        ).start((err, router) => {
            if (err) {
                console.log(err);
            } else {

                console.log('joined cluster');

                router.register('domain-events', (command) => {
                    console.log('domain-events:', command);
                    onDomainEvent(ariIntegration, ari, router, command.event);
                });

                // start stasis app
                ari.on('StasisStart', (event, channel) => {
                    if (event.args[0] === 'dialed') {
                        return;
                    }
                    channel.answer((err) => {
                        if (err) {
                            throw err;
                        }
                        channels[channel.id] = channel;
                        channel.on('StasisEnd', (event, channel) => {
                            router.send({
                                stream: 'external-device-events',
                                partitionKey: channel.id,
                                type: 'sip-call',
                                callId: channel.id,
                                action: 'call-ended'
                            });
                        });
                        router.send({
                            stream: 'external-device-events',
                            partitionKey: channel.id,
                            type: 'sip-call',
                            callId: channel.id,
                            from: event.channel.caller.number,
                            to: event.channel.dialplan.exten,
                            action: 'call-started'
                        });
                    });
                });
            }
        });
    } else {
        console.error('signaling proxy host not set');
    }

    ari.start('bridge-dial');

});

const onDomainEvent = (ariIntegration, ari, messageRouter, event) => {
    if (event.type === 'QueueProgress') {
        if (channels[event.streamId] && !channelSounds[event.streamId]) {
            // add delay so beginning of message isn't cut off
            setTimeout(() => {
                ariIntegration.playSounds(ari, ['queue-periodic-announce'], channels[event.streamId])
                    .then((playbacks) => {
                        channelSounds[event.streamId] = playbacks.map(playback => playback.id);
                        messageRouter.send({
                            stream: 'external-device-events',
                            partitionKey: event.streamId,
                            type: 'sip-call',
                            callId: event.streamId,
                            action: 'announce-playing-complete'
                        });
                    });
            }, 500);
        }
    } else if (event.name === 'CallPlacedOnHoldEvent') {
        // play hold music
        // queue-callswaiting
        if (channels[event.streamId]) {
            ariIntegration.playSounds(ari, ['00_starface-music-8'], channels[event.streamId])
                .then((playbacks) => {
                    channelSounds[event.streamId] = (channelSounds[event.streamId] || []).concat(playbacks.map(playback => playback.id));
                });
        }
    } else if (event.name === 'CallRoutedEvent') {
        // route to extension
        if (channels[event.streamId]) {
            ariIntegration.originate(ari, event.endpoint, channels[event.streamId], {
                onAnswer: () => {
                    messageRouter.send({
                        stream: 'external-device-events',
                        partitionKey: event.streamId,
                        type: 'sip-call',
                        action: 'answered',
                        callId: event.streamId,
                        endpoint: event.endpoint
                    }).then(() => {
                        ariIntegration.stopSounds(ari, channelSounds[event.streamId] || []);
                    });
                }
            });
        }
    }
};

// log unhandled rejections
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
});

