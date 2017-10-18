const interactions = require('../../src/core/interaction');
const calls = require('../../src/core/call');
const agents = require('../../src/core/agent');
const projections = require('../../src/core/projections');
const specHelper = require('../spec_helper');

describe('projections', () => {
    describe('findAgentInteractions', () => {
        it('lists agent interactions', () => {
            specHelper.es(es => {

                projections.init(es.eventBus);

                const agentService = new agents.AgentService(es.entityRepository, es.eventBus);
                const callService = new calls.CallService(es.entityRepository);

                return agentService.assignEndpoint('agent1234', 'voice', 'ext12345')
                    .then(() => {
                        return agentService.makeAvailable('agent1234', 'voice');
                    })
                    .then(() => {
                        return callService.initiateCall('call123', '+123', '+223');
                    })
                    .then(() => {
                        return callService.routeTo('call123', 'ext12345');
                    })
                    .then(() => {
                        return callService.answer('call123', 'ext12345');
                    })
                    .then(() => {
                        const agentInteractions = projections.findAgentInteractions('agent1234');
                        expect(agentInteractions.length).toEqual(1);
                        expect(agentInteractions[0].id).toEqual('call123');
                        expect(agentInteractions[0].channel).toEqual('voice');
                        expect(agentInteractions[0].fromPhoneNumber).toEqual('+123');
                        expect(agentInteractions[0].toPhoneNumber).toEqual('+223');
                        expect(agentInteractions[0].agentId).toEqual('agent1234');
                    });

            });
        });
    });
});