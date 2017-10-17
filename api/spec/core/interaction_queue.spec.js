const interactionQueue = require('../../src/core/interaction_queue');
const AgentService = require('../../src/core/agent').AgentService;
const CallService = require('../../src/core/call').CallService;
const CallInitiatedEvent = require('../../src/core/call').CallInitiatedEvent;
const BaseEntityRepository = require('ddd-es-node').BaseEntityRepository;

describe('interactionQueue', () => {
    let eventBus, agentService;
    beforeEach(() => {
        let _handlers = [];
        eventBus = {
            emit(event, streamId) {
                if(streamId) {
                    event.streamId = streamId;
                }
                _handlers.forEach(handler => handler(event));
            },
            subscribe(handler) {
                _handlers.push(handler);
            }
        };
        const eventDispatcher = (streamId, events) => {
            events.forEach((event) => {
                event.streamId = streamId;
                eventBus.emit(event);
            });
            return Promise.resolve(events);
        };
        const eventStore = {
            replay(id, handler, done) {
                if (done) {
                    done();
                }
            },
            replayAll(handler, done) {
                if (done) {
                    done();
                }
            }
        };
        const entityRepository = new BaseEntityRepository(eventDispatcher, eventStore);
        agentService = new AgentService(entityRepository, eventBus);
        const callService = new CallService(entityRepository);
        const interactionServices = {
            voice: callService
        };
        interactionQueue(eventBus, agentService, interactionServices);
    });
    it('can route an interaction', () => {
        return new Promise((resolve) => {
            let numChecks = 0;
            agentService.assignExtension('agent1234', 'ext12345');
            eventBus.subscribe((event) => {
                if (event.name === 'QueueProgress') {
                    numChecks = event.numChecks;
                    agentService.makeAvailable('agent1234');
                }
                if(event.name === 'InteractionRoutedEvent') {
                    expect(numChecks).toEqual(1);
                    expect(event.endpoint).toEqual('ext12345');
                    resolve();
                }
            });
            eventBus.emit(new CallInitiatedEvent('',''), '12345');
        });
    });
});