# Rootbound — Design Proposal

## The idea

**Rootbound** is a quiet, compact survival-gardening game about making a home in a hostile void. The player begins with one heartwood seed and a modest reserve of Lumen Sap. By growing outward in an isometric field, they turn that lonely seed into a connected ecosystem capable of sustaining itself and resisting the dark.

The game’s central question is simple: **what kind of living world will you make when every new form has a cost, a purpose, and a place in the whole?**

## Player promise

In a short session, the player should feel the pleasure of nurturing a small thing into a distinct, functioning place. Growth is both expressive and practical: leaves feed the garden, roots absorb pressure, blooms fight back, and glyphs reshape the pace of danger. The garden is not a generic tower-defense maze; it is an interconnected organism whose shape is the player’s strategy.

## Design pillars

1. **Growth is the main verb.** The player builds tile by tile from a single seed. Clear adjacency and an isometric canvas make the garden easy to read and satisfying to shape.
2. **Every form has a role.** A compact resource economy gives each placement an opportunity cost. A productive garden, a sturdy garden, and a defensive garden should look and play differently.
3. **Connection creates identity.** Groups of at least three connected forms awaken a module. Mixed clusters imply that the garden can become something more than the sum of its parts.
4. **The world answers back.** Quiet intervals invite planning; five escalating waves create a finite, understandable test of the garden’s resilience.
5. **Atmosphere stays legible.** Soft colors, small motions, restrained interface copy, and a dark botanical setting support a meditative mood without hiding health, resources, or immediate danger.

## Core loop

1. **Read the field:** check heartwood integrity, Sap, the next wave, and the available build forms.
2. **Choose a purpose:** invest Sap in income, durability, area defense, or slowing the enemy.
3. **Grow from what is connected:** place a form only beside an existing garden cell; experiment with cluster composition.
4. **Prepare or invite danger:** use quiet time to grow, or call the next wave early.
5. **Watch the ecosystem work:** enemies navigate toward the heartwood, attack obstructing forms, and face automatic bloom and glyph effects.
6. **Adapt and endure:** collect Sap, repair the plan through new growth, and survive all five waves.

## Systems in the playable build

### Garden forms

- **Heartwood** is the core objective and the starting point.
- **Stem** is low-cost structural growth.
- **Leaf** generates additional Sap over time.
- **Root** has higher durability and can absorb attacks.
- **Bloom** automatically fires at nearby enemies.
- **Glyph** slows nearby enemies.

All new forms must join the existing garden. A connected non-core cluster of three or more forms awakens a descriptive module; mixed forms produce a distinct mixed-grove identity.

### Resources and pressure

Lumen Sap accumulates passively, with leaves increasing the income rate. Defeated enemies also return some Sap. Each wave sends a growing group of enemies toward the heartwood. They attack forms that block their route, making spatial growth a defensive decision as well as an aesthetic one. The run ends when the heartwood falls or the fifth wave is cleared.

### Input and presentation

The game uses a Canvas-drawn isometric board, mouse and touch placement, drag panning, wheel and two-finger pinch zoom, keyboard form shortcuts, and pause/help/result overlays. The interface is responsive: on phones the garden sits above the build and status panel, with touch gestures used in place of mouse input.

## Tone and visual direction

Rootbound should feel like a field notebook from an unfamiliar world: measured, warm, and a little mysterious. Dark greens and earth colors establish the void; pale botanical highlights identify useful cells and resources; enemy reds provide a restrained warning. Small particles, gentle canvas motion, and compact labels make the garden feel alive without turning the screen into noise.

The writing favors short observations over lengthy lore. The heartwood, Lumen Sap, the dark, and the awakened modules should suggest a larger ecology while leaving room for the player’s own interpretation.

## Scope and next possibilities

The current build is a complete, self-contained five-wave arcade loop. It prioritizes a finished play session over a large content surface. If expanded, the most valuable next steps would be:

- Give awakened modules concrete, readable gameplay bonuses, not descriptions alone.
- Add more enemy behaviors and wave-specific compositions.
- Provide a garden journal that records discovered cluster combinations.
- Add optional challenge modifiers or a relaxed endless mode after the main five-wave run.
- Improve onboarding with a brief first-growth sequence and clearer live previews of tile range and effects.
- Offer sound and reduced-motion settings while preserving the calm visual identity.

These are future directions, not requirements for understanding or playing the current version.
