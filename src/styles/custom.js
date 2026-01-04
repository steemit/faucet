import { theme } from 'antd';
import { green, red, yellow, generate } from '@ant-design/colors';

// the configs you will use in the design token
const primaryColor = '#1720C9';
const primaryColors = generate(primaryColor);
// Background color for `<body>`
// const bodyBackground = '#fff';
// Base background color for most components
// const componentBackground = '#fff';
// const fontFamily =
//   'Whitney, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif';
// const codeFamily = 'Consolas, Menlo, Courier, monospace';
// const headingColor = '#202020';
// const textColor = 'fade(#000, 45%)';
// const textColorSecondary = 'fade(#000, 43%)';
// const headingColorDark = 'fade(#fff, 97%)';
// const textColorDark = 'fade(#fff, 91%)';
// const textColorSecondaryDark = 'fade(#fff, 67%)';
// const fontSizeBase = '18px';
// const fontSizeLg = '20px';
// const lineHeightBase = '1.4';
// const borderRadiusBase = '4px';
// const borderRadiusSm = '2px';

// const backgroundColorBase = '#f7f7f7'; // @background-color-active: #eee;
// const outlineBlurSize = '0'; // @outline-blur-size      : 0;

export const getCustomDesignToken = () => {
  return {
    hashed: false,
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: primaryColor,
      colorInfo: primaryColor,
      colorSuccess: green[5],
      colorError: red[5],
      colorHighlight: red[5],
      colorWarning: yellow[5],
      controlItemBgActive: primaryColors[0],
      controlItemBgHover: primaryColors[0],
      colorLink: primaryColor,
      colorLinkHover: primaryColors[4],
      colorLinkActive: primaryColors[6],
    },
  };
};
