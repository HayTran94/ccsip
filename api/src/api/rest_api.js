const projections = require('../core/projections');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

module.exports = (port, agentService) => {

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
        const agents = agentService.findAgents().filter(agent => {
            return agent.status === 'available';
        }).map(agent => {
            return agent.id
        });
        res.send(agents.length === 0
            ? 'queue'
            : agents[Math.floor(Math.random() * agents.length)]);
    });

    app.get('/interactions', (req, res) => {
        res.json(projections.listInteractions().map(formatInteraction));
    });

    app.get('/calls', (req, res) => {
        res.json(projections.listCalls().map(formatInteraction));
    });

    app.listen(port);

};

const formatInteraction = (call) => {
    return Object.assign({}, call, {
        startedOn: formatDateTimestamp(call.startedOn),
        answeredOn: formatDateTimestamp(call.answeredOn),
        endedOn: formatDateTimestamp(call.endedOn)
    });
};

const formatDateTimestamp = (timestamp) => {
    return timestamp && timestamp !== null ? {
        timestamp: timestamp,
        date: formatDate(timestamp)
    } : null;
};

const formatDate = (timestamp) => {
    return timestamp && timestamp !== null ? new Date(timestamp).toUTCString() : '';
};