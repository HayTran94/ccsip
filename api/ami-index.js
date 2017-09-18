const DISABLED = process.env.DISABLED;
const EXTERNAL_ADDR = process.env.EXTERNAL_ADDR || 'ccsip.open-cc.org';
const ari = require('ari-client');
const dns = require('dns');
const stringify = require('json-stringify-safe');

if('true' == DISABLED) {
    console.log('ari app disabled');
    process.exit(0);
}

var AmiIo = require("ami-io"),
    amiio = AmiIo.createClient({port:5038, host:EXTERNAL_ADDR, login:'asterisk', password:'asterisk'});

amiio.on('incorrectServer', function () {
    amiio.logger.error("Invalid AMI welcome message. Are you sure if this is AMI?");
    process.exit();
});
amiio.on('connectionRefused', function(){
    amiio.logger.error("Connection refused.");
    process.exit();
});
amiio.on('incorrectLogin', function () {
    amiio.logger.error("Incorrect login or password.");
    process.exit();
});
amiio.on('event', function(event){
    amiio.logger.info('event:', event);
});
amiio.connect();
amiio.on('connected', function(){
    setTimeout(function(){
        amiio.disconnect();
        amiio.on('disconnected', process.exit());
    },30000);
});