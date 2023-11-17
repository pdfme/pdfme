import { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    fontSize: 14,
    margin: 8,
    marginLG: 12,
    marginXS: 4,
    padding: 8,
    paddingLG: 12,
    paddingXS: 4,
  },
  components: {
    Form: {
      fontSize: 12,
      itemMarginBottom: 4,
      verticalLabelPadding: '0 0 2px',
    },
  },
};

const background = 'rgb(74, 74, 74)';
const controllerBackground = '#777777bd';
const controllerTextColor = '#ffffff';
const controllerStyle = {
  textColor: controllerTextColor,
  background: controllerBackground,
  icon: {
    color: controllerTextColor,
    size: 19,
  },
  height: 38,
};
export const style = {
  ErrorScreen: {
    background,
    cardBackground: '#ffffffad',
  },
  Root: {
    background,
  },
  UnitPager: controllerStyle,
  CtlBar: { ...controllerStyle, barWidth: 360 },
};
