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
