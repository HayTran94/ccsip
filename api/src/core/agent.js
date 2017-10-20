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

class AgentQueueAssignedEvent extends EntityEvent {
    constructor(channel, queue) {
        super();
        this.channel = channel;
        this.queue = queue;
    }
}

class AgentStatusChangedEvent extends EntityEvent {
    constructor(channel, status) {
        super();
        this.channel = channel;
        this.status = status;
    }
}

class AgentReservedEvent extends EntityEvent {
    constructor(channel) {
        super();
        this.channel = channel;
    }
}

class AgentReleasedEvent extends EntityEvent {
    constructor(channel) {
        super();
        this.channel = channel;
    }
}

class Agent extends Entity {
    constructor(id) {
        super(id, Entity.CONFIG((self, event) => {
            if (event instanceof AgentEndpointAssignedEvent) {
                this.endpoints = this.endpoints || {};
                this.endpoints[event.channel] = event.endpoint;
            } else if (event instanceof AgentQueueAssignedEvent) {
                this.channels = this.channels || {};
                this.channels[event.channel] = this.channels[event.channel] || {};
                this.channels[event.channel].queues = this.channels[event.channel].queues || [];
                this.channels[event.channel].queues.push(event.queue);
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

    assignQueue(channel, queue) {
        if(!this.hasChannelQueue(channel, queue)) {
            this.dispatch(this.id, new AgentQueueAssignedEvent(channel, queue));
        }
    }

    makeAvailable(channel) {
        if (this.getChannelStatus(channel) !== 'available') {
            this.dispatch(this.id, new AgentStatusChangedEvent(channel, 'available'));
        }
    }

    makeOffline(channel) {
        if (this.getChannelStatus(channel) !== 'offline') {
            this.dispatch(this.id, new AgentStatusChangedEvent(channel, 'offline'));
        }
    }

    reserve(channel) {
        this.dispatch(this.id, new AgentReservedEvent(channel));
    }

    release(channel) {
        this.dispatch(this.id, new AgentReleasedEvent(channel));
    }

    getChannelStatus(channel) {
        return ((this.channels || {})[channel]||{}).status;
    }

    hasChannelQueue(channel, queue) {
        return (((this.channels || {})[channel]||{}).queues || []).indexOf(queue) > -1;
    }

}

const agents = {};

class AgentService {
    constructor(entityRepository, eventBus) {
        this.entityRepository = entityRepository;
        const initAgentRec = (agentId, channel) => {
            agents[agentId] = agents[agentId] || {id: agentId};
            if(channel) {
                agents[agentId][channel] = agents[agentId][channel] || { queues: [] };
            }
            return agents[agentId];
        };
        eventBus.subscribe((event) => {
            if (event instanceof AgentEndpointAssignedEvent) {
                initAgentRec(event.streamId, event.channel)[event.channel].endpoint = event.endpoint;
            } else if (event instanceof AgentQueueAssignedEvent) {
                initAgentRec(event.streamId, event.channel)[event.channel].queues .push(event.queue);
            } else if (event instanceof AgentStatusChangedEvent) {
                initAgentRec(event.streamId, event.channel)[event.channel].status = event.status;
            } else if (event instanceof AgentReservedEvent) {
                initAgentRec(event.streamId, event.channel)[event.channel].reserved = true;
            } else if (event instanceof AgentReleasedEvent) {
                initAgentRec(event.streamId, event.channel)[event.channel].reserved = false;
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
                    const channelToReserve = (criteria||{}).channel;
                    this.reserve(agent.id, channelToReserve).then(() => {
                        releaseActions.push(() => {
                            // 'release' agent after call completes
                            this.release(agent.id, channelToReserve);
                        });
                        callback(agent);
                    });
                }
            }
        };
        check();
        return release;
    }

    findAgentById(agentId) {
        return agents[agentId];
    };

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
                const evals = [];
                evals.push((channel && agent[channel]
                && agent[channel].endpoint
                && agent[channel].status === 'available'
                && !agent[channel].reserved));
                if (criteria.queue) {
                    evals.push(agent[channel] && agent[channel].queues && agent[channel].queues.indexOf(criteria.queue) > -1);
                } else {
                    evals.push(agent[channel] && (!agent[channel].queues || agent[channel].queues.length === 0));
                }
                return evals.reduce((prev, cur) => {
                    return prev && cur
                }, true);
            });
    }

    assignEndpoint(agentId, channel, endpoint) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.assignEndpoint(channel, endpoint);
        });
    }

    assignQueue(agentId, channel, queue) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.assignQueue(channel, queue);
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

    release(agentId, channel) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.release(channel);
        });
    }
}

exports.AgentEndpointAssignedEvent = AgentEndpointAssignedEvent;
exports.AgentQueueAssignedEvent = AgentQueueAssignedEvent;
exports.AgentStatusChangedEvent = AgentStatusChangedEvent;
exports.AgentReservedEvent = AgentReservedEvent;
exports.AgentReleasedEvent = AgentReleasedEvent;
exports.Agent = Agent;
exports.AgentService = AgentService;