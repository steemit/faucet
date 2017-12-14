FROM node:8-alpine

ENV NODE_ENV=production

RUN apk add --update git

WORKDIR /app
ADD . /app
RUN yarn install --frozen-lockfile
RUN yarn run test

ENTRYPOINT [ "yarn", "start" ]
