const calls = require('./call');

const releaseAgent = {};

module.exports = (eventBus, callService, agentService) => {
    eventBus.subscribe((event) => {
        if (event instanceof calls.CallInitiatedEvent) {
            // only queue if call not routed directly to an extension
            if(event.toPhoneNumber.indexOf('SIP/signaling-proxy/') === -1) {
                releaseAgent[event.streamId] = agentService.untilAvailableAgent((agent) => {
                    console.log('reserved agent', agent);
                    callService.routeTo(event.streamId, agent.extension);
                }, (numChecks, timeWaiting) => {
                    eventBus.emit({
                        name: 'QueueProgress',
                        streamId: event.streamId,
                        numChecks: numChecks
                    });
                    console.log('call %s waiting for agent to become available (%s ms)', event.streamId, timeWaiting);
                });
            }
        } else if (event instanceof calls.CallEndedEvent) {
            if (releaseAgent[event.streamId]) {
                releaseAgent[event.streamId]();
            }
        }
    });
};