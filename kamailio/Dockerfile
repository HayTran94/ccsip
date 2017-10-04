FROM centos:centos7

# -------------------- Yum installs

RUN yum update -y
RUN yum install -y epel-release
RUN yum install -y nano wget inotify-tools rsyslog
RUN wget -O /etc/yum.repos.d/kamailio.repo http://download.opensuse.org/repositories/home:/kamailio:/v5.0.x-rpms/CentOS_7/home:kamailio:v5.0.x-rpms.repo
RUN yum install -y kamailio
RUN yum -y install tar

# -------------------- Consul template

RUN wget -O /tmp/consul_template.tgz https://releases.hashicorp.com/consul-template/0.19.3/consul-template_0.19.3_linux_amd64.tgz && \
    cd /tmp && \
    tar -xzvf /tmp/consul_template.tgz && \
    ls -R /tmp && \
    ln -s /tmp/consul-template /usr/bin/consul-template && \
    consul-template --version

# -------------------- Kamailio configs

RUN echo "local0.*                        -/var/log/kamailio.log" >> /etc/rsyslog.conf

RUN echo > /etc/kamailio/dispatcher.list

COPY dispatcher.list.tpl /tmp/dispatcher.list.tpl

COPY ./etc/kamailio/kamailio.cfg /etc/kamailio/kamailio.cfg

COPY ./run.sh /run.sh

RUN chmod +x /run.sh

CMD /run.sh