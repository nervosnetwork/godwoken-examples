# Godwoken Examples

## Install dependencies & Build

```bash
yarn && yarn run build-all
```

## Update Tools Configs

Firstly copy config files.

```bash
cp <your godwoken `scripts-deploy-result.json`> packages/tools/src/configs/scripts-deploy-result.json
cp <your godwoken `config.toml`> packages/tools/src/configs/godwoken-config.json (convert config.toml to json format)
```

For testnet

```bash
yarn run generate-testnet-configs
```

## Account operations

Run `account-cli.js --help` to see how to `deposit`, `deposit-sudt`, `transfer` and `withdraw`.

```bash
LUMOS_CONFIG_FILE=<your lumos config file path> node ./packages/tools/lib/account-cli.js --help # for devnet
node ./packages/tools/lib/account-cli.js --help # for testnet
```
