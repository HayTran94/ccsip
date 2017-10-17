const interaction = require('./interaction');
const ddd = require('ddd-es-node');
const EntityEvent = ddd.Entity;

class ChatInitiatedEvent extends interaction.InteractionInitiatedEvent {
    constructor(from, initialMessage) {
        super('chat');
        this.from = from;
        this.initialMessage = initialMessage;
    }
}

class ChatMessagePostedEvent extends EntityEvent {
    constructor(from, to, message) {
        super();
        this.from = from;
        this.to = to;
        this.message = message;
    }
}

class Chat extends interaction.Interaction {
    constructor(id) {
        super(id, (self, event) => {
            if (event instanceof ChatInitiatedEvent) {
                this.originator = event.from;
            }
        });
    }

    initiate(from, initialMessage) {
        this.dispatch(this.id, new ChatInitiatedEvent(from, initialMessage));
    }

    postMessage(from, message) {
        this.dispatch(this.id,
            new ChatMessagePostedEvent(from, from === this.originator ? 'inbound' : this.originator, message));
    }
}

class ChatService extends interaction.InteractionService {
    constructor(entityRepository) {
        super(entityRepository, Chat);
    }

    initiateChat(chatId, from, initialMessage) {
        return this.entityRepository.load(Chat, chatId).then((chat) => {
            chat.initiate(from, initialMessage);
        });
    }

    postMessage(chatId, from, message) {
        return this.entityRepository.load(Chat, chatId).then((chat) => {
            chat.postMessage(from, message);
        });
    }

}

exports.ChatInitiatedEvent = ChatInitiatedEvent;
exports.ChatMessagePostedEvent = ChatMessagePostedEvent;
exports.Chat = Chat;
exports.ChatService = ChatService;