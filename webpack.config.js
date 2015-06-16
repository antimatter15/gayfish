var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  debug: true,
  entry: {
    carbide: [
      'webpack-dev-server/client?http://localhost:4000',
      'webpack/hot/only-dev-server',
      './src/index'
    ],
    cylon: [
      './vm/cylon'
    ]
  },
  node: {
    fs: "empty",
    net: "empty",
    module: "empty"
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/static/'
  },
  plugins: [
      // new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin()
  ],
  resolve: {
    extensions: ['', '.js', '.jsx', '.json']
  },
  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    }, {
      test: /\.jsx?$/,
      loaders: ['babel?stage=0&optional=runtime'],
      include: path.join(__dirname, 'vm')
    },
    { test: /semver\.browser\.js/, loaders: ['imports?define=>undefined'] },
    {
      test: /\.jsx?$/,
      loaders: ['react-hot', 'babel?stage=0'],
      include: path.join(__dirname, 'src')
    }, {
      test: /\.jsx?$/,
      include: [
                path.join(__dirname, 'node_modules/react-split-pane'),
                path.join(__dirname, 'node_modules/tern')
               ],
      loader: 'babel'
    }, {
      test: /\.(less|css)$/,
      loader: "style-loader!css-loader!less-loader"
    }]
  }
};