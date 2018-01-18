FROM node:8-alpine

RUN apk add --update git

WORKDIR /app
ADD . /app

RUN yarn install --frozen-lockfile

RUN yarn run test

# prune modules
RUN yarn install --frozen-lockfile --production

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD [ "./bin/run-prod" ]
