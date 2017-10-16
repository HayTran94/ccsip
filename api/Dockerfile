FROM node:latest

WORKDIR /opt/app

RUN apt-get update && apt-get -y install netcat

ADD . /opt/app
RUN npm install --unsafe-perm

COPY ./run.sh /run.sh
RUN chmod +x /run.sh

CMD /run.sh