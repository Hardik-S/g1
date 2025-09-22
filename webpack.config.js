const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { homepage = '' } = require('./package.json');

const resolvedHomepagePath = (() => {
  if (!homepage) {
    return '';
  }

  try {
    return new URL(homepage).pathname.replace(/\/$/, '');
  } catch (error) {
    return homepage.replace(/\/$/, '');
  }
})();

const PUBLIC_URL = process.env.PUBLIC_URL ?? resolvedHomepagePath;

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.PUBLIC_URL': JSON.stringify(PUBLIC_URL || ''),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: (() => {
        const patterns = [
          { from: path.resolve(__dirname, 'src/apps/hexa-snake'), to: 'hexa-snake' },
          { from: path.resolve(__dirname, 'src/apps/cat-typing-speed-test'), to: 'apps/cat-typing-speed-test' },
          { from: path.resolve(__dirname, 'src/apps/cosmos'), to: 'apps/cosmos' },
          { from: path.resolve(__dirname, 'src/apps/zen-go'), to: 'apps/zen-go' },
        ];

        const cacheLabSource = [
          path.resolve(__dirname, 'src/apps/cache-lab/dist'),
          path.resolve(__dirname, 'apps/cache-lab/dist'),
        ].find(fs.existsSync);
        if (cacheLabSource) {
          patterns.push({ from: cacheLabSource, to: 'cache-lab' });
        }

        return patterns;
      })(),
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'public'),
      },
      {
        directory: path.join(__dirname, 'src/apps'),
        publicPath: '/apps',
      },
      {
        directory: path.join(__dirname, 'src/apps/hexa-snake'),
        publicPath: '/hexa-snake',
      },
    ],
    compress: true,
    port: 3000,
    open: true,
  },
};
