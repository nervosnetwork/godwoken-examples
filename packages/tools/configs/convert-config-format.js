const TOML = require('@iarna/toml')
const path = require("path")
const fs = require("fs")

const configPath = path.resolve(__dirname, "./godwoken-config.toml")
const targetJsonPath = path.resolve(__dirname, "./godwoken-config.json")

const str = fs.readFileSync(configPath)
const obj = TOML.parse(str)

const json = JSON.stringify(obj, null, 2);

fs.writeFileSync(targetJsonPath, json);
