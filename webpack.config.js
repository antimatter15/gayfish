// var webpack = require('webpack');

// module.exports = {
//   devtool: 'eval',
//   entry: [
//     'webpack-dev-server/client?http://localhost:4000',
//     'webpack/hot/only-dev-server',
//     './static/index'
//   ],
//   output: {
//     path: __dirname + '/static/',
//     filename: 'bundle.js',
//     publicPath: '/static/'
//   },
//   plugins: [
//     new webpack.HotModuleReplacementPlugin(),
//     new webpack.NoErrorsPlugin()
//   ],
//   resolve: {
//     extensions: ['', '.js', '.jsx']
//   },
//   module: {
//     loaders: [
//       { test: /\.jsx?$/, loaders: ['react-hot', 'jsx?harmony'], exclude: /node_modules/ },
//       {
//         test: /\.(less|css)$/,
//         loader: "style-loader!css-loader!less-loader"
//       }
//     ]
//   }
// };

var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'eval',
  entry: [
    'webpack-dev-server/client?http://localhost:3000',
    'webpack/hot/only-dev-server',
    './src/index'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/static/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ],
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loaders: ['react-hot', 'babel'],
      include: path.join(__dirname, 'src')
    }, {
      test: /\.(less|css)$/,
      loader: "style-loader!css-loader!less-loader"
    }]
  }
};