Every image here is generated: `pnpm logo:build` rebuilds the SVGs of `design/jew365-concepts/vector` and then
exports all of the files below with `scripts/logo/export.mjs` (headless Chrome or Edge at exact pixel size). Edit
the generator, never a PNG. All of them are native assets: a change reaches users only with the next build.

The logo is mark `o` of 2026-11-02, traced from the owner's image (`design/references/2026-11-02/logo.jpg`): the
open stopwatch ring with its button and ticks, JEW over 365° in dark navy, an orange bell and an orange open book.
White is `#FFFFFF`, cream is `#F6F1E8`, night is `#0E1626`. Every asset carries the bell and the book, however small
(the owner's rule of 2026-10-22, carried to the mark of 2026-11-02).

- icon.png (1024×1024, RGB, opaque): the launcher icon, the full mark on white, framed as the owner's image frames
  it (its white square is the canvas, `icon.frame` in `mark-o-meta.json`), so the mark nearly fills the icon and
  still clears the iOS rounded-square mask.
- adaptive-icon.png (1024×1024, transparent): the same mark drawn to a radius of 0.255 of the width, well inside
  Android's 66/108 safe circle (0.305), because a Samsung launcher cropped a mark that filled that circle;
  `app.json` supplies the white background.
- adaptive-monochrome.png (1024×1024, transparent): the same layout in black, for Android 13 themed icons, which
  use only its alpha.
- notification-icon.png (96×96, transparent): the full mark as a white silhouette, the bell and the book included,
  about 6 px of padding, square.
- splash.png (1024×1024, transparent): the full mark with all its shapes inside a circle 0.96 of the width,
  because Android 12 masks the splash icon to a 192 dp circle of its 200 dp image; the splash plugin in
  `app.json` sets the cream background.
- splash-dark.png (1024×1024, transparent): the same with the on-dark colours, on the night background.
- favicon.png (48×48, transparent): the web build's icon, the full mark.
- preview/icon.png, preview/adaptive-icon.png, preview/splash.png and preview/splash-dark.png: the four files of
  the preview variant "Jew 365 P", each the same mark, size and colour type as its namesake above, with every blue
  of the palette turned to red at the same lightness and saturation (the `RED_ORANGE` palette, drawn from
  `mark-o-preview.svg` and `mark-o-preview-dark.svg`) and the orange bell and book unchanged. Only `app.config.js` names
  them, when `APP_VARIANT=preview`; the monochrome layer, the notification silhouette and the favicon are
  production's.

The in-app logo is not a PNG: `src/components/logo.generated.ts` holds the SVG strings that `AppLogo` draws, and
the same export writes it.
