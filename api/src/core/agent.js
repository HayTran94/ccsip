const ddd = require('ddd-es-node');
const Entity = ddd.Entity;
const EntityEvent = ddd.EntityEvent;

class AgentEndpointAssignedEvent extends EntityEvent {
    constructor(channel, endpoint) {
        super();
        this.channel = channel;
        this.endpoint = endpoint;
    }
}

class AgentStatusChangedEvent extends EntityEvent {
    constructor(channel, status) {
        super();
        this.channel = channel;
        this.status = status;
    }
}

class Agent extends Entity {
    constructor(id) {
        super(id, Entity.CONFIG((self, event) => {
            if (event instanceof AgentEndpointAssignedEvent) {
                this.endpoints = this.endpoints || {};
                this.endpoints[event.channel] = event.endpoint;
            } else if (event instanceof AgentStatusChangedEvent) {
                this.channels = this.channels || {};
                this.channels[event.channel] = this.channels[event.channel] || {};
                this.channels[event.channel].status = event.status;
            }
        }));
    }

    assignEndpoint(channel, endpoint) {
        if ((this.endpoints || {})[channel] !== endpoint) {
            this.dispatch(this.id, new AgentEndpointAssignedEvent(channel, endpoint));
        }
    }

    makeAvailable(channel) {
        if ((this.channels || {})[channel] !== 'available') {
            this.dispatch(this.id, new AgentStatusChangedEvent(channel, 'available'));
        }
    }

    makeOffline(channel) {
        if ((this.channels || {})[channel] !== 'offline') {
            this.dispatch(this.id, new AgentStatusChangedEvent(channel, 'offline'));
        }
    }

    reserve(channel) {
        this.dispatch(this.id, new AgentStatusChangedEvent(channel, 'reserved'));
    }
}

const agents = {};

class AgentService {
    constructor(entityRepository, eventBus) {
        this.entityRepository = entityRepository;
        eventBus.subscribe((event) => {
            if (event instanceof AgentEndpointAssignedEvent) {
                agents[event.streamId] = agents[event.streamId] || {id: event.streamId};
                agents[event.streamId][event.channel] = {endpoint: event.endpoint};
            } else if (event instanceof AgentStatusChangedEvent) {
                if(agents[event.streamId] && agents[event.streamId][event.channel]) {
                    agents[event.streamId][event.channel].status = event.status;
                }
            }
        }, {replay: true});
    }

    untilAvailableAgent(callback, progress, criteria) {
        const startTime = new Date().getTime();
        let count = 0;
        let doCheck = true;
        const releaseActions = [() => {
            doCheck = false;
        }];
        const release = () => {
            releaseActions.forEach((action) => action());
        };
        const check = () => {
            if (doCheck) {
                const agents = this.findAvailableAgents(criteria);
                if (progress) {
                    const timeWaiting = new Date().getTime() - startTime;
                    progress(count, timeWaiting, release);
                }
                if (agents.length === 0) {
                    count++;
                    setTimeout(check, 2000);
                } else {
                    // select available agent randomly
                    const agent = agents[Math.floor(Math.random() * agents.length)];
                    // 'reserve' agent by placing them offline
                    this.reserve(agent.id).then(() => {
                        releaseActions.push(() => {
                            // 'release' agent after call completes
                            this.makeAvailable(agent.id, (criteria||{}).channel);
                        });
                        callback(agent);
                    });
                }
            }
        };
        check();
        return release;
    }

    findAgents() {
        return Object.keys(agents).map(agentId => {
            return agents[agentId];
        });
    }

    findAvailableAgents(criteria) {
        criteria = criteria || {};
        return this.findAgents()
            .filter(agent => {
                const channel = criteria.channel;
                if(channel) {
                    return (agent[channel]
                    && agent[channel].endpoint
                    && agent[channel].status === 'available');
                } else {
                    return false;
                }
            });
    }

    assignEndpoint(agentId, channel, endpoint) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.assignEndpoint(channel, endpoint);
        });
    }

    makeAvailable(agentId, channel) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.makeAvailable(channel);
        });
    }

    makeOffline(agentId, channel) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.makeOffline(channel);
        });
    }

    reserve(agentId, channel) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.reserve(channel);
        });
    }
}

exports.AgentEndpointAssignedEvent = AgentEndpointAssignedEvent;
exports.AgentStatusChangedEvent = AgentStatusChangedEvent;
exports.Agent = Agent;
exports.AgentService = AgentService;