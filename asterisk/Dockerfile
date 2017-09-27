FROM dougbtv/asterisk14

ADD https://www.starface.de/de/Service/moh/00_starface-music.wav /var/lib/asterisk/sounds/en/00_starface-music.wav

RUN yum -y install sox && \
  sox /var/lib/asterisk/sounds/en/00_starface-music.wav -r 8k -c 1 -e signed-integer -b 16 /var/lib/asterisk/sounds/en/00_starface-music-8.wav

RUN yum -y install nc

ADD ./etc/asterisk /etc/asterisk

COPY ./run.sh /run.sh
RUN chmod +x /run.sh

CMD /run.sh