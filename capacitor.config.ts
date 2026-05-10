import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.equilibrium.sound",
  appName: "Equilibrium",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
  },
  android: {},
};

export default config;
