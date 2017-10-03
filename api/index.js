if ('true' == process.env.DISABLED) {
    console.log('api integration disabled');
    process.exit(0);
}

// sip integration
const ASTERISK_HOST = process.env.ASTERISK_HOST || process.env.PRIVATE_ADDR || 'ccsip-asterisk-0.open-cc.org';
const ASTERISK_API_USER = process.env.ASTERISK_API_USER;
const ASTERISK_API_SECRET = process.env.ASTERISK_API_SECRET;
const ASTERISK_IS_REGISTRAR = false;
const amiIntegration = require('./src/integration/ami');
const ariIntegration = require('./src/integration/ari');
const meshage = require('meshage');

// core
const ddd = require('ddd-es-node');
const projections = require('./src/core/projections');
const calls = require('./src/core/call');
const agents = require('./src/core/agent');
const callService = new calls.CallService(ddd.entityRepository);
const agentService = new agents.AgentService(ddd.entityRepository, ddd.eventBus);
const callQueue = require('./src/core/call_queue');

// api
const restAPI = require('./src/api/rest_api');

// state
const channels = {};
const channelSounds = {};

// init projections
projections.init(ddd.eventBus);

// init call queue
callQueue(ddd.eventBus, callService, agentService);

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
            if(err) {
                console.log(err);
            } else {
                console.log('joined cluster');
                router.register('kamailio-events', (command) => {
                    console.log(command);
                    if(command.method === 'REGISTER_SUCCESS') {
                        agentService.assignExtension(command.caller, `SIP/signaling-proxy/${command.caller}`).then(() => {
                            if(command.expires === '0') {
                                agentService.makeOffline(command.caller);
                            } else {
                                agentService.makeAvailable(command.caller);
                            }
                        });
                    }
                    return {info: `registered ${command.caller}`};
                });
            }
        });
    } else {
        console.log('signaling proxy host not set');
    }

    // refresh agent state
    ari.endpoints.list().then((endpoints) => {

        if (ASTERISK_IS_REGISTRAR) {
            endpoints.filter(endpoint => endpoint.state !== 'unknown').forEach(endpoint => {

                agentService.assignExtension(endpoint.resource, `${endpoint.technology}/${endpoint.resource}`)
                    .then(() => {
                        if (endpoint.state === 'online') {
                            agentService.makeAvailable(endpoint.resource);
                        } else {
                            agentService.makeOffline(endpoint.resource);
                        }
                    });
            });
        }

    }).then(() => {

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
                    callService.endCall(channel.id);
                });
                callService.initiateCall(event.channel.id, event.channel.caller.number, event.channel.dialplan.exten);
            });
        });
        ddd.eventBus.subscribe((event) => {
            if (event.type === 'QueueProgress') {
                if (channels[event.streamId] && !channelSounds[event.streamId]) {
                    // add delay so beginning of message isn't cut off
                    setTimeout(() => {
                        ariIntegration.playSounds(ari, ['queue-periodic-announce'], channels[event.streamId])
                            .then((playbacks) => {
                                channelSounds[event.streamId] = playbacks.map(playback => playback.id);
                                callService.placeOnHold(event.streamId);
                            });
                    }, 500);
                }
            } else if (event instanceof calls.CallPlacedOnHoldEvent) {
                // play hold music
                // queue-callswaiting
                if (channels[event.streamId]) {
                    ariIntegration.playSounds(ari, ['00_starface-music-8'], channels[event.streamId])
                        .then((playbacks) => {
                            channelSounds[event.streamId] = (channelSounds[event.streamId] || []).concat(playbacks.map(playback => playback.id));
                        });
                }
            } else if (event instanceof calls.CallRoutedEvent) {
                // route to extension
                if (channels[event.streamId]) {
                    ariIntegration.originate(ari, event.endpoint, channels[event.streamId], {
                        onAnswer: () => {
                            callService.answer(event.streamId, event.endpoint).then(() => {
                                ariIntegration.stopSounds(ari, channelSounds[event.streamId] || []);
                            });
                        }
                    });
                }
            }
        });

    });

    ari.start('bridge-dial');
});

// subscribe to ami events
amiIntegration(ASTERISK_HOST, ASTERISK_API_USER, ASTERISK_API_SECRET, {
    onConnect: () => {
        // start rest API
        restAPI(9999, agentService);
    },
    onEvent: (event) => {
        //console.log(JSON.stringify(event));
        switch (event.event) {
            case 'DeviceStateChange':
                const id = event.device.split('/').pop();
                console.log('--->', id, event);
                /*-
                agentService.assignExtension(id, event.device)
                    .then(() => {
                        switch (event.state) {
                            case 'NOT_INUSE':
                                agentService.makeAvailable(id);
                                break;
                            case 'UNAVAILABLE':
                                agentService.makeOffline(id);
                                break;
                        }
                    });
                break;
                */
        }
    }
});


// log unhandled rejections
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
});

