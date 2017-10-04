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
                calls: projections.findAgentCalls((agent.id))
                    .map(formatCall)
            });
        }));
    });

    app.get('/route', (req, res) => {
        const agents = agentService.findAgents().filter(agent => {
            return agent.status === 'available';
        }).map(agent => {
            return agent.id
        });
        res.send(agents.length === 0
            ? 'queue'
            : agents[Math.floor(Math.random() * agents.length)]);
    });

    app.get('/calls', (req, res) => {
        res.json(projections.listCalls().map(formatCall));
    });

    app.listen(port);

};

const formatCall = (call) => {
    return Object.assign({}, call, {
        startedOnDate: formatDate(call.startedOn),
        answeredOnDate: formatDate(call.answeredOn),
        endedOnDate: formatDate(call.endedOn)
    });
};

const formatDate = (timestamp) => {
    return timestamp && timestamp !== null ? new Date(timestamp).toUTCString() : '';
};