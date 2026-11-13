/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

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
