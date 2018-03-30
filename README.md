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

To seed the database with seed users:
```
yarn exec -- sequelize db:seed:all --url 'mysql://username:password@hostname:port/database'
```

Seed data can be added at: `db/seeders`

To start a-fresh:
```
yarn exec -- sequelize db:migrate:undo:all --url 'mysql://username:password@hostname:port/database'
```

#### Example one-liner
```
yarn exec -- sequelize db:migrate:undo:all --url 'mysql://root@localhost:3306/faucet' && yarn exec -- sequelize db:migrate --url 'mysql://root@localhost:3306/faucet' && yarn exec -- sequelize db:seed:all --url 'mysql://root@localhost:3306/faucet'
```

## Configure

Copy `.env.example` to `.env` and edit as needed. (`.env-admin.example` for faucet-admin)

## Run
### Faucet:
```
env $(tr "\\n" " " < .env) yarn start-dev # or just start, if you don't want nodemon
```
### Faucet-Admin
```
env $(tr "\\n" " " < .env-admin) node bin/www
```

The app listens on port 3000 by default. (3100 for faucet-admin)

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

## Debugging

#### VSCode:
Add the following to `.vscode/launch.json` configurations array:
```json
  {
    "type": "node",
    "request": "launch",
    "name": "nodemon",
    "runtimeExecutable": "${workspaceRoot}/node_modules/nodemon/bin/nodemon.js",
    "program": "${workspaceFolder}/bin/www",
    "restart": true,
    "sourceMaps": true,
    "outFiles": [],
    "console": "integratedTerminal",
    "internalConsoleOptions": "neverOpen",
    "args": [
        "--ignore src",
        "| bunyan -o short"
    ],
    "envFile": "${workspaceFolder}/.env",
  }
```
