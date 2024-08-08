export default {
  presets: [
    // '@babel/preset-env',
    '@babel/preset-react',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // When @babel/plugin-transform-runtime plugin is enabled, 
    // the useBuiltIns option in @babel/preset-env must not be set.
    // Otherwise, this plugin may not able to completely sandbox the environment.
    '@babel/plugin-transform-runtime',
  ],
};