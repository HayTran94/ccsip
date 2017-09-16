FROM dougbtv/kamailio

RUN yum -y install tar

RUN wget -O /tmp/consul_template.tgz https://releases.hashicorp.com/consul-template/0.19.3/consul-template_0.19.3_linux_amd64.tgz && \
    cd /tmp && \
    tar -xzvf /tmp/consul_template.tgz && \
    ls -R /tmp && \
    ln -s /tmp/consul-template /usr/bin/consul-template && \
    consul-template --version

RUN echo > /etc/kamailio/dispatcher.list

COPY dispatcher.list.tpl /tmp/dispatcher.list.tpl

COPY ./etc/kamailio/kamailio.cfg /etc/kamailio/kamailio.cfg

COPY ./run.sh /run-alt.sh
RUN chmod +x /run-alt.sh

CMD /run-alt.sh