const calls = require('../../src/core/call');
const clock = require('ddd-es-node/dist/src/core/clock').Clock;

describe('call', () => {
    let call;
    beforeEach(() => {
        clock.freeze();
        call = new calls.Call('1234');
        call.dispatch = jest.fn((id, event) => {
            call.apply(event);
        });
    });
    afterEach(() => {
        clock.unfreeze();
    });
    it('can initiate a call', () => {
        call.initiate('a','b');
        expect(call.dispatch).toBeCalledWith('1234', new calls.CallInitiatedEvent('a','b'));
    });
});