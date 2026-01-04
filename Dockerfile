FROM node:20-alpine AS build-stage

WORKDIR /app

# set CI environment variable for pnpm
ENV CI=true

# install build dependencies and CA certificates
RUN apk add --no-cache \
    git \
    ca-certificates

# install application dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# copy in application source
COPY . .

# run tests and compile sources
RUN pnpm test

# set node env for webpack build
ENV NODE_ENV=production

# build webpack bundle
RUN pnpm build

# prune modules
RUN pnpm install --frozen-lockfile --prod

# copy built application to runtime image
FROM node:20-alpine
WORKDIR /app

# install CA certificates in runtime image
RUN apk add --no-cache ca-certificates
COPY --from=build-stage /app/app.js app.js
COPY --from=build-stage /app/constants.js constants.js
COPY --from=build-stage /app/bad-domains.js bad-domains.js
COPY --from=build-stage /app/bin bin
COPY --from=build-stage /app/db db
COPY --from=build-stage /app/GeoIP2-Country.mmdb GeoIP2-Country.mmdb
COPY --from=build-stage /app/helpers helpers
COPY --from=build-stage /app/node_modules node_modules
COPY --from=build-stage /app/public public
COPY --from=build-stage /app/routes routes
COPY --from=build-stage /app/src src
COPY --from=build-stage /app/views views
COPY --from=build-stage /app/webpack webpack

# run on port 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD [ "node", "bin/www" ]
