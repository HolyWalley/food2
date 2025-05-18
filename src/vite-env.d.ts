/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_REMOTE_DB_URL?: string;
  // Add other environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// TypeScript definitions for Credential Management API
interface Window {
  PasswordCredential?: {
    new(options: {
      id: string;
      password: string;
      name?: string;
    }): PasswordCredential;
  };
}

interface PasswordCredential extends Credential {
  type: 'password';
  id: string;
  password: string;
}
