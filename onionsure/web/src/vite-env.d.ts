/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional API host override, e.g. https://api.onionsure.in — defaults to the Vite dev proxy `/api`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
