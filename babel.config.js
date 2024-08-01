export default {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // When this plugin is enabled, 
    // the useBuiltIns option in @babel/preset-env must not be set.
    // Otherwise, this plugin may not able to completely sandbox the environment.
    '@babel/plugin-transform-runtime',
  ],
};