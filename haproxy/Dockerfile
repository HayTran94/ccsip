FROM million12/haproxy:1.7.9

RUN yum -y install certbot

RUN wget -O /tmp/consul_template.tgz https://releases.hashicorp.com/consul-template/0.19.3/consul-template_0.19.3_linux_amd64.tgz && \
    cd /tmp && \
    tar -xzvf /tmp/consul_template.tgz && \
    ls -R /tmp && \
    ln -s /tmp/consul-template /usr/bin/consul-template && \
    consul-template --version

RUN mkdir -p /www/.well-known/acme-challenge

COPY ./run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]