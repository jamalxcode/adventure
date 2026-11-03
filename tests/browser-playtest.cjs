// Real-browser playtest of the built game.
// Usage: npm run build && npm run preview   (in another terminal)
//        node tests/browser-playtest.cjs [url] [screenshotDir]
// Needs Playwright with Chromium available (require('playwright')).
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const ok = (cond, label) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) process.exitCode = 1; };
  const td = (fn, arg) => page.evaluate(fn, arg);
  const wait = ms => page.waitForTimeout(ms);
  const press = async k => { await page.keyboard.press(k); await wait(200); };
  const shot = async n => { if (shots) await page.screenshot({ path: `${shots}/${n}.png` }); };

  await page.goto(url); await wait(3500);
  ok(await page.isVisible('h1.title'), 'title screen shows');
  await shot('01-title');
  await page.click('[data-new]'); await wait(800);

  // Movement: D moves the hero to the screen's right (+x with the default camera).
  const x0 = await td(() => __td.state.hero.x);
  await page.keyboard.down('KeyD'); await wait(4000); await page.keyboard.up('KeyD');
  ok((await td(() => __td.state.hero.x)) > x0 + 1, 'D moves right');

  // Sun Key -> locked gate -> Sun Castle
  await td(() => __td.teleport(0, -4, -2)); await wait(300);
  ok(/Sun Key/.test(await td(() => __td.prompt())), 'prompt offers the Sun Key');
  await shot('02-prompt');
  await press('KeyE');
  ok((await td(() => __td.state.held)) === 'sunkey', 'picked up Sun Key');
  await td(() => __td.teleport(0, 6, 0)); await wait(100);
  await page.keyboard.down('KeyD'); await wait(2500); await page.keyboard.up('KeyD');
  ok((await td(() => __td.room())) === 0, 'locked gate blocks the way');
  await press('KeyE');
  ok(await td(() => __td.flag('SUN_OPEN')), 'gate unlocked with key');
  for (let i = 0; i < 12 && (await td(() => __td.room())) !== 1; i++) { await page.keyboard.down('KeyD'); await wait(500); await page.keyboard.up('KeyD'); }
  ok((await td(() => __td.room())) === 1, 'walked into Sun Castle');
  await shot('03-sun-castle');

  // Gold Dragon notices and attacks
  await td(() => __td.teleport(6, 2.5, 6)); await wait(100);
  await td(() => { __td.dragons.gold.heading = 0; });
  await wait(1500);
  const gs = await td(() => __td.dragons.gold.state);
  ok(['alert', 'chase', 'windup', 'recover'].includes(gs), 'Gold Dragon reacts to the hero (' + gs + ')');
  await shot('04-dragon');
  for (let i = 0; i < 40 && (await td(() => __td.state.hero.health)) === 3; i++) await wait(500);
  const hp = await td(() => __td.state.hero.health);
  ok(hp < 3, 'dragon can hurt the hero (health ' + hp + ')');

  // Mirror puzzle: turn two mirrors
  await td(() => { __td.setFlag('FROST_OPEN'); __td.teleport(14, 0, -1.4); }); await wait(200);
  await press('KeyE');
  await td(() => __td.teleport(14, 0, 4.6)); await wait(200);
  await press('KeyE'); await wait(200);
  ok(await td(() => __td.flag('MIRRORS')), 'mirror puzzle solved by turning two mirrors');
  await shot('05-mirrors');

  // Forge levers in archive order
  const order = await td(() => [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][__td.state.seed % 6]);
  for (const i of order) { await td(n => __td.teleport(13, [-4, 0, 4][n], -0.7), i); await wait(150); await press('KeyE'); }
  ok(await td(() => __td.flag('FORGE')), 'forge restarted with the rune order');
  await shot('06-forge');

  // Seals with the crystal, boss pylons, crown, ending
  await td(() => __td.give('crystal'));
  await td(() => __td.teleport(17, 0, -1.6)); await wait(200); await press('KeyE');
  await td(() => __td.teleport(18, -4, 2.4)); await wait(200); await press('KeyE');
  ok(await td(() => __td.flag('SEAL1') && __td.flag('SEAL2')), 'both seals shattered with the crystal');
  await td(() => { __td.setFlag('SHADOW_OPEN'); __td.teleport(19, -4, -2); }); await wait(1500);
  await shot('07-boss');
  for (const [lx, lz] of [[-6, -2.4], [6, -2.4], [0, -4.8]]) { await td(([a, b]) => __td.teleport(19, a, b), [lx, lz]); await wait(150); await press('KeyE'); }
  ok(await td(() => __td.flag('BOSS_DONE')), 'Sorcerer defeated by breaking pylons');
  await td(() => { const s = __td.state; if (s.held) { s.items[s.held] = { owner: 'used' }; s.held = null; } __td.teleport(19, -1.6, -1.6); }); await wait(200);
  await press('KeyE');
  ok((await td(() => __td.state.held)) === 'crown', 'took the Dragon Crown');
  await wait(1500); await shot('08-escape');
  await td(() => __td.teleport(1, 0, -3.8)); await wait(300);
  await press('KeyE');
  ok(await page.isVisible('text=The Crown Comes Home'), 'ending choice appears');
  await page.click('[data-end="OLD"]'); await wait(300);
  ok(await page.isVisible('text=Adventure Complete'), 'adventure completes');
  await shot('09-ending');

  await page.reload(); await wait(3500);
  ok(await page.isVisible('[data-continue]'), 'continue offered after reload');
  console.log('fps (software rendering):', await td(() => Math.round(__td.fps())));
  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
})();
