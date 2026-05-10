import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import wabtFactory from "wabt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const watPath = join(root, "wasm", "equilibrium_dsp.wat");
const outDir = join(root, "public", "wasm");
const outPath = join(outDir, "equilibrium_dsp.wasm");

const wat = readFileSync(watPath, "utf8");
const wabt = await wabtFactory();
const mod = wabt.parseWat("equilibrium_dsp.wat", wat);
const { buffer } = mod.toBinary({
  write_debug_names: false,
  log(message) {
    console.error(message);
  },
});
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, Buffer.from(buffer));
console.log("Wrote", outPath);
