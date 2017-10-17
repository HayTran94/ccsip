const interactions = require('./interaction');
const calls = require('./call');

const releaseAgent = {};

module.exports = (eventBus, agentService, interactionServices) => {
    eventBus.subscribe((event) => {
        if (event instanceof interactions.InteractionInitiatedEvent) {
            const interactionService = interactionServices[event.channel];

            if (event instanceof calls.CallInitiatedEvent && event.toPhoneNumber.indexOf('SIP/signaling-proxy/') > -1) {
                // only queue if call not routed directly to an extension
                return;
            }

            const release = releaseAgent[event.streamId] = agentService.untilAvailableAgent((agent) => {
                console.log('reserved agent', agent);
                interactionService.routeTo(event.streamId, agent.extension);
            }, (numChecks, timeWaiting) => {
                eventBus.emit({
                    name: 'QueueProgress',
                    streamId: event.streamId,
                    numChecks: numChecks
                });
                console.log('interaction %s %s waiting for agent to become available (%s ms)',
                    event.channel,
                    event.streamId,
                    timeWaiting);
            });

        } else if (event instanceof interactions.InteractionEndedEvent) {
            if (releaseAgent[event.streamId]) {
                releaseAgent[event.streamId]();
            }
        }
    });
};