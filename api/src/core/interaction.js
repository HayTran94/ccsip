const ddd = require('ddd-es-node');
const Entity = ddd.Entity;
const EntityEvent = ddd.EntityEvent;

class InteractionInitiatedEvent extends EntityEvent {
    constructor(channel) {
        super();
        this.channel = channel;
    }
}

class InteractionPlacedOnHoldEvent extends EntityEvent {
    constructor() {
        super();
    }
}

class InteractionRoutedEvent extends EntityEvent {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }
}

class InteractionAnsweredEvent extends EntityEvent {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }
}

class InteractionEndedEvent extends EntityEvent {
    constructor() {
        super();
    }
}

class Interaction extends Entity {
    constructor(id, config) {
        super(id, Entity.CONFIG((self, event) => {
        }).apply(config));
    }

    placeOnHold() {
        this.dispatch(this.id, new InteractionPlacedOnHoldEvent());
    }

    routeTo(endpoint) {
        this.dispatch(this.id, new InteractionRoutedEvent(endpoint));
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

exports.InteractionInitiatedEvent = InteractionInitiatedEvent;
exports.InteractionPlacedOnHoldEvent = InteractionPlacedOnHoldEvent;
exports.InteractionRoutedEvent = InteractionRoutedEvent;
exports.InteractionAnsweredEvent = InteractionAnsweredEvent;
exports.InteractionEndedEvent = InteractionEndedEvent;
exports.Interaction = Interaction;
exports.InteractionService = InteractionService;