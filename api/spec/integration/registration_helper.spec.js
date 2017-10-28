const registrationHelper = require('../../src/integration/registration_helper');

describe('registration_helper', () => {
    describe('when a registration is received', () => {
        describe('when it is not expired', () => {
            it('returns an active registration', () => {
                registrationHelper({
                    action: 'register',
                    caller: '1001',
                    ct: Buffer.from('<sip:1001@127.0.0.1>;expires=300', 'ascii').toString('base64')
                }, (agentId, activeRegistrations) => {
                    expect(activeRegistrations.length).toBe(1);
                });
            });
        });
        describe('when a different contact is passed', () => {
            it('does not impact existing contacts', () => {
                registrationHelper({
                    action: 'register',
                    caller: '1001',
                    ct: Buffer.from('<sip:1001@127.0.0.1;rinstance=123>;expires=0', 'ascii').toString('base64')
                }, (agentId, activeRegistrations) => {
                    expect(activeRegistrations.length).toBe(1);
                });
            });
        });
        describe('when it is expired', () => {
            it('returns no active registrations', () => {
                registrationHelper({
                    action: 'register',
                    caller: '1001',
                    ct: Buffer.from('<sip:1001@127.0.0.1>;expires=0', 'ascii').toString('base64')
                }, (agentId, activeRegistrations) => {
                    expect(activeRegistrations.length).toBe(0);
                });
            });
        });
    });
});