const interactionQueue = require('../../src/core/interaction_queue');
const AgentService = require('../../src/core/agent').AgentService;
const CallService = require('../../src/core/call').CallService;
const CallInitiatedEvent = require('../../src/core/call').CallInitiatedEvent;
const specHelper = require('../spec_helper');

describe('interactionQueue', () => {
    let eventBus, agentService;
    beforeEach(() => {
        specHelper.es(es => {
            eventBus = es.eventBus;
            agentService = new AgentService(es.entityRepository, eventBus);
            interactionQueue(eventBus, agentService, {
                voice: new CallService(es.entityRepository)
            });
        });
    });
    it('can route an interaction', () => {
        return new Promise((resolve) => {
            let numChecks = 0;
            agentService.assignEndpoint('agent1234', 'voice', 'ext12345');
            eventBus.subscribe((event) => {
                if (event.name === 'QueueProgress') {
                    numChecks = event.numChecks;
                    agentService.makeAvailable('agent1234', 'voice');
                }
                if (event.name === 'InteractionRoutedEvent') {
                    expect(event.endpoint).toEqual('ext12345');
                    resolve();
                }
            });
            eventBus.emit(new CallInitiatedEvent('', ''), '12345');
        });
    });
});