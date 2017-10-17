const interaction = require('./interaction');

class CallInitiatedEvent extends interaction.InteractionInitiatedEvent {
    constructor(fromPhoneNumber, toPhoneNumber) {
        super('voice');
        this.fromPhoneNumber = fromPhoneNumber;
        this.toPhoneNumber = toPhoneNumber;
    }
}

class Call extends interaction.Interaction {
    constructor(id) {
        super(id, (self, event) => {
            if (event instanceof CallInitiatedEvent) {
                this.phoneNumber = event.phoneNumber;
            }
        });
    }

    initiate(fromPhoneNumber, toPhoneNumber) {
        this.dispatch(this.id, new CallInitiatedEvent(fromPhoneNumber, toPhoneNumber));
    }

}

class CallService extends interaction.InteractionService {
    constructor(entityRepository) {
        super(entityRepository, Call);
    }

    initiateCall(callId, fromPhoneNumber, toPhoneNumber) {
        return this.entityRepository.load(Call, callId).then((call) => {
            call.initiate(fromPhoneNumber, toPhoneNumber);
        });
    }
}

exports.CallInitiatedEvent = CallInitiatedEvent;
exports.Call = Call;
exports.CallService = CallService;