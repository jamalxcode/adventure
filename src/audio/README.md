# Music

Drop looping MP3 files in this folder (`src/audio/`) with these exact names. The game fades between them automatically.
Any file that is missing falls back to the built-in synthesized music.

| File | When it plays |
|---|---|
| `explore.mp3` | Exploring (default) |
| `danger.mp3` | A dragon is chasing you (also used for the boss if `boss.mp3` is missing) |
| `boss.mp3` | Shadow Sorcerer fight and the castle collapse escape |
| `ending.mp3` | After you choose an ending |

Keep each file loopable, about 1-3 minutes, and under ~3 MB (128 kbps MP3 is plenty).
