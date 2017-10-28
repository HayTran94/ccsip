FROM efacilitation/docker-janus-webrtc-gateway

RUN sed -i 's|80|81|g' /000-default.conf
RUN sed -i 's|80|81|g' /etc/apache2/ports.conf
RUN sed -i 's|:8088||g' /opt/janus/share/janus/demos/siptest.js
RUN sed -i 's|:8089||g' /opt/janus/share/janus/demos/siptest.js
RUN ./apache.sh

CMD ./startup.sh