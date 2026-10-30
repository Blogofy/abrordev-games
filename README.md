# Abrordev Games

Three original HTML5 games by **Abrordev**, built for [YouTube Playables](https://developers.google.com/youtube/gaming/playables).
Bright, quick to learn and full of motion — they run in any modern browser on phones and desktops.

| Game | Genre | Highlights | Tech |
|---|---|---|---|
| [**Sugar Rush**](sugarrush/) | 3D runner with levels | Outrun a chocolate flood, stack jelly cubes, build bridges, climb to the gift. 5 heroes, upgrades shop. | three.js (WebGL) |
| [**Kite**](kite/) | One-touch flyer | Hold to rise, release to glide through 5 worlds. 8 unlockable kites, power-ups, missions. | Canvas 2D |
| [**Tower Pals**](towerpals/) | Stacking puzzle | Drop swinging pals from a crane up to the finish flag. Level map, 3-star rating, 14 pals, 5 chapters with twists. | Canvas 2D |

The root [`index.html`](index.html) is a portfolio page that links to all three games.

## Built for Playables

- Playables SDK loaded before game code: `firstFrameReady`, `gameReady`, `loadData` / `saveData`, `onPause` / `onResume`, `isAudioEnabled` / `onAudioEnabledChange`, `getLanguage`, `sendScore`, `health.logError`.
- No logins, no external links, no network requests at runtime — everything is bundled.
- All music and sound effects are synthesized with WebAudio; Kite and Tower Pals draw all art in code.
- 10 languages: English, Spanish, Portuguese, Russian, Uzbek, Turkish, Indonesian, French, German, Hindi.
- Portrait and landscape; touch, mouse and keyboard controls.
- Bundle sizes: Sugar Rush 6.8 MB, Kite 0.17 MB, Tower Pals 0.13 MB.

## Run locally

Sugar Rush uses ES modules, so open the games through a local web server (not `file://`):

```sh
python -m http.server 8765
```

Then open <http://127.0.0.1:8765/>.

## Credits

All games designed and developed by **Abrordev**.

Third-party components:
- [three.js](https://threejs.org/) — MIT License (bundled in `sugarrush/`).
- 3D characters in Sugar Rush from the "Ultimate Monsters" pack by [Quaternius](https://quaternius.com/) — CC0 1.0 (see `sugarrush/models/LICENSE-Quaternius-CC0.txt`).

## License

© 2026 Abrordev. All rights reserved — see [LICENSE](LICENSE). Third-party components keep their own licenses listed above.
