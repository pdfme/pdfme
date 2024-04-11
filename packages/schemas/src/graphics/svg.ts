import { Plugin, Schema } from '@pdfme/common';
import { XMLValidator } from 'fast-xml-parser';
import { convertForPdfLayoutProps, isEditable, addAlphaToHex, createErrorElm } from '../utils.js';

const isValidSVG = (svgString: string) => XMLValidator.validate(svgString) === true;

const defaultValue = `<svg viewBox="0 0 488 600" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1,0,0,1,-56,0)" fill="#000000" stroke="none">
        <path d="M228.667,0L56,172.667L56.267,345.334L56.667,518L59.733,527.334C65.867,545.467 72.933,557.067 86,570.134C96.133,580.4 100,583.2 110.667,588.4C134.533,600.134 120,599.334 300,599.334C480,599.334 465.467,600.134 489.334,588.4C500,583.2 503.867,580.4 514,570.134C527.334,556.8 534.534,544.8 540.267,526.667L543.334,516.667L543.334,83.333L540.267,73.333C534.534,55.2 527.334,43.2 514,29.867C503.867,19.6 500,16.8 489.334,11.6C465.734,0 475.467,0.8 344.667,0.267L228.667,0ZM466.4,41.6C483.334,48.933 496.267,61.867 502.934,78.4L506,86L506,514L502.934,521.734C496,538.934 480.267,553.867 463.334,559.334C455.6,561.867 450.8,562 300,562C149.2,562 144.4,561.867 136.667,559.334C119.733,553.867 104,538.934 97.067,521.734L94,514L93.6,351.067L93.333,188.133L149.067,187.733L204.667,187.333L213.6,182.933C224.8,177.467 235.867,165.867 240.267,155.067C243.333,147.467 243.333,146.4 243.733,92.267L244.133,37.2L458,38L466.4,41.6ZM195.067,304C175.6,306.8 164,320.667 165.6,339.467C166,343.6 167.6,348.667 169.733,352.4C174.4,360.267 185.2,365.734 201.867,368.534C208.4,369.734 215.067,371.467 216.8,372.667C224,377.334 221.467,389.067 212.533,392C205.6,394.4 193.733,392.934 185.6,388.8C173.333,382.534 164,385.334 164,395.2C164,400.934 170.133,406.667 180.267,410.134C190.933,413.867 217.067,413.734 225.467,409.867C238.933,403.6 246.667,390 244.8,375.6C242.667,359.734 232.8,351.334 212.267,347.867C193.6,344.8 189.333,342.4 189.333,334.533C189.333,324.267 201.867,320.933 218.267,326.667C228.667,330.267 232.533,330.133 235.867,325.867C242.133,318 237.6,310.667 224.267,306.8C213.333,303.6 204.267,302.8 195.067,304ZM386,304.133C377.6,305.333 374,306.8 367.334,311.6C355.734,320.133 351.2,336.4 352.4,365.334C353.2,385.334 356,394.4 364.134,402.534C372.267,410.667 381.734,413.734 396.667,413.067C406.8,412.667 409.734,412 415.734,408.667C429.2,401.334 434.534,390.934 435.6,370.667C436.4,353.734 436,353.067 420.934,352.267C401.867,351.334 396,353.467 396,361.867C396,367.867 399.467,370.667 407.067,370.667C413.2,370.667 413.334,370.667 413.334,374.934C413.334,394 386.267,400.534 378.534,383.467C374.934,375.334 374.934,341.867 378.534,333.733C382,326.4 387.467,323.467 396.8,324.267C403.067,324.8 404.667,325.6 410.534,331.067C414.267,334.533 418.4,337.333 419.867,337.333C427.334,337.333 433.334,330.267 431.334,323.733C427.2,310.133 406.4,301.2 386,304.133ZM258.4,308C255.067,311.467 254.533,312.8 255.2,316.4C257.067,326.667 285.333,405.867 288.133,408.8C289.733,410.534 293.067,412.267 295.333,412.8C303.867,414.4 310.667,407.867 314.4,394.667C315.067,392.134 321.2,374.134 327.867,354.8C334.8,334.533 340,317.467 340,314.533C340,303.733 325.067,299.867 319.867,309.467C318.533,312.133 309.467,340.933 302.667,364C301.067,369.467 299.333,374.4 298.8,375.067C298.267,375.6 292.933,360.8 286.933,342C275.333,306 274.133,304 266.267,304C263.867,304 261.067,305.467 258.4,308Z" style="fill-rule:nonzero;"/>
    </g>
</svg>`;

interface SVGSchema extends Schema {}

const svgSchema: Plugin<SVGSchema> = {
  ui: (arg) => {
    const { rootElement, value, mode, onChange, theme, schema } = arg;
    const container = document.createElement(isEditable(mode, schema) ? 'textarea' : 'div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.boxSizing = 'border-box';
    if (isEditable(mode, schema)) {
      const textarea = container as HTMLTextAreaElement;
      textarea.value = value;
      textarea.style.position = 'absolute';
      textarea.style.backgroundColor = addAlphaToHex(theme.colorPrimaryBg, 30);

      if (isValidSVG(value)) {
        const svgElement = new DOMParser().parseFromString(value, 'text/xml').childNodes[0];
        if (svgElement instanceof SVGElement) {
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.style.position = 'absolute';
        }
        rootElement.appendChild(svgElement);
      } else if (value) {
        const errorElm = createErrorElm();
        errorElm.style.position = 'absolute';
        rootElement.appendChild(errorElm);
      }

      textarea.addEventListener('change', (e: Event) => {
        const newValue = (e.target as HTMLTextAreaElement).value;
        onChange && onChange({ key: 'content', value: newValue });
      });
      rootElement.appendChild(container);
      textarea.setSelectionRange(value.length, value.length);
      textarea.focus();
    } else {
      if (!value) return;
      if (!isValidSVG(value)) {
        rootElement.appendChild(createErrorElm());
        return;
      }
      container.innerHTML = value;
      const svgElement = container.childNodes[0];
      if (svgElement instanceof SVGElement) {
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        rootElement.appendChild(container);
      }
    }
  },
  pdf: async (arg) => {
    const { page, schema, value } = arg;
    if (!value || !isValidSVG(value)) return;
    const pageHeight = page.getHeight();
    const { width, height, position } = convertForPdfLayoutProps({ schema, pageHeight });
    const { x, y } = position;
    await page.drawSvg(value, { x, y: y + height, width, height });
  },
  propPanel: {
    schema: {},
    defaultSchema: {
      type: 'svg',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-route"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
      content: defaultValue,
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
    },
  },
};

export default svgSchema;

export const readOnlySvg: Plugin<SVGSchema> = {
  pdf: svgSchema.pdf,
  ui: svgSchema.ui,
  propPanel: {
    ...svgSchema.propPanel,
    defaultSchema: {
      ...svgSchema.propPanel.defaultSchema,
      type: 'readOnlySvg',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-route-off"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5c.4 0 .9-.1 1.3-.2"/><path d="M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12"/><path d="m2 2 20 20"/><path d="M21 15.3a3.5 3.5 0 0 0-3.3-3.3"/><path d="M15 5h-4.3"/><circle cx="18" cy="5" r="3"/></svg>',
      readOnly: true,
    },
  },
};
