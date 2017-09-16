# ccsip

ccsip is a programmable SIP based communications service built with [Asterisk](http://www.asterisk.org/) and [Kamailio](https://www.kamailio.org/w/).

## Getting started

##### The following programs are required to run this:
- [git](https://git-scm.com/)
- [jq](https://stedolan.github.io/jq/)

##### Create a SIP Trunk using Twilio
Start by creating a twilio account and configuring an elastic SIP trunk. Instructions can be found [here](https://www.twilio.com/docs/api/sip-trunking/getting-started).

##### Configure your environment
Create a file named `.env` in the project root dir. Inside it `export` the following environment variables: 

- `SIP_TERMINATION_URI` - the twilio SIP trunk termination url (ends with .pstn.twilio.com)
- `SIP_TERMINATION_USER` — a valid user specified in the twilio SIP trunk credentials list
- `SIP_TERMINATION_SECRET` - the password for the twilio SIP trunk user 
- `SIP_EXTENSION_SECRET` — the secret for registering SIP devices
- `TWILIO_ACCOUNT_SID` — your twilio account SID
- `TWILIO_AUTH_TOKEN` — your twilio auth token
- `DIGITALOCEAN_TOKEN` — your DigitalOcean API token

## Deploy

Run deploy.sh up

```shell
./deploy.sh up
```
