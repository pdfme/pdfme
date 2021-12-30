declare module '*.css';
declare module '*.svg';
declare module '*.ttf';

declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.module.scss' {
  const content: { [className: string]: string };
  export = content;
}
