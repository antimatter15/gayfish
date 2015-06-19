var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'eval',
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
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin(),
      new webpack.ProgressPlugin(function(percentage, msg) {
        var state = msg;
        if(percentage < 1) {
          percentage = Math.floor(percentage * 100);
          msg = percentage + "% " + msg;
          if(percentage < 100) {
            msg = " " + msg;
          }
          if(percentage < 10) {
            msg = " " + msg;
          }
        }
        goToLineStart(msg);
        process.stderr.write(msg);
      })
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
    { test: /\.(md|jpe?g|gif|png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' },
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

var chars = 0, lastState, lastStateTime;
function goToLineStart(nextMessage) {
  var str = "";
  for(; chars > nextMessage.length; chars--) {
    str += "\b \b";
  }
  chars = nextMessage.length;
  for(var i = 0; i < chars; i++) {
    str += "\b";
  }
  if(str) process.stderr.write(str);
}