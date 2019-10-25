var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: path.join(__dirname, 'src/index.jsx'),
  output: {
      path: path.join(__dirname, 'dist'),
      filename: 'bundle.js'
  },
  resolve: {
    extensions: [".js", ".jsx"]
  }, 
  module: {
      rules: [{
          test: /\.jsx??/,
          exclude: /(node_modules|bower_components)/,
          use:    {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react'],
                plugins: ["@babel/plugin-proposal-class-properties"]
              }
          },
      }] 
  },
  stats: {
      colors: true
  },
  devtool: 'source-map',
  optimization: {
        minimize: false
  }
};
 
 
