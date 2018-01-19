FROM node:8-alpine

RUN apk add --update git

WORKDIR /app

# copy package and lockfile
COPY package.json yarn.lock ./

# install dependencies
RUN yarn install --frozen-lockfile

# copy rest of app
COPY . .

# run package tests
RUN yarn run test

# set node env for webpack build
ENV NODE_ENV production

# build webpack bundle
RUN yarn run build

# prune modules
RUN yarn install --frozen-lockfile --production

# run on port 3000
ENV PORT 3000
EXPOSE 3000
CMD [ "node", "bin/www" ]
