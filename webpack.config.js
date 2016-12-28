module.exports = {
  entry: {
    'programmatic': './src/programmatic.js',
    'rack': './src/rack.js',
  },
  output: {
    path: __dirname,
    filename: 'docs/[name].bundle.js',
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
        test: /\.css$/,
        loader: 'style!css',
      },
    ]
  },
};
