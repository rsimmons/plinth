var path = require('path');
var webpack = require('webpack');

module.exports = (entry, outputPath) => ({
  entry: entry,
  output: {
    path: outputPath,
    filename: 'bundle.js',
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, '../node_modules')],
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
      {
        test: /\.html$/,
        loader: 'html-loader',
        query: {
          minimize: true
        }
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.optimize.UglifyJsPlugin({
      // NOTE: The following is required if we want output bundle to be a expression intended to be eval()'d
      // compress: {
      //   negate_iife: false,
      // }
    }),
  ],
});
