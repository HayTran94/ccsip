const ari = require('ari-client');
const dns = require('dns');
const superagent = require('superagent');

let client = null;

exports.init = (asteriskHost, asteriskUser, asteriskSecret) => {
    client = client || new Promise((resolve, reject) => {
            const init = (host, maxAttempts, attempt) => {
                const ariEndpoint = `http://${host}:8088`;
                console.log(`Attempting to connect to ${ariEndpoint}`);
                attempt = typeof attempt === 'undefined' ? 0 : attempt;
                superagent
                    .get(`${ariEndpoint}/ari/api-docs/resources.json`)
                    .auth(asteriskUser, asteriskSecret)
                    .then(() => {
                        ari.connect(
                            ariEndpoint,
                            asteriskUser,
                            asteriskSecret, (err, ari) => {
                                // todo error handling
                                resolve(ari);
                            });
                    })
                    .catch((err) => {
                        if (maxAttempts === attempt) {
                            reject(err);
                        } else {
                            setTimeout(() => {
                                init(host, maxAttempts, attempt + 1)
                            }, 1000);
                        }
                    });
            };
            init(asteriskHost, 500);
        });
    return {
        get: (callback) => {
            client.then(callback);
        }
    }
};

exports.playSound = (client, sound, channel) => {
    return new Promise((resolve, reject) => {
        var playback = client.Playback();
        channel.play({media: `sound:${sound}`}, playback, (err, playbackInst) => {
            if (err) {
                reject(err);
            } else {
                resolve(playbackInst);
            }
        });
    });
};

exports.playSounds = (client, sounds, channel) => {
    return Promise.all(sounds.map((sound) => exports.playSound(client, sound, channel)));
};

exports.stopSound = (client, sound) => {
    sound = typeof sound === 'string' ? { id: sound } : sound;
    return new Promise((resolve) => {
        client.playbacks.stop(
            {playbackId: sound.id},
            (err) => {
                if (err && JSON.parse(err.message).message !== 'Playback not found') {
                    console.log('error stopping sound', err);
                }
                resolve(sound);
            }
        );
    });
};

exports.stopSounds = (client, sounds) => {
    return Promise.all(sounds.map((sound) => {
        return exports.stopSound(client, sound)
    }));
};

exports.originate = (client, endpointToDial, channel, opts) => {
    opts = opts || {};

    const dialed = client.Channel();

    channel.on('StasisEnd', (event, channel) => {
        hangupDialed(channel, dialed);
    });

    dialed.on('ChannelDestroyed', (event, dialed) => {
        hangupOriginal(channel, dialed);
    });

    dialed.on('StasisStart', (event, dialed) => {
        joinMixingBridge(client, channel, dialed, opts);
    });

    dialed.originate(
        {endpoint: endpointToDial, app: 'bridge-dial', appArgs: 'dialed'},
        (err, dialed) => {
            if (err) {
                throw err;
            }
        });
};

// handler for original channel hanging up so we can gracefully hangup the
// other end
const hangupDialed = (channel, dialed) => {
    console.log(
        'Channel %s left our application, hanging up dialed channel %s',
        channel.name, dialed.name);

    // hangup the other end
    dialed.hangup((err) => {
        // ignore error since dialed channel could have hung up, causing the
        // original channel to exit Stasis
    });
};

// handler for the dialed channel hanging up so we can gracefully hangup the
// other end
const hangupOriginal = (channel, dialed) => {
    console.log('Dialed channel %s has been hung up, hanging up channel %s',
        dialed.name, channel.name);

    // hangup the other end
    channel.hangup((err) => {
        // ignore error since original channel could have hung up, causing the
        // dialed channel to exit Stasis
    });
};

// handler for dialed channel entering Stasis
const joinMixingBridge = (client, channel, dialed, opts) => {
    opts = opts || {};

    const bridge = client.Bridge();

    dialed.on('StasisEnd', (event, dialed) => {
        dialedExit(dialed, bridge);
    });

    dialed.answer((err) => {
        if (err) {
            throw err;
        }
        if(opts.onAnswer) {
            opts.onAnswer();
        }
        console.log('agent picked up');
    });

    bridge.create({type: 'mixing'}, (err, bridge) => {
        if (err) {
            throw err;
        }
        console.log('Created bridge %s', bridge.id);
        addChannelsToBridge(channel, dialed, bridge);
    });
};

// handler for the dialed channel leaving Stasis
const dialedExit = (dialed, bridge) => {
    console.log(
        'Dialed channel %s has left our application, destroying bridge %s',
        dialed.name, bridge.id);

    bridge.destroy((err) => {
        if (err) {
            throw err;
        }
    });
};

// handler for new mixing bridge ready for channels to be added to it
const addChannelsToBridge = (channel, dialed, bridge) => {
    console.log('Adding channel %s and dialed channel %s to bridge %s',
        channel.name, dialed.name, bridge.id);

    bridge.addChannel({channel: [channel.id, dialed.id]}, (err) => {
        if (err) {
            throw err;
        }
    });
};