var ari = require('ari-client');
ari.connect(
    'http://45.55.128.63:8088',
    'asterisk',
    'asterisk', (err, ari) => {
       ari.applications.list().then(states => {
           console.log(states);
       });
    });