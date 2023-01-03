declare module '*.svg';

declare module '*.png' {
  const value: any;
  export = value;
}
