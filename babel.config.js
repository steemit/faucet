export default {
  presets: [
    '@babel/preset-env',
    [
      '@babel/preset-react',
      {
        development: process.env.NODE_ENV === 'development',
        runtime: 'automatic',
      },
    ],
  ],
  plugins: [
    // When @babel/plugin-transform-runtime plugin is enabled, 
    // the useBuiltIns option in @babel/preset-env must not be set.
    // Otherwise, this plugin may not able to completely sandbox the environment.
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-json-modules',
  ],
};