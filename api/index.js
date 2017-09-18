const DISABLED = process.env.DISABLED;
const EXTERNAL_ADDR = process.env.EXTERNAL_ADDR || 'ccsip.open-cc.org';
const ariUser = 'asterisk';
const ariSecret = 'asterisk';
const ari = require('ari-client');
const dns = require('dns');
const superagent = require('superagent');
const stringify = require('json-stringify-safe');

if('true' == DISABLED) {
    console.log('ari app disabled');
    process.exit(0);
}

const init = (host, maxAttempts, attempt) => {
    if(isNaN(host[0])) {
        dns.resolve(host, (err, resolved) => {
            console.log(resolved);
            init(resolved[0], maxAttempts, attempt);
        });
    } else {
        const ariEndpoint = `http://${host}:8088`;
        console.log(`Attempting to connect to ${ariEndpoint}`);
        attempt = typeof attempt === 'undefined' ? 0 : attempt;
        superagent
            .get(`${ariEndpoint}/ari/api-docs/resources.json`)
            .auth(ariUser, ariSecret)
            .then(() => {
                ari.connect(
                    ariEndpoint,
                    ariUser,
                    ariSecret, (err, ari) => {
                        clientLoaded(err, ari);
                    });
            })
            .catch(() => {
                setTimeout(() => {
                    init(host, maxAttempts, attempt + 1)
                }, 1000);
            });
    }
};

init(EXTERNAL_ADDR, 500);

const util = require('util');

const playSound = (client, sound, channel) => {
    return new Promise((resolve, reject) => {
        var playback = client.Playback();
        channel.play({media: `sound:${sound}`}, (err, playbackInst) => {
            if(err) {
                reject(err);
            } else {
                resolve(playbackInst);
            }
        });
    });
};

// handler for client being loaded
function clientLoaded (err, client) {
    if (err) {
        throw err;
    }

    // handler for StasisStart event
    function stasisStart(event, channel) {
        // ensure the channel is not a dialed channel
        var dialed = event.args[0] === 'dialed';

        console.log('isdialed', dialed);

        if (!dialed) {
            channel.answer(function(err) {
                if (err) {
                    throw err;
                }

                console.log('Channel %s has entered our application', channel.name);

                setTimeout(() => {
                    playSound(client, 'queue-periodic-announce', channel)
                        .then(() => {
                            playSound(client, '00_starface-music-8', channel)
                                .then((holdMusic) => {

                                    const findEndpoint = () => {
                                        console.log('Checking for available endpoint');
                                        client.endpoints.list().then((endpoints) => {
                                            const matchingEndpoints = endpoints.filter((ep) => {
                                                return ep.resource === '1001' && ep.state === 'online';
                                            });
                                            if(matchingEndpoints.length === 0) {
                                                console.log('No endpoints found');
                                                setTimeout(() => {
                                                    findEndpoint();
                                                }, 1000);
                                            } else {
                                                const endpoint = matchingEndpoints[0];
                                                originate(`${endpoint.technology}/${endpoint.resource}`, channel, holdMusic);
                                            }
                                        });
                                    };
                                    findEndpoint();

                                });
                        });
                }, 500);

            });
        }
    }

    function originate(endpointToDial, channel, holdMusic) {
        var dialed = client.Channel();

        channel.on('StasisEnd', function(event, channel) {
            hangupDialed(channel, dialed);
        });

        dialed.on('ChannelDestroyed', function(event, dialed) {
            hangupOriginal(channel, dialed);
        });

        dialed.on('StasisStart', function(event, dialed) {
            joinMixingBridge(channel, dialed, holdMusic);
        });

        dialed.originate(
            {endpoint: endpointToDial, app: 'bridge-dial', appArgs: 'dialed'},
            function(err, dialed) {
                if (err) {
                    throw err;
                }
            });
    }

    // handler for original channel hanging up so we can gracefully hangup the
    // other end
    function hangupDialed(channel, dialed) {
        console.log(
            'Channel %s left our application, hanging up dialed channel %s',
            channel.name, dialed.name);

        // hangup the other end
        dialed.hangup(function(err) {
            // ignore error since dialed channel could have hung up, causing the
            // original channel to exit Stasis
        });
    }

    // handler for the dialed channel hanging up so we can gracefully hangup the
    // other end
    function hangupOriginal(channel, dialed) {
        console.log('Dialed channel %s has been hung up, hanging up channel %s',
            dialed.name, channel.name);

        // hangup the other end
        channel.hangup(function(err) {
            // ignore error since original channel could have hung up, causing the
            // dialed channel to exit Stasis
        });
    }

    // handler for dialed channel entering Stasis
    function joinMixingBridge(channel, dialed, holdMusic) {
        var bridge = client.Bridge();

        dialed.on('StasisEnd', function(event, dialed) {
            dialedExit(dialed, bridge);
        });

        dialed.answer(function(err) {
            if (err) {
                throw err;
            }
            console.log('agent picked up');

            client.playbacks.stop(
                {playbackId: holdMusic.id},
                function (err) {
                    console.log(err);
                }
            );
        });

        bridge.create({type: 'mixing'}, function(err, bridge) {
            if (err) {
                throw err;
            }

            console.log('Created bridge %s', bridge.id);

            addChannelsToBridge(channel, dialed, bridge);
        });
    }

    // handler for the dialed channel leaving Stasis
    function dialedExit(dialed, bridge) {
        console.log(
            'Dialed channel %s has left our application, destroying bridge %s',
            dialed.name, bridge.id);

        bridge.destroy(function(err) {
            if (err) {
                throw err;
            }
        });
    }

    // handler for new mixing bridge ready for channels to be added to it
    function addChannelsToBridge(channel, dialed, bridge) {
        console.log('Adding channel %s and dialed channel %s to bridge %s',
            channel.name, dialed.name, bridge.id);

        bridge.addChannel({channel: [channel.id, dialed.id]}, function(err) {
            if (err) {
                throw err;
            }
        });
    }

    client.on('StasisStart', stasisStart);

    client.start('bridge-dial');
}