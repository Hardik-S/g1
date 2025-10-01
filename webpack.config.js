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

const cacheLabDir = path.resolve(__dirname, 'src/apps/cache-lab');
const cacheLabWorkspaceDir = path.resolve(__dirname, 'apps/cache-lab');
const relocatedSubAppDirs = [cacheLabDir, cacheLabWorkspaceDir];

const resolveFirstExistingPath = (relativePaths) => {
  for (const relativePath of relativePaths) {
    const candidate = path.resolve(__dirname, relativePath);

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const addCopyPattern = (patterns, relativePaths, to) => {
  const existingPath = resolveFirstExistingPath(relativePaths);

  if (existingPath) {
    patterns.push({ from: existingPath, to });
  }
};

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
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: [/node_modules/, ...relocatedSubAppDirs],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
          }
        }
      },
      {
        test: /\.css$/i,
        exclude: [/node_modules/, ...relocatedSubAppDirs],
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
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
        const patterns = [];

        addCopyPattern(patterns, ['public/hexa-snake', 'src/apps/hexa-snake'], 'hexa-snake');
        addCopyPattern(
          patterns,
          ['src/apps/CatConnectFourApp/public/cat-connect-four'],
          'cat-connect-four'
        );
        addCopyPattern(
          patterns,
          ['apps/cat-typing-speed-test', 'src/apps/cat-typing-speed-test'],
          'apps/cat-typing-speed-test'
        );
        addCopyPattern(patterns, ['apps/cosmos', 'src/apps/cosmos'], 'apps/cosmos');
        addCopyPattern(patterns, ['src/apps/lang-math'], 'apps/lang-math');
        addCopyPattern(patterns, ['apps/zen-go', 'src/apps/zen-go'], 'apps/zen-go');
        addCopyPattern(patterns, ['public/apps/htmlChess'], 'apps/htmlChess');

        const cacheLabSource = path.resolve(__dirname, 'src/apps/cache-lab/dist');
        if (fs.existsSync(cacheLabSource)) {
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
      {
        directory: path.join(__dirname, 'src/apps/CatConnectFourApp/public'),
      },
    ],
    compress: true,
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  },
};
