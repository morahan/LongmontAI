/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare namespace React.JSX {
  interface IntrinsicElements {
    'longmont-newsletter-signup': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      source?: string;
      'default-cadence'?: 'weekly' | 'biweekly';
    };
  }
}
