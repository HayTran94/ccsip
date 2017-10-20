const ddd = require('ddd-es-node');
const Entity = ddd.Entity;
const EntityEvent = ddd.EntityEvent;

class InteractionEvent extends EntityEvent {
    constructor() {
        super();
    }
}

class InteractionInitiatedEvent extends InteractionEvent {
    constructor(channel) {
        super();
        this.channel = channel;
    }
}

class InteractionPlacedOnHoldEvent extends InteractionEvent {
    constructor() {
        super();
    }
}

class InteractionRoutedEvent extends InteractionEvent {
    constructor(endpoint, channel) {
        super();
        this.endpoint = endpoint;
        this.channel = channel;
    }
}

class InteractionAnsweredEvent extends InteractionEvent {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }
}

class InteractionEndedEvent extends InteractionEvent {
    constructor() {
        super();
    }
}

class Interaction extends Entity {
    constructor(id, channel, config) {
        super(id, Entity.CONFIG((self, event) => {
        }).apply(config));
        this.channel = channel;
    }

    placeOnHold() {
        this.dispatch(this.id, new InteractionPlacedOnHoldEvent());
    }

    routeTo(endpoint) {
        this.dispatch(this.id, new InteractionRoutedEvent(endpoint, this.channel));
    }

    answer(endpoint) {
        this.dispatch(this.id, new InteractionAnsweredEvent(endpoint));
    }

    end() {
        this.dispatch(this.id, new InteractionEndedEvent());
    }

}

class InteractionService {
    constructor(entityRepository, interactionType) {
        this.interactionType = interactionType || Interaction;
        this.entityRepository = entityRepository;
    }

    placeOnHold(interactionId) {
        return this.entityRepository.load(this.getInteractionType(), interactionId)
            .then((interaction) => {
                interaction.placeOnHold();
            });
    }

    routeTo(interactionId, endpoint) {
        return this.entityRepository.load(this.getInteractionType(), interactionId)
            .then((interaction) => {
                interaction.routeTo(endpoint);
            });
    }

    answer(interactionId, answeredByEndpoint) {
        return this.entityRepository.load(this.getInteractionType(), interactionId)
            .then((interaction) => {
                interaction.answer(answeredByEndpoint);
            });
    }

    endInteraction(interactionId) {
        return this.entityRepository.load(this.getInteractionType(), interactionId)
            .then((interaction) => {
                interaction.end();
            });
    }

    getInteractionType() {
        return this.interactionType;
    }
}

exports.InteractionEvent = InteractionEvent;
exports.InteractionInitiatedEvent = InteractionInitiatedEvent;
exports.InteractionPlacedOnHoldEvent = InteractionPlacedOnHoldEvent;
exports.InteractionRoutedEvent = InteractionRoutedEvent;
exports.InteractionAnsweredEvent = InteractionAnsweredEvent;
exports.InteractionEndedEvent = InteractionEndedEvent;
exports.Interaction = Interaction;
exports.InteractionService = InteractionService;