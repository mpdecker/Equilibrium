import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { platform } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const isWin = platform() === "win32";
const gradlew = join(androidDir, isWin ? "gradlew.bat" : "gradlew");

if (!existsSync(gradlew)) {
  console.error("Gradle wrapper not found at", gradlew);
  process.exit(1);
}

const result = spawnSync(gradlew, ["bundleRelease", "--no-daemon"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWin,
});

process.exit(result.status ?? 1);
