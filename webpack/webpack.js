import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import webpackConfig from './webpack.config.js';

export default function (app) {
  const compiler = webpack(webpackConfig);
  app.use(webpackMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    writeToDisk: true,
    stats: {
      colors: true,
      timings: true,
    },
  }));
  app.use(webpackHotMiddleware(compiler));
};
