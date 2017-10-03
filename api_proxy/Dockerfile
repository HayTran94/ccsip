FROM million12/haproxy:1.7.9

RUN wget -O /tmp/consul_template.tgz https://releases.hashicorp.com/consul-template/0.19.3/consul-template_0.19.3_linux_amd64.tgz && \
    cd /tmp && \
    tar -xzvf /tmp/consul_template.tgz && \
    ls -R /tmp && \
    ln -s /tmp/consul-template /usr/bin/consul-template && \
    consul-template --version

COPY haproxy.cfg.tpl /tmp/haproxy.cfg.tpl

COPY ./run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]