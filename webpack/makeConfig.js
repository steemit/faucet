// import ExtractTextPlugin, { extract } from 'extract-text-webpack-plugin';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { _defaults } from '../helpers/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULTS = {
  isDevelopment: process.env.NODE_ENV !== 'production',
  baseDir: join(__dirname, '..'),
};

function makePlugins(options) {
  const isDevelopment = options.isDevelopment;

  let plugins = [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV':
        isDevelopment
          ? JSON.stringify('development')
          : JSON.stringify('production'),
    }),
  ];

  if (isDevelopment) {
    plugins = plugins.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
    ]);
  } else {
    plugins = plugins.concat([
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      // new ExtractTextPlugin('../css/base.css'),
    ]);
  }

  return plugins;
}

function makeOptimization(options) {
  const isDevelopment = options.isDevelopment;
  let optimization = {
    minimize: true,
    splitChunks: {
      chunks: 'all',
    },
  };
  if (isDevelopment) {
    // do something
  } else {
    optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          sourceMap: true,
          compress: {
            warnings: false,
          },
        },
        extractComments: false,
      }),
    ];
  }
  return optimization;
}

function makeStyleLoaders(options) {
  if (options.isDevelopment) {
    return [
    ];
  }

  return [
  ];
}

function makeConfig(options) {
  if (!options) options = {}
  _defaults(options, DEFAULTS);

  const isDevelopment = options.isDevelopment;

  return {
    devtool: isDevelopment ? 'cheap-eval-source-map' : 'source-map',
    mode: isDevelopment ? 'development' : 'production',
    entry: (
      isDevelopment ? ['webpack-hot-middleware/client?reload=true'] : []
    ).concat([join(options.baseDir, 'src/index.js')]),
    output: {
      path: join(options.baseDir, '/public/js'),
      filename: isDevelopment ? 'app.min.js' : 'app.min.[chunkhash:5].js',
      publicPath: '/js/',
    },
    plugins: makePlugins(options),
    optimization: makeOptimization(options),
    module: {
      rules: [
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
        },
        {
          test: /\.json?$/,
          loader: 'json-loader',
        },
        {
          test: /\.(eot|ttf|woff|woff2)(\?.+)?$/,
          use: {
            loader: 'file-loader',
            options: {
              name: '[name].[chunkhash].[ext]',
            },
          },
        },
      ].concat(makeStyleLoaders(options)),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    makeConfig({
      isDevelopment: process.env.NODE_ENV !== 'production',
    })
  );
}

export default makeConfig;
