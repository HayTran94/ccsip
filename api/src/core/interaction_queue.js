const interactions = require('./interaction');
const calls = require('./call');

const releaseAgent = {};

module.exports = (eventBus, agentService, interactionServices) => {
    eventBus.subscribe((event) => {
        if (event instanceof interactions.InteractionInitiatedEvent) {
            const interactionService = interactionServices[event.channel];

            if (event instanceof calls.CallInitiatedEvent && event.toPhoneNumber.indexOf('SIP/signaling-proxy/') > -1) {
                // only queue if call not routed directly to an endpoint
                return;
            }

            if (event.channel === 'chat') {
                interactionService.routeTo(event.streamId, 'chat-bot');
                return;
            }

            releaseAgent[event.streamId] = agentService.untilAvailableAgent((agent) => {
                console.log('reserved agent', agent);
                interactionService.routeTo(event.streamId, agent[event.channel].endpoint);
            }, (numChecks, timeWaiting) => {
                eventBus.emit({
                    name: 'QueueProgress',
                    streamId: event.streamId,
                    numChecks: numChecks
                });
                console.log('interaction %s %s waiting for agent to become available (%s ms %s checks)',
                    event.channel,
                    event.streamId,
                    timeWaiting,
                    numChecks);
            }, {
                channel: event.channel
            });
        } else if (event instanceof interactions.InteractionRoutedEvent) {
            const matches = /^queue:(.*)$/.exec(event.endpoint);
            if(matches !== null) {
                const queue = matches[1];
                if(queue === 'agentChatQueue') {
                    // fix this
                    interactionServices['chat'].routeTo(event.streamId, `dest:1001:queue:${queue}`);
                } else if (queue === 'bot') {
                    interactionServices['chat'].routeTo(event.streamId, `dest:chat-bot:queue:${queue}`);
                }
            }
        } else if (event instanceof interactions.InteractionEndedEvent) {
            if (releaseAgent[event.streamId]) {
                releaseAgent[event.streamId]();
            }
        }
    });
};