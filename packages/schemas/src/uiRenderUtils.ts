import type * as CSS from 'csstype';

export const readFile = (input: File | FileList | null): Promise<string | ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result);
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('[@pdfme/schemas] File reading failed'));
    };

    let file: File | null = null;
    if (input instanceof FileList && input.length > 0) {
      file = input[0];
    } else if (input instanceof File) {
      file = input;
    }

    if (file) {
      fileReader.readAsDataURL(file);
    } else {
      reject(new Error('[@pdfme/schemas] No files provided'));
    }
  });

export const createErrorElm = () => {
  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  };
  Object.assign(container.style, containerStyle);

  const span = document.createElement('span');
  const spanStyle: CSS.Properties = {
    color: 'white',
    background: 'red',
    padding: '0.25rem',
    fontSize: '12pt',
    fontWeight: 'bold',
    borderRadius: '2px',
  };
  Object.assign(span.style, spanStyle);

  span.textContent = 'ERROR';
  container.appendChild(span);

  return container;
};
