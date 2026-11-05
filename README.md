# Rootbound

Rootbound is a small, playable browser game about growing a living garden in the dark and keeping its heartwood alive. Build an isometric garden from connected forms, gather Lumen Sap, and hold back five waves of intruders.

## Play

Open `index.html` in a modern browser, or serve this folder locally:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. The game has no build step, package installation, or runtime dependencies. Google Fonts are requested for the visual design; system fallbacks are used if they are unavailable.

## How to play

- Select a form in the right-hand panel, then click or tap an empty glowing cell next to the garden to grow it.
- Build connected groups of three or more forms to awaken a garden module. Mixed clusters produce their own description.
- Gather Lumen Sap passively and by defeating enemies. Use it to grow new forms.
- Hold the heartwood through five waves. Waves arrive automatically after a quiet interval, or use **Call Them** to start one early.
- The game ends in victory after wave five is cleared, or in defeat if the heartwood is destroyed.

| Form | Cost | Effect |
| --- | ---: | --- |
| Stem | 1 | Inexpensive, sturdy basic growth |
| Leaf | 2 | Generates additional Lumen Sap |
| Root | 2 | A durable buffer against enemy attacks |
| Bloom | 4 | Fires at nearby enemies automatically |
| Glyph | 5 | Slows enemies that pass nearby |

Every garden also generates a small amount of Sap over time. Enemies move toward the heartwood and attack the first form blocking their path; blooms can destroy them before they reach it.

## Controls

- **Click / tap:** place the selected form on a valid adjacent cell.
- **Drag:** pan the garden; a short click places a form.
- **Mouse wheel / two-finger pinch:** zoom in or out.
- **Shift + click:** place a form on the raised layer.
- **1–5:** select Stem, Leaf, Root, Bloom, or Glyph.
- **Space:** pause or resume.
- **Escape:** clear the placement preview.
- **?** in the top bar opens the field notes.

Touch input is supported for placement and panning, with a two-finger pinch to zoom. Use the browser’s normal page scrolling to reach the lower controls on smaller screens.

## Project files

- `index.html` — page structure, game controls, and help/result dialogs.
- `style.css` — responsive layout and visual styling.
- `game.js` — Canvas rendering, garden simulation, combat, and input handling.
- `PROPOSAL.md` — the design vision behind the game.

## Development and validation

The game is intentionally dependency-free. Check the JavaScript syntax with:

```sh
node --check game.js
```

Serve the directory over HTTP when checking browser behavior. The canvas is drawn at device-pixel resolution (capped for performance), and the side panel rearranges below the world on narrow screens.
