# Ghost icon candidates — paste these into your image tool

Run each prompt below **as-is** in GPT Image 2 / Nano Banana Pro / Seedance 5 Pro
(or any strong instruction-following image model). Save results into:

```
apps/mobile/assets/candidates/A1.png   A2.png   B1.png   B2.png   C1.png   C2.png
```

Any square ≥1024px works (1536×1536 ideal, 1254×1254 accepted). Then run:

```bash
bun run icons
```

That keys out the navy background and emits every asset Expo needs
(`icon`, android adaptive fg/bg/monochrome, `splash-icon`, `favicon`),
then pick your favourite set and commit.

---

## A — Sleepy Guardian · cream body + coral accents

### A1 (lower-left)
```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid deep muted navy blue (#0E2038). Keep the navy visible in every open area and in the corners not occupied by the character; the lower-left corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing ghost IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature: two tiny stubby rounded arms raised slightly, as if waving hello.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple oval eyes and one tiny open smile. Remove every nonessential line, outline, anatomical detail, texture, and decoration. The classic wavy ghost hem forms the bottom edge. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: warm cream (#FFF6EC) for the whole body, soft coral (#FF9B8A) reused for both round blush cheeks and the smile, plus the deep muted navy background filling all other space. Keep character, facial marks, and background clearly separated.
Composition: keep the ghost upright and emerging from the lower-left corner, filling about 90% of the square so it remains visually dominant; cropping at the bottom and left edge is welcome. Preserve both stubby arms. Never center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Add an extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

### A2 (lower-right)
Identical to A1 but change the composition line to:
> Composition: keep the ghost upright and emerging from the **lower-right** corner…

---

## B — Comfort Buddy · cream body + teal collar & heart cheeks

### B1 (lower-left)
```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid deep muted navy blue (#0E2038). Keep the navy visible in every open area and in the corners not occupied by the character; the lower-left corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing ghost IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature: a thick rounded teal scarf collar wrapped snugly under its head.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple oval eyes and one tiny calm smile. Two small heart-shaped cheeks sit above the scarf. Remove every nonessential line, outline, anatomical detail, texture, and decoration. The wavy ghost hem forms the bottom edge. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: warm cream (#FFF6EC) for the whole body, soft teal (#59C2B4) forming the scarf collar and reused for both heart cheeks, plus the deep muted navy background filling all other space. Keep character, facial marks, and background clearly separated.
Composition: keep the ghost upright and emerging from the lower-left corner, filling about 90% of the square so it remains visually dominant; cropping at the bottom and left edge is welcome. Preserve both heart cheeks. Never center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Add an extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

### B2 (lower-right)
Same as B1 with the composition line changed to **lower-right**.

---

## C — Night-shift Pal · cream body + lavender nightcap & belly

### C1 (lower-left)
```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid deep muted navy blue (#0E2038). Keep the navy visible in every open area and in the corners not occupied by the character; the lower-left corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing ghost IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature: a soft drooping nightcap with a visibly blunt rounded tip flopping to one side.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple sleepy oval eyes with gentle upper lids and one tiny content smile. Remove every nonessential line, outline, anatomical detail, texture, and decoration. The wavy ghost hem forms the bottom edge; a soft rounded lavender belly patch sits below the face. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: warm cream (#FFF6EC) for the body, soft lavender (#B7A6FF) forming the nightcap and reused for the round belly patch and blush cheeks, plus the deep muted navy background filling all other space. Keep character, facial marks, and background clearly separated.
Composition: keep the ghost upright and emerging from the lower-left corner, filling about 90% of the square so it remains visually dominant; cropping at the bottom and left edge is welcome. Preserve the single blunt-tipped nightcap. Never center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Add an extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

### C2 (lower-right)
Same as C1 with the composition line changed to **lower-right**.

---

## After you drop the files

```bash
bun run icons          # builds all 6 Expo assets into assets/images/
bun start              # see them live
```

Tell me which label you like best (`A1…C2`) — I'll keep that one as the shipped
icon set and archive the rest.
