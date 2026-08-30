/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANSCRIPTION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
