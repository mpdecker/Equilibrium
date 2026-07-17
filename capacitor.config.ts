import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Phase C shell + Phase D ship scaffolding + Phase E pre-submit harden.
 *
 * The Capacitor WebView loads the same Vite `dist/` build as the web app —
 * Tone / worklet / preview engines are unchanged. Native code is limited to
 * shell plugins (App, Haptics, StatusBar) and platform packaging.
 */
const config: CapacitorConfig = {
  appId: "app.equilibrium.sound",
  appName: "Equilibrium",
  webDir: "dist",
  server: {
    /** Matches CORS_ORIGINS guidance (`https://localhost`). */
    androidScheme: "https",
    iosScheme: "capacitor",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    backgroundColor: "#0a0502",
  },
  android: {
    backgroundColor: "#0a0502",
    allowMixedContent: false,
  },
};

export default config;
