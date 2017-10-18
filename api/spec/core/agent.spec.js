const agents = require('../../src/core/agent');
const specHelper = require('../spec_helper');

describe('agent', () => {
    it('determines available agents based on channel and status', () => {
        specHelper.es(es => {
            const agentService = new agents.AgentService(es.entityRepository, es.eventBus);
            return agentService.assignEndpoint('agent1234', 'voice', 'ext12345').then(() => {
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
});