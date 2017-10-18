const BaseEntityRepository = require('ddd-es-node').BaseEntityRepository;

exports.es = (callback) => {
    let _handlers = [];
    const eventBus = {
        emit(event, streamId) {
            if (streamId) {
                event.streamId = streamId;
            }
            _handlers.forEach(handler => handler(event));
        },
        subscribe(handler) {
            _handlers.push(handler);
        }
    };
    const eventDispatcher = (streamId, events) => {
        events.forEach((event) => {
            event.streamId = streamId;
            eventBus.emit(event);
        });
        return Promise.resolve(events);
    };
    const eventStore = {
        replay(id, handler, done) {
            if (done) {
                done();
            }
        },
        replayAll(handler, done) {
            if (done) {
                done();
            }
        }
    };
    const entityRepository = new BaseEntityRepository(eventDispatcher, eventStore);
    return callback({
        eventBus,
        entityRepository,
        eventDispatcher,
        eventStore
    });
};