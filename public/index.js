const size = { height: window.innerHeight, width: window.innerWidth };
const domContainer = document.getElementById('app');

const getSampleTemplate = () => ({
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  fontName: '',
  basePdf: LabelmakeUi.blankPdf,
  schemas: [
    {
      field1: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: 'text',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
        alignment: 'left',
        fontSize: 20,
        characterSpacing: 0,
        lineHeight: 1,
      },
    },
  ],
});

const getTemplate = () => {
  return JSON.parse(localStorage.getItem('template')) || getSampleTemplate();
};

const getFont = async () => {
  // TODO { label: defaultFontLabel, value: defaultFontValue } の形じゃないのが若干統一感がない
  const SauceHanSansJP = await fetch('/SauceHanSansJP.ttf').then((res) => res.arrayBuffer());
  return { 'Noto Sans JP': SauceHanSansJP };
};
