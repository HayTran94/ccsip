const calls = require('../../src/core/call');
require('../spec_helper');

describe('call', () => {
    let call;
    beforeEach(() => {
        call = new calls.Call('1234');
        call.dispatch = jest.fn((id, event) => {
            call.apply(event);
        });
    });
    it('can initiate a call', () => {
        call.initiate('a','b');
        expect(call.dispatch).toBeCalledWith('1234', new calls.CallInitiatedEvent('a','b'));
    });
});