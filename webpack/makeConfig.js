import { fileURLToPath } from 'url';
import { join, dirname, resolve } from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import ReactRefreshBabel from 'react-refresh/babel';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import { _defaults, getEnv } from '../helpers/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULTS = {
  isDevelopment: getEnv('NODE_ENV') !== 'production',
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
    new WebpackManifestPlugin({
      fileName: '../manifest.json',
      publicPath: '/js/',
      writeToFileEmit: true, // make sure it effect under dev env.
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/favicon.ico',
          to: '../favicon.ico',
        },
        {
          from: 'src/assets/img',
          to: '../img',
        },
        {
          from: 'src/assets/fonts',
          to: '../fonts',
        },
      ],
    }),
  ];

  if (isDevelopment) {
    plugins = plugins.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      new ReactRefreshWebpackPlugin(),
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
    minimize: false,
    splitChunks: {
      chunks: 'all',
    },
  };
  if (isDevelopment) {
    // do something
  } else {
    optimization.minimize = true;
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
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader',
        ],
      },
    ];
  }

  return [
    {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
      ],
    },
    {
      test: /\.less$/,
      use: [
        'style-loader',
        'css-loader',
        'less-loader',
      ],
    },
  ];
}

function makeConfig(options) {
  if (!options) options = {}
  _defaults(options, DEFAULTS);

  const isDevelopment = options.isDevelopment;

  return {
    devtool: isDevelopment ? 'cheap-module-source-map' : 'source-map',
    devServer: {
      contentBase: resolve(__dirname, 'public'),
      hot: true,
    },
    mode: isDevelopment ? 'development' : 'production',
    entry: {
      app: (
        isDevelopment ? ['webpack-hot-middleware/client?reload=true'] : []
      ).concat([join(options.baseDir, 'src/index.js')]),
    },
    output: {
      path: join(options.baseDir, '/public/js'),
      publicPath: '/js',
      filename: isDevelopment ? '[name].js' : '[name].[chunkhash:5].js',
      chunkFilename: isDevelopment ? '[id].chunk.js' : '[id].chunk.[chunkhash:5].js',
      clean: true,
    },
    plugins: makePlugins(options),
    optimization: makeOptimization(options),
    experiments: {
      topLevelAwait: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              plugins: [
                isDevelopment && ReactRefreshBabel,
              ].filter(Boolean),
            },
          },
        },
        {
          test: /\.json$/,
          type: 'json',
          parser: {
          },
        },
        {
          test: /\.(eot|ttf|woff|woff2)(\?.+)?$/,
          type: 'asset/resource',
          generator: {
            filename: '../fonts/[name].[ext]',
          },
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)(\?.+)?$/,
          type: 'asset/resource',
          generator: {
            filename: '../img/[name].[ext]',
          },
        },
      ].concat(makeStyleLoaders(options)),
    },
  };
}

export default makeConfig;
