import { spawnSync } from "node:child_process";

const LABELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
for (const L of LABELS) {
  console.log(`=== ${L} ===`);
  const r = spawnSync(process.execPath, ["scripts/make-icons.mjs", L], {
    env: { ...process.env, ICON_OUT_DIR: `assets/previews/${L}` },
    stdio: "inherit",
    timeout: 60_000,
  });
  if (r.status !== 0) {
    console.error(`[previews] ${L} failed with exit ${r.status}`);
    process.exitCode = 1;
  }
}
console.log("done");
