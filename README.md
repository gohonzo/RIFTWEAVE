# RIFTWEAVE: Shards of Aether

RIFTWEAVE is an independent tactical match roguelike project.

## Visual production build

The current GitHub Pages build integrates the generated production art directly into gameplay:

- illustrated Kael, Lyra and Nyx sprite atlases with idle, attack, cast and hurt states;
- illustrated standard enemies and a multi-phase Rift boss;
- illustrated 6-type board tile atlas plus empowered variants;
- animated board cascades, connection trails, impact bursts, particles and VFX;
- cinematic menu and battle backgrounds with layered parallax;
- animated menu/game/codex/gallery transitions;
- responsive desktop/mobile stage fitting;
- **Ajustar a pantalla** and **Pantalla completa** controls;
- reactive WebAudio SFX, screen shake and accessibility toggles;
- local run persistence, relic choices, bosses and character ultimates.

The optimized visual build is packaged under `.bundle/` and rebuilt by GitHub Actions before deployment. This keeps the generated image pack compact while validating the final JavaScript on every publish.

### Play
https://gohonzo.github.io/RIFTWEAVE/
