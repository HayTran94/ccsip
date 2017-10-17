const agents = require('./agent');
const interactions = require('./interaction');
const calls = require('./call');

const callsView = {};
const agentsView = {};
const agentsByExtensionView = {};
const agentCallsView = {};

exports.init = (eventBus) => {
    eventBus.subscribe((event) => {
        console.log(event);
        if (event instanceof calls.CallInitiatedEvent) {
            callsView[event.streamId] = callsView[event.streamId] || {id: event.streamId};
            callsView[event.streamId].startedOn = event.timestamp;
            callsView[event.streamId].fromPhoneNumber = event.fromPhoneNumber;
            callsView[event.streamId].toPhoneNumber = event.toPhoneNumber;
        } else if (event instanceof agents.AgentExtensionAssignedEvent) {
            agentsView[event.streamId] = agentsView[event.streamId] || {id: event.streamId};
            agentsView[event.streamId].extension = event.extension;
            agentsByExtensionView[event.extension] = agentsView[event.streamId];
        } else if (event instanceof interactions.InteractionRoutedEvent) {
            if (callsView[event.streamId]) {
                const agentId = agentsByExtensionView[event.endpoint].id;
                agentCallsView[agentId] = agentCallsView[agentId] || [];
                agentCallsView[agentId].push(event.streamId);
                callsView[event.streamId].agentId = agentId;
            }
        } else if (event instanceof interactions.InteractionAnsweredEvent) {
            if(callsView[event.streamId]) {
                callsView[event.streamId].answeredOn = event.timestamp;
            }
        } else if (event instanceof interactions.InteractionEndedEvent) {
            if(callsView[event.streamId]) {
                callsView[event.streamId].endedOn = event.timestamp;
            }
        }
    }, { replay: true });
};

exports.listCalls = () => {
    return Object.keys(callsView).map(callId => callsView[callId]);
};

exports.findAgentCalls = (agentId) => {
    return (agentCallsView[agentId]||[]).map(callId => callsView[callId]);
};
