module.exports = (asteriskHost, asteriskUser, asteriskSecret, opts) => {

    opts = opts || {};

    const Ami = require('ami-io');

    const ami = Ami.createClient({
        port: 5038,
        host: asteriskHost,
        login: asteriskUser,
        password: asteriskSecret,
        logger: new Ami.SilentLogger()
    });

    ami.on('incorrectServer', () => {
        ami.logger.error('Invalid AMI welcome message. Are you sure if this is AMI?');
        process.exit();
    });

    ami.on('connectionRefused', () => {
        ami.logger.error('Connection refused.');
        process.exit();
    });

    ami.on('incorrectLogin', () => {
        ami.logger.error('Incorrect login or password.');
        process.exit();
    });

    ami.on('event', (event) => {
        if (opts.onEvent) {
            opts.onEvent(event);
        }
    });

    ami.connect();

    ami.on('connected', () => {
        ami.logger.info('Connection succeeded');
        if (opts.onConnect) {
            opts.onConnect();
        }
    });
};