module.exports = {
  entry: "./entry.js",
  output: {
    path: __dirname,
    filename: "bundle.js",
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
        loader: "style!css",
      },
    ]
  },
};
