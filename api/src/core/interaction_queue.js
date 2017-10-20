const interactions = require('./interaction');
const calls = require('./call');

const releaseAgent = {};

module.exports = (eventBus, agentService, interactionServices) => {

    eventBus.subscribe((event) => {
        if (event instanceof interactions.InteractionInitiatedEvent) {
            if (event instanceof calls.CallInitiatedEvent && event.toPhoneNumber.indexOf('SIP/signaling-proxy/') > -1) {
                // only queue if call not routed directly to an endpoint
                return;
            }
            const criteria = {};
            if (event.channel === 'chat') {
                // pass new chats to chat-bot queue
                criteria.queue = 'chat-bot';
            }
            routeToAvailableDestination(event.streamId, event.channel, criteria);
        } else if (event instanceof interactions.InteractionRoutedEvent) {
            const matches = /^queue:(.*)$/.exec(event.endpoint);
            if (matches !== null) {
                const queue = matches[1];
                routeToAvailableDestination(event.streamId, event.channel, {
                    queue: queue
                });
            }
        } else if (event instanceof interactions.InteractionEndedEvent) {
            if (releaseAgent[event.streamId]) {
                releaseAgent[event.streamId]();
            }
        }
    });

    const routeToAvailableDestination = (interactionId, channel, criteria) => {
        criteria = Object.assign({}, {
            channel: channel
        }, criteria);
        const interactionService = interactionServices[channel];
        releaseAgent[interactionId] = agentService.untilAvailableAgent((agent) => {
            console.log('reserved agent', agent);
            interactionService.routeTo(interactionId, agent[channel].endpoint);
        }, (numChecks, timeWaiting) => {
            eventBus.emit({
                name: 'QueueProgress',
                streamId: interactionId,
                numChecks: numChecks
            });
            console.log('interaction %s %s waiting for agent to become available with criteria (%s) (%s ms %s checks)',
                channel,
                interactionId,
                JSON.stringify(criteria),
                timeWaiting,
                numChecks);
        }, criteria);
    };

};