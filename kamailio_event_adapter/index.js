const meshage = require('meshage');
const clusterPort = 9991;

const staticNodes = [{
    id: `kamailio-event-adapter`,
    self: true,
    host: 'localhost',
    port: clusterPort
}];

new meshage.MessageRouter(
    9992,
    new meshage.GossiperCluster(clusterPort, new meshage.StaticPeerProvider(staticNodes))
).start((err, router) => {
    router.register('external-device-events', (command) => {
        console.log(command);
        return { echo: { command } };
    });
});