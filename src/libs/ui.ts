import hotkeys from 'hotkeys-js';

export const initShortCuts = (arg: {
  move: (command: 'up' | 'down' | 'left' | 'right', isShift: boolean) => void;
  remove: () => void;
  esc: () => void;
  copy: () => void;
  paste: () => void;
  redo: () => void;
  undo: () => void;
  save: () => void;
}) => {
  const up = 'up';
  const shiftUp = 'shift+up';
  const down = 'down';
  const shiftDown = 'shift+down';
  const left = 'left';
  const shiftLeft = 'shift+left';
  const right = 'right';
  const shiftRight = 'shift+right';

  const rmWin = 'backspace';
  const rmMac = 'delete';
  const esc = 'esc';
  const copyWin = 'ctrl+c';
  const copyMac = 'command+c';
  const pasteWin = 'ctrl+v';
  const pasteMac = 'command+v';
  const redoWin = 'ctrl+y';
  const redoMac = 'shift+command+z';
  const undoWin = 'ctrl+z';
  const undoMac = 'command+z';
  const saveWin = 'ctrl+s';
  const saveMac = 'command+s';

  const keys = [
    up,
    shiftUp,
    down,
    shiftDown,
    left,
    shiftLeft,
    right,
    shiftRight,
    rmMac,
    rmWin,
    esc,
    copyWin,
    copyMac,
    pasteWin,
    pasteMac,
    redoWin,
    redoMac,
    undoWin,
    undoMac,
    saveWin,
    saveMac,
  ];

  /* eslint complexity: ["error", 22]*/
  hotkeys(keys.join(), (_, handler) => {
    switch (handler.shortcut) {
      case up:
      case shiftUp:
        arg.move('up', hotkeys.shift);
        break;
      case down:
      case shiftDown:
        arg.move('down', hotkeys.shift);
        break;
      case left:
      case shiftLeft:
        arg.move('left', hotkeys.shift);
        break;
      case right:
      case shiftRight:
        arg.move('right', hotkeys.shift);
        break;
      case rmWin:
      case rmMac:
        arg.remove();
        break;
      case esc:
        arg.esc();
        break;
      case copyWin:
      case copyMac:
        arg.copy();
        break;
      case pasteWin:
      case pasteMac:
        arg.paste();
        break;
      case redoWin:
      case redoMac:
        arg.redo();
        break;
      case undoWin:
      case undoMac:
        arg.undo();
        break;
      case saveWin:
      case saveMac:
        arg.save();
        break;
      default:
        break;
    }
  });
};

export const destroyShortCuts = () => {
  hotkeys.unbind();
};

const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

export const readFiles = (files: FileList | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && files !== null) {
        r(e.target.result);
      }
    });
    if (files !== null && files[0]) {
      readFile(files[0], type).then((data) => r(data));
    }
  });
};
