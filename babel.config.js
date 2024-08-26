export default {
  parallel: true,
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {node: 'current'},
      },
    ],
    '@babel/preset-react',
  ],
  plugins: [
    // When @babel/plugin-transform-runtime plugin is enabled, 
    // the useBuiltIns option in @babel/preset-env must not be set.
    // Otherwise, this plugin may not able to completely sandbox the environment.
    '@babel/plugin-transform-runtime',
  ],
};