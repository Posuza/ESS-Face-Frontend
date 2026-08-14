// Minimal ambient declarations to help CI/type-checking when JS/JSON modules
declare module '*.js';
declare module '*.jsx';
declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'html2pdf.js';

// config JS modules without types
declare module '../config/api.config' {
  export const API_URL: any;
  export const API_CONFIG: any;
}

// Project-wide lightweight types to unblock build — replace with real types later
type SectorReport = any;
type SubView = string | 'main' | 'pdfviewer';
