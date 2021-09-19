const path = require('path');

module.exports = {
  mode: 'development',

  entry: {
    'index': './src/index.js'
  },

	output: {
		path: path.join(__dirname, 'docs'),
		filename: '[name].js'
	},

  watchOptions: {
    ignored: [
      '/node_modules/'
    ]
  },

  devServer: {
    static: {
      directory: path.join(__dirname, 'docs'),
      watch: true
    }
  }
};
