const CLUSTER_PORT = process.env.CLUSTER_PORT || 9991;
const SERVICE_PORT = process.env.SERVICE_PORT || 9992;
const TWILIO_SERVICE_PORT = process.env.TWILIO_SERVICE_PORT || 9999;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

const twilioHooks = require('./src/integration/twilio_hooks');

const meshage = require('meshage');

if (process.env.SIGNALING_PROXY_HOST) {
    console.log(`signaling proxy host set to ${process.env.SIGNALING_PROXY_HOST}`);
    const staticNodes = [{
        id: `twilio-event-adapter`,
        self: true,
        host: process.env.PRIVATE_ADDR,
        port: CLUSTER_PORT
    }, {
        id: `kamailio-event-adapter`,
        self: false,
        host: process.env.SIGNALING_PROXY_HOST,
        port: 9991
    }];
    new meshage.MessageRouter(
        SERVICE_PORT,
        new meshage.GossiperCluster(CLUSTER_PORT, new meshage.StaticPeerProvider(staticNodes))
    ).start((err, router) => {
        if (err) {
            console.log(err);
        } else {
            twilioHooks(TWILIO_SERVICE_PORT, TWILIO_AUTH_TOKEN, router);
        }
    });
} else {
    console.error('signaling proxy host not set');
}

// log unhandled rejections
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
});

