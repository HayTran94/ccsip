const chats = require('./chat');

module.exports = (eventBus, chatService) => {
    eventBus.subscribe((event) => {
        if (event instanceof chats.ChatMessagePostedEvent) {
            if (event.to === 'inbound') {
                chatService.postMessage(event.streamId, 'system', 'Thanks for your message: ' + event.message);
            }
        }
    });
};