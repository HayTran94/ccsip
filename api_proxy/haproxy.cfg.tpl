global
    chroot /var/lib/haproxy
    user haproxy
    group haproxy
    pidfile /var/run/haproxy.pid
    spread-checks 4
    tune.maxrewrite 1024

defaults
    mode    http
    balance roundrobin

    option  dontlognull
    option  dontlog-normal
    option  redispatch

    maxconn 5000
    timeout connect 5s
    timeout client  20s
    timeout server  20s
    timeout queue   30s
    timeout http-request 5s
    timeout http-keep-alive 15s

frontend http-in
bind *:80
    stats enable
    stats refresh 30s
    #stats hide-version
    stats auth admin:admin
    stats uri /admin?stats
    default_backend nodes-http

backend nodes-http
    {{range service "asterisk"}}server {{.Node}} {{.Address}}:9999 check
    {{end}}
