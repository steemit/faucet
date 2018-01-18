# Steem faucet

## Install
Download and install Node.js >= 7.7.1 then run
```
yarn install
```

## Init database
Set up and run migrations directly from the terminal using Sequelize CLI. Here is how to do:
```
npm install -g sequelize-cli
sequelize db:migrate --url 'mysql://username:password@hostname:port/database'
```

## Run
```
yarn start
```

## Docker

A Dockerfile is supplied. You will need to configure the app with environment variables.
See the file [.env.example.json](.env.example.json) for a full list of what you will need.
