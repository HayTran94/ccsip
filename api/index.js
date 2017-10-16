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
const agents = require('./src/core/agent');
const callService = new calls.CallService(ddd.entityRepository);
const agentService = new agents.AgentService(ddd.entityRepository, ddd.eventBus);
const callQueue = require('./src/core/call_queue');

// api
const restAPI = require('./src/api/rest_api');

// init projections
projections.init(ddd.eventBus);

// init call queue
callQueue(ddd.eventBus, callService, agentService);

// init restAPI
restAPI(9999, agentService, callService);

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
            console.log('joined cluster');
            router.register('external-device-events', (command) => {
                console.log('external-device-event:', command);
                if (command.type === 'sip-phone') {
                    if(command.action === 'register') {
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
                    if(command.action === 'call-started') {
                        callService.initiateCall(command.callId, command.from, command.to);
                    } else if(command.action === 'call-ended') {
                        callService.endCall(command.callId);
                    } else if(command.action === 'announce-playing-complete') {
                        callService.placeOnHold(command.callId);
                    } else if(command.action === 'answered') {
                        callService.answer(command.callId, command.endpoint);
                    }
                }
            });
            ddd.eventBus.subscribe(event => {
                router.broadcast({
                    stream: 'domain-events',
                    partitionKey: 'na',
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

