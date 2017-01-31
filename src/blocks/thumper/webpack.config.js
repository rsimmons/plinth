var webpack = require('webpack');

module.exports = {
  entry: './entry.js',
  output: {
    path: __dirname,
    filename: 'bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      },
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        negate_iife: false, // NOTE: This is required since output bundle is a block-class-expression intended to be eval()'d
      }
    }),
  ]
};
