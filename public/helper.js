const size = { height: 1200, width: 1200 };
const domContainer = document.getElementById('app');

const getSampleTemplate = () => ({
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  basePdf: LabelmakeUi.blankPdf,
  // basePdf: '/DeliveryNote.pdf',
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
  const SauceHanSansJP = await fetch('/SauceHanSansJP.ttf').then((res) => res.arrayBuffer());
  const SauceHanSerifJP = await fetch('/SauceHanSerifJP.ttf').then((res) => res.arrayBuffer());
  return {
    'Noto Sans JP': { data: SauceHanSansJP, fallback: false },
    'Noto Serif JP': { data: SauceHanSerifJP, fallback: true },
  };
};
