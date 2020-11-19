# Based on: https://github.com/Zenika/alpine-chrome/blob/1c83b6318b2cfdfa4699156785807282a18debc7/with-node/Dockerfile
FROM zenika/alpine-chrome

# Install Node and deps
USER root
RUN apk add --no-cache tini make gcc g++ python3 git nodejs nodejs-npm yarn busybox-suid
COPY root/ /
RUN chown chrome /etc/crontabs/chrome
RUN crontab -u chrome /etc/crontabs/chrome

# puppeteer stuff
USER chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 1
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser
WORKDIR /usr/src/app
COPY --chown=chrome package.json package-lock.json ./
RUN npm install
COPY --chown=chrome . ./

# scheduled jobs stuff
# ...

# puppeteer stuff (cont.)
ENTRYPOINT ["tini", "--"]
CMD ["node", "src/index.js"]
