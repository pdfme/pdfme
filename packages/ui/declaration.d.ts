declare module '*.css';
declare module '*.svg';
declare module '*.ttf';

declare module '*.png' {
  const value: any;
  export = value;
}
