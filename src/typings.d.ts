declare module '*.svg';

declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.module.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const content: { [className: string]: string };
  export default content;
}
