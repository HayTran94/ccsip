const agents = require('./agent');
const interactions = require('./interaction');
const calls = require('./call');
const chats = require('./chat');

const interactionsView = {};
const agentsView = {};
const agentsByExtensionView = {};
const agentInteractionsView = {};

exports.init = (eventBus) => {
    eventBus.subscribe((event) => {
        if (event instanceof interactions.InteractionInitiatedEvent) {
            interactionsView[event.streamId] = interactionsView[event.streamId] || {id: event.streamId};
            interactionsView[event.streamId].channel = event.channel;
            interactionsView[event.streamId].startedOn = event.timestamp;
            if (event instanceof calls.CallInitiatedEvent) {
                interactionsView[event.streamId].fromPhoneNumber = event.fromPhoneNumber;
                interactionsView[event.streamId].toPhoneNumber = event.toPhoneNumber;
            } else if (event instanceof chats.ChatInitiatedEvent) {
                interactionsView[event.streamId].originator = event.from;
            }
        } else if (event instanceof agents.AgentEndpointAssignedEvent) {
            agentsView[event.streamId] = agentsView[event.streamId] || {id: event.streamId};
            agentsView[event.streamId][event.channel] = {endpoint: event.endpoint};
            agentsByExtensionView[event.endpoint] = agentsView[event.streamId];
        } else if (event instanceof interactions.InteractionRoutedEvent) {
            if (interactionsView[event.streamId] && agentsByExtensionView[event.endpoint]) {
                const agentId = agentsByExtensionView[event.endpoint].id;
                agentInteractionsView[agentId] = agentInteractionsView[agentId] || [];
                agentInteractionsView[agentId].push(event.streamId);
                interactionsView[event.streamId].agentId = agentId;
            }
        } else if (event instanceof interactions.InteractionAnsweredEvent) {
            if (interactionsView[event.streamId]) {
                interactionsView[event.streamId].answeredOn = event.timestamp;
            }
        } else if (event instanceof interactions.InteractionEndedEvent) {
            if (interactionsView[event.streamId]) {
                interactionsView[event.streamId].endedOn = event.timestamp;
            }
        }
    }, {replay: true});
};

exports.findInteraction = (interactionId) => {
    return interactionsView[interactionId];
};

exports.listInteractions = (channel) => {
    return Object.keys(interactionsView)
        .map(interactionId => interactionsView[interactionId])
        .filter(interaction => {
            return typeof channel === 'undefined' || interaction.channel === channel;
        });
};

exports.findAgentInteractions = (agentId) => {
    return (agentInteractionsView[agentId] || []).map(interactionId => interactionsView[interactionId]);
};
