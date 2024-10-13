// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js', // Entry point of your app
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'chatbot.js',
    library: 'ChatbotLibrary', // Make it available globally
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
