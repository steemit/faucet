# Steem faucet

## Install
Download and install Node.js >= 7.7.1 then run
```
yarn install
```

## Init database
Set up and run migrations directly from the terminal using Sequelize CLI. Here is how to do:
```
yarn exec -- sequelize db:migrate --url 'mysql://username:password@hostname:port/database'
```

If your local db server does not support SSL, change the `ssl` option to `false` in `db/config/config.json`.

## Configure

Copy `.env.example` to `.env` and edit as needed.

## Run
```
env $(tr "\\n" " " < .env) yarn start
```

The app listens on port 3000 by default.

## Docker

A Dockerfile is supplied. You will need to configure the app with environment variables.
See the file [.env.example](.env.example) for a full list of what you will need.

When running the Docker image locally, you will probably need to bind your mysqld to not only localhost
but also the IP used in Docker's network. You can then specify this IP in `DATABASE_URL`.

You can build and start the Docker image like this:

```
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
docker build -t="$USER/faucet:$BRANCH" .
docker run -it -p 3000:3000 --env-file=.env "$USER/faucet:$BRANCH"
```
