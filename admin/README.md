
faucet admin
============

Client-side react app for interacting with faucet's `/admin` endpoints. The app is only targeting latest Chrome on desktop for now.


Development
-----------

To start a live-reloading development server set the env var `REACT_APP_SERVER_ADDRESS` to point to your local faucet instance (usually `http://localhost:3001/admin`) and run `yarn start`.

```
REACT_APP_SERVER_ADDRESS="http://localhost:3001/admin" yarn start
```

*Make sure to run `yarn lint` before committing new changes.*


Testing
-------

Unit tests are run in a headless environment started with `yarn test`, set the env var `CI` if you wish to disable the live-reloading feature and have the test suite exit with an appropriate code after the run.

Any file suffixed with `.test.(ts|tsx)` will be considered and loaded.

```
yarn test
```


Production
----------

In production the app is pre-built and served via faucet, see faucet's Dockerfile for more information. To build a local copy of the client you can run `yarn build`, output will be in the `./build` directory.

```
yarn build
```
