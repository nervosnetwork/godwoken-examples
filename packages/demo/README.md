# godwoken demo

## Update config

Firstly, copy your godwoken `runner_config.json` to `packages/demo/src/configs/runner_config.json`, and copy `packages/demo/src/configs/config.json.sample` to `packages/demo/src/configs/config.json`, then update your own config.

## Demo

### Compile

```
yarn workspace @godwoken-examples/godwoken tsc
yarn workspace @godwoken-examples/demo clean && yarn workspace @godwoken-examples/demo build
```

### Start server

```
yarn workspace @godwoken-examples/demo start
```

### Open in browser

Open `http://lcoalhost:9000/html/index.html`


## Demo CLI

### Compile

```
yarn workspace @godwoken-examples/godwoken tsc
yarn workspace @godwoken-examples/demo clean-cli && yarn workspace @godwoken-examples/demo build-cli
```

### Deposit

```
LUMOS_CONFIG_FILE=<your lumos config json file> && ./packages/demo/build-cli/cli/deposit.js --help
```

### Deposit SUDT

```
LUMOS_CONFIG_FILE=<your lumos config json file> && ./packages/demo/build-cli/cli/deposit_sudt.js --help
```
