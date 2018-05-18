FROM node:9-alpine as build-stage

WORKDIR /app

# install build dependencies
RUN apk add --no-cache \
    git

# install application dependencies
COPY package.json yarn.lock ./
RUN JOBS=max yarn install --non-interactive --frozen-lockfile

# copy in application source
COPY . .

# run tests and compile sources
RUN yarn test

# set node env for webpack build
ENV NODE_ENV production

# build webpack bundle
RUN yarn build

# prune modules
RUN yarn install --non-interactive --frozen-lockfile --production

# build and test admin interface
FROM node:9-alpine as admin-stage
COPY admin /app/admin
WORKDIR /app/admin
ENV REACT_APP_SERVER_ADDRESS /admin
RUN JOBS=max yarn install --non-interactive --frozen-lockfile && \
    CI=1 yarn test && \
    yarn build

# copy built application to runtime image
FROM node:9-alpine
WORKDIR /app
COPY --from=build-stage /app/app.js app.js
COPY --from=build-stage /app/constants.js constants.js
COPY --from=build-stage /app/bad-domains.js bad-domains.js
COPY --from=build-stage /app/bin bin
COPY --from=build-stage /app/countries.json countries.json
COPY --from=build-stage /app/db db
COPY --from=build-stage /app/GeoIP2-Country.mmdb GeoIP2-Country.mmdb
COPY --from=build-stage /app/helpers helpers
COPY --from=build-stage /app/node_modules node_modules
COPY --from=build-stage /app/public public
COPY --from=build-stage /app/routes routes
COPY --from=build-stage /app/src src
COPY --from=build-stage /app/views views
COPY --from=admin-stage /app/admin/build public/admin

# run on port 3001
ENV NODE_ENV production
ENV PORT 3001

CMD [ "node", "bin/www" ]
