/**
 * Turns one chosen ghost candidate (assets/candidates/<LABEL>.png) into every
 * image asset Expo needs, replacing the template art in assets/images/.
 *
 *   bun run icons            # uses the first candidate found alphabetically
 *   bun run icons B2         # uses that specific candidate
 *
 * The candidate must be a full-bleed square on the deep-navy background
 * (#0E2038). The background is keyed out for foreground / monochrome /
 * splash derivatives.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const CANDIDATES_DIR = path.join(root, "assets", "candidates");
const IMAGES_DIR = path.join(root, "assets", "images");
const LABELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const BG = { r: 0x0e, g: 0x20, b: 0x38 };
const TOLERANCE = 60;

const label = process.argv[2]?.toUpperCase();
let file;
if (label) {
  file = path.join(CANDIDATES_DIR, `${label}.png`);
  if (!existsSync(file)) die(`Candidate ${label}.png not found in ${CANDIDATES_DIR}`);
} else {
  const found = LABELS.map((l) => path.join(CANDIDATES_DIR, `${l}.png`)).filter(existsSync);
  if (found.length === 0) {
    die(
      `No candidates found in ${CANDIDATES_DIR}\n` +
        `Drop A1..C2.png there first (see docs/icon-candidates.md), then rerun.`,
    );
  }
  file = found[0];
}
const usedLabel = path.basename(file, ".png");
console.log(`[icons] source: ${path.relative(root, file)} (${usedLabel})`);

mkdirSync(IMAGES_DIR, { recursive: true });

/** Key out the navy background and return tight-cropped RGBA buffer + meta. */
async function ghostCut(srcBuffer) {
  const { data, info } = await sharp(srcBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  let minX = info.width,
    minY = info.height,
    maxX = 0,
    maxY = 0;

  const isBg = (i) => {
    const dr = out[i] - BG.r;
    const dg = out[i + 1] - BG.g;
    const db = out[i + 2] - BG.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) < TOLERANCE;
  };

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (isBg(i)) {
        out[i + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cutW = maxX - minX + 1;
  const cutH = maxY - minY + 1;
  if (cutW <= 0 || cutH <= 0) die("Chroma-key failed - is the candidate on the navy background?");
  console.log(`[icons] ghost bbox ${cutW}x${cutH}`);

  const cut = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cutW, height: cutH })
    .png()
    .toBuffer();

  return cut;
}

/** White silhouette version of the cut ghost (for Android monochrome). */
async function whiteSilhouette(cutBuffer) {
  const { data, info } = await sharp(cutBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += info.channels) {
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

async function main() {
  const srcBuffer = await sharp(file).png().toBuffer();

  // 1. Full-bleed app icon (navy stays part of the art).
  await sharp(srcBuffer).resize(1024, 1024).png().toFile(path.join(IMAGES_DIR, "icon.png"));
  // 2. Favicon from the same art.
  await sharp(srcBuffer).resize(48, 48).png().toFile(path.join(IMAGES_DIR, "favicon.png"));
  // 3. Solid navy adaptive-background layer.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#0E2038" } })
    .png()
    .toFile(path.join(IMAGES_DIR, "android-icon-background.png"));

  // 4-6. Ghost-only layers from the keyed cut.
  const cut = await ghostCut(srcBuffer);
  const white = await whiteSilhouette(cut);

  // Foreground: ghost inside the adaptive-icon safe zone (~66% of 1024).
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(cut).resize(660, 660, { fit: "inside" }).png().toBuffer(), gravity: "center" }])
    .png()
    .toFile(path.join(IMAGES_DIR, "android-icon-foreground.png"));

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(white).resize(660, 660, { fit: "inside" }).png().toBuffer(), gravity: "center" },
    ])
    .png()
    .toFile(path.join(IMAGES_DIR, "android-icon-monochrome.png"));

  // Splash: ghost on transparency, comfortable padding.
  await sharp(cut)
    .resize(512, 512, { fit: "inside" })
    .png()
    .toFile(path.join(IMAGES_DIR, "splash-icon.png"));

  console.log("[icons] wrote icon.png, favicon.png, android-icon-{background,foreground,monochrome}.png, splash-icon.png");
}

function die(msg) {
  console.error(`[icons] ${msg}`);
  process.exit(1);
}

main().catch(die);
