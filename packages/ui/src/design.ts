import { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    fontSize: 11,
    margin: 8,
    marginLG: 12,
    marginXS: 4,
    padding: 8,
    paddingLG: 12,
    paddingXS: 4,
  },
  components: {
    Form: {
      itemMarginBottom: 8,
      verticalLabelPadding: '0 0 2px',
    },
  },
};

const background = 'rgb(74, 74, 74)';
export const style = {
  ErrorScreen: {
    background,
    cardBackground: '#ffffffad',
  },
  Root: {
    background,
  },
};
