const ddd = require('ddd-es-node');
const Entity = ddd.Entity;
const EntityEvent = ddd.EntityEvent;

class AgentExtensionAssignedEvent extends EntityEvent {
    constructor(extension) {
        super();
        this.extension = extension;
    }
}

class AgentStatusChangedEvent extends EntityEvent {
    constructor(status) {
        super();
        this.status = status;
    }
}

class Agent extends Entity {
    constructor(id) {
        super(id, Entity.CONFIG((self, event) => {
            if(event instanceof AgentExtensionAssignedEvent) {
                this.extension = event.extension;
            } else if (event instanceof AgentStatusChangedEvent) {
                this.status = event.status;
            }
        }));
    }

    assignExtension(extension) {
        if(this.extension !== extension) {
            this.dispatch(this.id, new AgentExtensionAssignedEvent(extension));
        }
    }

    makeAvailable() {
        if(this.status !== 'available') {
            this.dispatch(this.id, new AgentStatusChangedEvent('available'));
        }
    }

    makeOffline() {
        if(this.state !== 'offline') {
            this.dispatch(this.id, new AgentStatusChangedEvent('offline'));
        }
    }
}

const agents = {};

class AgentService {
    constructor(entityRepository, eventBus) {
        this.entityRepository = entityRepository;
        eventBus.subscribe((event) => {
            if (event instanceof AgentExtensionAssignedEvent) {
                agents[event.streamId] = agents[event.streamId] || {id: event.streamId};
                agents[event.streamId].extension = event.extension;
            } else if (event instanceof AgentStatusChangedEvent) {
                agents[event.streamId].status = event.status;
            }
        }, {replay: true});
    }

    untilAvailableAgent(callback, progress) {
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
                const agents = this.findAvailableAgents();
                if (progress) {
                    const timeWaiting = new Date().getTime() - startTime;
                    progress(count, timeWaiting);
                }
                if (agents.length === 0) {
                    count++;
                    setTimeout(check, 2000);
                } else {
                    // select available agent randomly
                    const agent = agents[Math.floor(Math.random() * agents.length)];
                    // 'reserve' agent by placing them offline
                    this.makeOffline(agent.id).then(() => {
                        releaseActions.push(() => {
                            // 'release' agent after call completes
                            this.makeAvailable(agent.id);
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

    findAvailableAgents() {
        return this.findAgents().filter(agent => agent.status === 'available');
    }

    assignExtension(agentId, extension) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.assignExtension(extension);
        });
    }

    makeAvailable(agentId) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.makeAvailable();
        });
    }

    makeOffline(agentId) {
        return this.entityRepository.load(Agent, agentId).then((agent) => {
            agent.makeOffline();
        });
    }
}

exports.AgentExtensionAssignedEvent = AgentExtensionAssignedEvent;
exports.AgentStatusChangedEvent = AgentStatusChangedEvent;
exports.Agent = Agent;
exports.AgentService = AgentService;