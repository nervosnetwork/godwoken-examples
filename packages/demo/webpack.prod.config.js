const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

if (process.env.NODE_ENV !== 'production') {
  console.log('Looks like we are in development mode!');
}

module.exports = merge(common, {
  mode: "production",
  devtool: 'source-map',
});
