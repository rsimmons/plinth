module.exports = {
  entry: {
    'programmatic': './src/programmatic.js',
    'rack': './src/rack.js',
  },
  output: {
    path: __dirname,
    filename: 'build/[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['es2015', 'react'],
          plugins: ['transform-object-rest-spread'],
        },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
/*
      {
        test: /\.css$/,
        loader: 'style!css',
      },
*/
      {
        test: /\.svg/,
        loader: 'svg-url-loader',
        options: {},
      },
    ]
  },
};
