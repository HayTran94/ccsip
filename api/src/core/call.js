const ddd = require('ddd-es-node/dist/src/core/entity');
const Entity = ddd.Entity;
const EntityEvent = ddd.EntityEvent;

class CallInitiatedEvent extends EntityEvent {
    constructor(fromPhoneNumber, toPhoneNumber) {
        super();
        this.fromPhoneNumber = fromPhoneNumber;
        this.toPhoneNumber = toPhoneNumber;
    }
}

class CallPlacedOnHoldEvent extends EntityEvent {
    constructor() {
        super();
    }
}

class CallRoutedEvent extends EntityEvent {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }
}

class CallAnsweredEvent extends EntityEvent {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }
}

class CallEndedEvent extends EntityEvent {
    constructor() {
        super();
    }
}

class Call extends Entity {
    constructor(id) {
        super(id, Entity.CONFIG((self, event) => {
            if (event instanceof CallInitiatedEvent) {
                this.phoneNumber = event.phoneNumber;
            }
        }));
    }

    initiate(fromPhoneNumber, toPhoneNumber) {
        this.dispatch(this.id, new CallInitiatedEvent(fromPhoneNumber, toPhoneNumber));
    }

    placeOnHold() {
        this.dispatch(this.id, new CallPlacedOnHoldEvent());
    }

    routeTo(endpoint) {
        this.dispatch(this.id, new CallRoutedEvent(endpoint));
    }

    answer(endpoint) {
        this.dispatch(this.id, new CallAnsweredEvent(endpoint));
    }

    end() {
        this.dispatch(this.id, new CallEndedEvent());
    }

}

class CallService {
    constructor(entityRepository) {
        this.entityRepository = entityRepository;
    }

    initiateCall(callId, fromPhoneNumber, toPhoneNumber) {
        return this.entityRepository.load(Call, callId).then((call) => {
            call.initiate(fromPhoneNumber, toPhoneNumber);
        });
    }

    placeOnHold(callId) {
        return this.entityRepository.load(Call, callId).then((call) => {
            call.placeOnHold();
        });
    }

    routeTo(callId, endpoint) {
        return this.entityRepository.load(Call, callId).then((call) => {
            call.routeTo(endpoint);
        });
    }

    answer(callId, answeredByEndpoint) {
        return this.entityRepository.load(Call, callId).then((callRoute) => {
            callRoute.answer(answeredByEndpoint);
        });
    }

    endCall(callId) {
        return this.entityRepository.load(Call, callId).then((call) => {
            call.end();
        });
    }
}

exports.CallInitiatedEvent = CallInitiatedEvent;
exports.CallPlacedOnHoldEvent = CallPlacedOnHoldEvent;
exports.CallRoutedEvent = CallRoutedEvent;
exports.CallAnsweredEvent = CallAnsweredEvent;
exports.CallEndedEvent = CallEndedEvent;
exports.Call = Call;
exports.CallService = CallService;