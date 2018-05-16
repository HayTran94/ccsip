const contactLocations = {};

module.exports = (command, callback) => {
    if (command.action === 'register') {
        if (command.ct) {
            const ctStr = Buffer.from(command.ct, 'base64').toString();
            const matches = /<([^>]+)>(;?(.*))?/.exec(ctStr);

            if (matches !== null) {
                const contactParts = matches[1].split(';');
                const contact = contactParts[0];
                const ctVars = (matches[3] ? matches[3].split(';') : [])
                    .concat(contactParts[1] ? contactParts[1].split(';') : []).reduce((prev, cur) => {
                        if (cur.indexOf('=') > -1) {
                            const parts = cur.split('=');
                            prev[parts[0]] = parts[1];
                        } else {
                            prev[cur] = true;
                        }
                        return prev;
                    }, {});

                const registrationId = ctVars.rinstance || contact;

                if (ctVars.expires) {
                    command.expires = ctVars.expires;
                }

                contactLocations[command.caller] = contactLocations[command.caller] || {};
                contactLocations[command.caller][registrationId] = contactLocations[command.caller][registrationId] || {};
                contactLocations[command.caller][registrationId].lastmodified = new Date().getTime();
                contactLocations[command.caller][registrationId].active = command.expires !== '0' && command.expires !== '<null>';

                console.log('CLS: ' + JSON.stringify(contactLocations[command.caller], null, 2));

                callback(command.caller, Object.keys(contactLocations[command.caller])
                    .map(registrationId => {
                        return contactLocations[command.caller][registrationId];
                    })
                    .filter((contactLocation) => {
                        return contactLocation.active;
                    }));
            } else {
                console.log('ctStr does not match: ' + ctStr);
            }
        }
    }
};