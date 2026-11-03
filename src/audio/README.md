# Music

Looping MP3s named by mood, with any number of versions: `explore_1.mp3`, `explore_2.mp3`, `danger_1.mp3`, `boss_1.mp3` ...
plus a single non-looping `ending.mp3`. Names are case-insensitive.

| Mood | When it plays |
|---|---|
| `explore` | Exploring (default) |
| `danger` | A dragon is chasing you (stays on for 5 seconds after the chase ends) |
| `boss` | Shadow Sorcerer fight and the castle collapse escape (falls back to `danger`) |
| `ending` | Plays once after you choose an ending, then exploration music returns |

Each loop plays twice, then crossfades into a different version of the same mood. Moods crossfade over 1.5 seconds.
If there are no files at all, the game uses its built-in synthesized music.
