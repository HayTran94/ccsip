const projections = require('../core/projections');
const interactions = require('../core/interaction');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

module.exports = (port, agentService, chatService, eventStore) => {

    app.get('/agents', (req, res) => {
        res.json(agentService.findAgents().map(agent => {
            return Object.assign({}, agent, {
                interactions: projections.findAgentInteractions((agent.id))
                    .map(formatInteraction)
            });
        }));
    });

    app.get('/route', (req, res) => {
        console.log('routeparams', req.query);
        if (req.query.dest) {
            const dest = Buffer.from(req.query.dest, 'base64').toString();
            console.log('dest', dest);
        }
        if (req.query.from) {
            const from = Buffer.from(req.query.from, 'base64').toString();
            console.log('from', from);
        }
        const agents = agentService.findAvailableAgents({
            channel: 'voice'
        }).map(agent => {
            return agent.id
        });
        // bypass this
        res.send('queue');
        /**
         res.send(agents.length === 0
         ? 'queue'
         : agents[Math.floor(Math.random() * agents.length)]);
         */
    });

    app.post('/route/:interactionId', (req, res) => {
        const interactionId = req.params.interactionId;
        const channel = req.body.channel;
        const queue = req.body.queue;
        if(channel === 'chat') {
            chatService.routeTo(interactionId, `queue:${queue}`);
        }
        res.json({});
    });

    app.get('/interactions', (req, res) => {
        res.json(projections.listInteractions().map(formatInteraction));
    });

    app.get('/interactions/:channel', (req, res) => {
        res.json(projections.listInteractions(req.params.channel).map(formatInteraction));
    });

    app.get('/events', (req, res) => {
        const events = [];
        eventStore.replayAll((event) => {
            events.push(event);
        }, () => {
            res.json(events.map(event => {
                if (event instanceof interactions.InteractionEvent) {
                    const interaction = projections.findInteraction(event.streamId);
                    if (interaction) {
                        return Object.assign({}, event, {
                            interaction: interaction
                        });
                    }
                }
                return event;
            }));
        });
    });

    app.post('/chat/:chatId', (req, res) => {
        chatService.postMessage(req.params.chatId, req.body.from, req.body.message)
            .then(() => {
                res.json({});
            });
    });

    app.listen(port);

};

const formatInteraction = (interaction) => {
    return Object.assign({}, interaction, {
        startedOn: formatDateTimestamp(interaction.startedOn),
        answeredOn: formatDateTimestamp(interaction.answeredOn),
        endedOn: formatDateTimestamp(interaction.endedOn)
    });
};

const formatDateTimestamp = (timestamp) => {
    return timestamp && timestamp !== null ? {
        timestamp: timestamp,
        date: formatDate(timestamp)
    } : {};
};

const formatDate = (timestamp) => {
    return timestamp && timestamp !== null ? new Date(timestamp).toUTCString() : '';
};