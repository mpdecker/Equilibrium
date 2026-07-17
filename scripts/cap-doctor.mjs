/**
 * Phase D/E local packaging checks for Capacitor storefront.
 * Not a substitute for device QA in docs/MOBILE.md.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function ok(msg) {
  console.log(`  ok  ${msg}`);
}

function fail(msg) {
  errors.push(msg);
  console.error(` FAIL ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(` warn ${msg}`);
}

const dist = join(root, "dist");
if (!existsSync(dist)) {
  fail("dist/ missing — run npm run build first");
} else {
  ok("dist/ present");
}

const worklet = join(dist, "worklets", "equilibrium-dsp-processor.js");
if (!existsSync(worklet)) {
  fail("dist/worklets/equilibrium-dsp-processor.js missing");
} else {
  ok("worklet asset in dist/worklets/");
}

const capConfigPath = join(root, "capacitor.config.ts");
if (!existsSync(capConfigPath)) {
  fail("capacitor.config.ts missing");
} else {
  const cfg = readFileSync(capConfigPath, "utf8");
  if (!cfg.includes('webDir: "dist"') && !cfg.includes("webDir: 'dist'")) {
    fail('capacitor.config.ts webDir must be "dist"');
  } else {
    ok('webDir: "dist"');
  }
  if (!cfg.includes("androidScheme")) {
    warn("androidScheme not found in capacitor.config.ts");
  } else {
    ok("androidScheme configured");
  }
  if (!cfg.includes("iosScheme")) {
    warn("iosScheme not found in capacitor.config.ts");
  } else {
    ok("iosScheme configured");
  }
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const required = [
  "@capacitor/core",
  "@capacitor/cli",
  "@capacitor/app",
  "@capacitor/haptics",
  "@capacitor/status-bar",
  "@capacitor/android",
  "@capacitor/ios",
];
for (const name of required) {
  if (!deps[name]) fail(`package.json missing ${name}`);
  else ok(`dependency ${name}`);
}

if (!existsSync(join(root, "android"))) {
  fail("android/ platform folder missing");
} else {
  ok("android/ present");
}

if (!existsSync(join(root, "ios"))) {
  warn("ios/ platform folder missing — run npm run cap:add:ios on a machine with Capacitor CLI");
} else {
  ok("ios/ present");
  const plist = join(root, "ios", "App", "App", "Info.plist");
  if (existsSync(plist)) {
    const text = readFileSync(plist, "utf8");
    if (text.includes("UIBackgroundModes") && text.includes("audio")) {
      ok("iOS UIBackgroundModes includes audio");
    } else {
      warn("iOS Info.plist missing UIBackgroundModes/audio");
    }
  }
  const privacy = join(root, "ios", "App", "App", "PrivacyInfo.xcprivacy");
  if (!existsSync(privacy)) {
    fail("ios/App/App/PrivacyInfo.xcprivacy missing (Phase E)");
  } else {
    ok("iOS PrivacyInfo.xcprivacy present");
  }
}

const keyExample = join(root, "android", "key.properties.example");
if (!existsSync(keyExample)) {
  warn("android/key.properties.example missing");
} else {
  ok("android/key.properties.example present");
}

const storeReadme = join(root, "store", "README.md");
if (!existsSync(storeReadme)) {
  warn("store/README.md missing");
} else {
  ok("store/README.md present");
}

console.log("");
if (errors.length) {
  console.error(`cap:doctor failed (${errors.length} error(s), ${warnings.length} warning(s))`);
  process.exit(1);
}
console.log(`cap:doctor passed (${warnings.length} warning(s)) — still run Phase D device QA on hardware`);
process.exit(0);
