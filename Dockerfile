FROM node:8-alpine

RUN apk add --update git

WORKDIR /app
ADD . /app
RUN yarn install --frozen-lockfile
RUN yarn run test

# prune modules
RUN yarn install --frozen-lockfile --production

ENV NODE_ENV=production

ENTRYPOINT [ "yarn", "start" ]
