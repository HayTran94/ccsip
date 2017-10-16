const projections = require('../core/projections');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

module.exports = (port, agentService, callService) => {

    app.post('/command', (req, res) => {
        const cmd = req.body;
        let promise = null;
        switch (cmd.name) {
            case 'AssignAgentExtension':
                promise = agentService.assignExtension(cmd.agentId, cmd.extension);
                break;
            case 'MakeAgentOffline':
                promise = agentService.makeOffline(cmd.agentId);
                break;
            case 'MakeAgentAvailable':
                promise = agentService.makeAvailable(cmd.agentId);
                break;
            case 'InitiateCall':
                promise = callService.initiateCall(cmd.callId, cmd.from, cmd.to);
                break;
            case 'EndCall':
                promise = callService.endCall(cmd.callId);
                break;
            case 'HoldCall':
                promise = callService.placeOnHold(cmd.callId);
                break;
            case 'AnswerCall':
                promise = callService.answer(cmd.callId, cmd.answeredByEndpoint);
                break;
            default:
                promise = Promise.resolve();
        }
        promise.then(() => {
            res.json({status: 200});
        }).catch(err => {
            res.json({status: 500, error: err.message});
        });
    });

    app.get('/agents', (req, res) => {
        res.json(agentService.findAgents().map(agent => {
            return Object.assign({}, agent, {
                calls: projections.findAgentCalls((agent.id))
                    .map(formatCall)
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