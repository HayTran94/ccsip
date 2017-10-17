if ('true' == process.env.DISABLED) {
    console.log('api integration disabled');
    process.exit(0);
}

// messages
const meshage = require('meshage');

// core
const ddd = require('ddd-es-node');
const projections = require('./src/core/projections');
const calls = require('./src/core/call');
const chats = require('./src/core/chat');
const agents = require('./src/core/agent');
const chatService = new chats.ChatService(ddd.entityRepository);
const callService = new calls.CallService(ddd.entityRepository);
const agentService = new agents.AgentService(ddd.entityRepository, ddd.eventBus);
const interactionQueue = require('./src/core/interaction_queue');

// api
const restAPI = require('./src/api/rest_api');

// init projections
projections.init(ddd.eventBus);

// init interaction queue
interactionQueue(ddd.eventBus, agentService, {
    voice: callService,
    chat: chatService
});

// init restAPI
restAPI(9999, agentService);

if (process.env.SIGNALING_PROXY_HOST) {
    console.log(`signaling proxy host set to ${process.env.SIGNALING_PROXY_HOST}`);
    const staticNodes = [{
        id: `core-api`,
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

            router.register('external-device-events', (command) => {

                const callId = /^([^@]+)/.exec(command.callID || command.callId)[0];

                if (command.type === 'sip-phone') {
                    if (command.action === 'register') {
                        const agentId = command.caller; // caller is the one registering
                        const endpoint = `SIP/signaling-proxy/${command.caller}`;
                        agentService.assignExtension(agentId, endpoint).then(() => {
                            if (command.expires === '0') {
                                agentService.makeOffline(agentId);
                            } else {
                                agentService.makeAvailable(agentId);
                            }
                        });
                    }
                } else if (command.type === 'sip-call') {
                    if (command.source === 'kamailio') {
                        /**
                         if (command.action === 'dispatch') {
                            const matches = /^sip:([^@]+)@.*$/.exec(command.callee);
                            if (matches !== null && matches.length > 0) {
                                const endpoint = `SIP/signaling-proxy/${matches[1]}`;
                                callService.initiateCall(callId, command.caller, endpoint)
                                    .then(() => {
                                        callService.routeTo(callId, endpoint);
                                    });
                            }
                        } else if (command.method === 'ACK') {
                            callService.answer(callId, `SIP/signaling-proxy/${command.callee}`);
                        } else if (command.method === 'BYE') {
                            callService.endInteraction(callId);
                        }*/
                    } else {
                        if (command.action === 'call-started') {
                            callService.initiateCall(callId, command.from, command.to);
                        } else if (command.action === 'call-ended') {
                            callService.endInteraction(callId);
                        } else if (command.action === 'announce-playing-complete') {
                            callService.placeOnHold(callId);
                        } else if (command.action === 'answered') {
                            callService.answer(callId, command.endpoint);
                        }
                    }
                } else if (command.type === 'sms-message') {
                    if (command.action === 'started') {
                        chatService.initiateChat(
                            command.conversationId,
                            command.from,
                            command.messageBody);
                    } else if (command.action === 'received') {
                        chatService.postMessage(
                            command.conversationId,
                            command.from,
                            command.messageBody);
                    }
                }
            });
            ddd.eventBus.subscribe(event => {
                router.broadcast({
                    stream: 'domain-events',
                    partitionKey: event.streamId,
                    event: event
                });
            });
        }
    });
} else {
    console.log('signaling proxy host not set');
}

// log unhandled rejections
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
});

