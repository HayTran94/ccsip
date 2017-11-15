const agents = require('../../src/core/agent');
const specHelper = require('../spec_helper');

describe('agent', () => {
    describe('when reserving agents', () => {
        let agent;
        beforeEach(() => {
            agent = new agents.Agent('agent1234');
            agent.dispatch = jest.fn((id, event) => {
                agent.apply(event);
            });
        });
        describe('when the agent goes to full capacity', () => {
            it('dispatches an AgentAtCapacityEvent', () => {
                agent.assignEndpoint('voice', 'ext12345', 1);
                agent.makeAvailable('voice');
                agent.reserve('voice');
                expect(agent.dispatch).toBeCalledWith('agent1234', new agents.AgentAtCapacityEvent('voice'));
            });
        });
        describe('when the agent goes bellow full capacity', () => {
            it('dispatches an AgentAtCapacityEvent', () => {
                agent.assignEndpoint('voice', 'ext12345', 1);
                agent.makeAvailable('voice');
                agent.release(agent.reserve('voice'), 'voice');
                expect(agent.dispatch).toBeCalledWith('agent1234', new agents.AgentBelowCapacityEvent('voice'));
            });
        });
    });
    describe('when finding available agents', () => {
        it('determines available agents based on channel and status', () => {
            specHelper.es(es => {
                const agentService = new agents.AgentService(es.entityRepository, es.eventBus);
                return agentService.assignEndpoint('agent1234', 'voice', 'ext12345')
                    .then(() => {
                        return agentService.makeAvailable('agent1234', 'voice').then(() => {
                            const voiceAgents = agentService.findAvailableAgents({
                                channel: 'voice'
                            });
                            const chatAgents = agentService.findAvailableAgents({
                                channel: 'chat'
                            });
                            expect(voiceAgents.length).toEqual(1);
                            expect(chatAgents.length).toEqual(0);
                        });
                    });
            });
        });
        describe('when queue criteria is supplied', () => {
            it('only returns agents in the queue', () => {
                specHelper.es(es => {
                    const agentService = new agents.AgentService(es.entityRepository, es.eventBus);
                    withAgents(agentService, [{
                        id: 'agent1234',
                        channels: [{
                            channel: 'voice',
                            endpoint: 'ext12345',
                            queues: ['some-queue']
                        }]
                    }]).then(() => {
                        const queueMatch = agentService.findAvailableAgents({
                            channel: 'voice',
                            queue: 'some-queue'
                        });
                        const queueMismatch = agentService.findAvailableAgents({
                            channel: 'voice',
                            queue: 'no-queue'
                        });
                        expect(queueMatch.length).toEqual(1);
                        expect(queueMismatch.length).toEqual(0);
                    });
                });
            });
        });
        describe('when queue criteria is not supplied', () => {
            it('excludes agents explicitly in a queue', () => {
                specHelper.es(es => {
                    const agentService = new agents.AgentService(es.entityRepository, es.eventBus);
                    withAgents(agentService, [{
                        id: 'agent1234',
                        channels: [{
                            channel: 'voice',
                            endpoint: 'ext12345',
                            queues: ['some-queue']
                        }]
                    }, {
                        id: 'agent2234',
                        channels: [{
                            channel: 'voice',
                            endpoint: 'ext22345'
                        }]
                    }]).then(() => {
                        const noQueueCriteria = agentService.findAvailableAgents({
                            channel: 'voice'
                        });
                        const queueCriteria = agentService.findAvailableAgents({
                            channel: 'voice',
                            queue: 'some-queue'
                        });
                        expect(noQueueCriteria[0].id).toEqual('agent2234');
                        expect(queueCriteria[0].id).toEqual('agent1234');
                    });
                });
            });
        });
    });
});

const withAgents = (agentService, agents) => {
    return Promise.all(agents.map((agent) => {
        return Promise.all((agent.channels || []).map((channel) => {
            return agentService.assignEndpoint(agent.id, channel.channel, channel.endpoint, channel.capacity)
                .then(() => {
                    if (channel.queues) {
                        return Promise.all(channel.queues.map((queue) => {
                            return agentService.assignQueue(agent.id, channel.channel, queue);
                        }));
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(() => {
                    return agentService.makeAvailable(agent.id, channel.channel);
                });
        }));
    }));
};