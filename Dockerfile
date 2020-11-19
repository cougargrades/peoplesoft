# Based on: https://github.com/Zenika/alpine-chrome/blob/1c83b6318b2cfdfa4699156785807282a18debc7/with-node/Dockerfile
FROM zenika/alpine-chrome

# Setup foundation
USER root
## For multiple running processes
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.1.0.2/s6-overlay-amd64-installer /tmp/
RUN chmod +x /tmp/s6-overlay-amd64-installer && /tmp/s6-overlay-amd64-installer /
COPY root/ /
## Node deps
RUN apk add --no-cache make gcc g++ python3 git nodejs nodejs-npm yarn redis
RUN npm install -g ts-node typescript


# Puppeteer stuff
# USER chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 1
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser
ENV NPM_CONFIG_PREFIX=/home/chrome/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
WORKDIR /usr/src/app
COPY --chown=chrome package.json package-lock.json ./
RUN npm install
COPY --chown=chrome . ./
RUN npx --prefix . ttsc

# Container setup
EXPOSE 1234/tcp
VOLUME /config
ENTRYPOINT ["/init"]
