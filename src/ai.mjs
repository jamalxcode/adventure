// Dragon and Karl behaviour as small state machines. Pure: no rendering, no DOM.
// The caller moves the creature with collision using the returned velocity.

export const DRAGONS = {
  gold:  { id: 'gold',  name: 'Gold Dragon',  home: 6,  speed: 2.7, charge: 1.0, leash: 24, color: '#E8B53A', belly: '#F7DE8E' },
  green: { id: 'green', name: 'Green Dragon', home: 8,  speed: 3.1, charge: 1.9, leash: 30, color: '#3FA568', belly: '#A9DB8E' },
  red:   { id: 'red',   name: 'Red Dragon',   home: 18, speed: 4.4, charge: 1.2, leash: 32, color: '#C9483F', belly: '#F2A07A' }
};

export const SIGHT_RANGE = 14, SIGHT_COS = Math.cos(70 * Math.PI / 180), HEAR_RANGE = 10;
export const WINDUP = 0.7, STRIKE_RANGE = 3.0, ENGAGE_RANGE = 2.5;

const angleTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

export function newDragon(def, pos) {
  return { id: def.id, x: pos.x, z: pos.z, home: { ...pos }, heading: 0, state: 'idle', t: 0,
    hp: 3, lost: 0, wander: { ...pos }, wanderT: 0, charging: false };
}

// Can the dragon notice the hero right now?
export function perceives(d, hero, los, alreadyHunting = false) {
  if (hero.hidden) return false;
  const dx = hero.x - d.x, dz = hero.z - d.z, dist = Math.hypot(dx, dz);
  if (dist < 3) return true;
  if (hero.sprinting && dist < HEAR_RANGE) return true;
  const range = alreadyHunting ? SIGHT_RANGE * 1.3 : SIGHT_RANGE;
  if (dist > range || !los(d.x, d.z, hero.x, hero.z)) return false;
  if (alreadyHunting) return true;
  const fx = Math.sin(d.heading), fz = Math.cos(d.heading);
  return (fx * dx + fz * dz) / dist > SIGHT_COS;
}

/*
 env: { hero:{x,z,hidden,sprinting,invulnerable}, los(x1,z1,x2,z2), nav(x,z,goal)->{x,z}|null,
        friendly, enraged, rand() }
 Returns { vx, vz, events: [] }. Events: 'alert','windup','hit','miss','lost','home'.
*/
export function stepDragon(d, def, env, dt) {
  const ev = [], hero = env.hero, rand = env.rand || Math.random;
  const dist = Math.hypot(hero.x - d.x, hero.z - d.z);
  const fromHome = Math.hypot(d.x - d.home.x, d.z - d.home.z);
  const leash = env.enraged ? Infinity : def.leash;
  let goal = null, speed = 0;
  d.t += dt;
  const go = (s, extra = {}) => { d.state = s; d.t = 0; Object.assign(d, extra); };

  if (d.state === 'defeated') return { vx: 0, vz: 0, events: ev };
  if (env.friendly && !['friendly', 'stunned'].includes(d.state)) go('friendly');

  switch (d.state) {
    case 'idle':
      d.wanderT -= dt;
      if (d.wanderT <= 0) {
        const a = rand() * Math.PI * 2, r = 1.5 + rand() * 3.5;
        d.wander = { x: d.home.x + Math.sin(a) * r, z: d.home.z + Math.cos(a) * r };
        d.wanderT = 2.5 + rand() * 3;
      }
      goal = d.wander; speed = def.speed * 0.35;
      if (perceives(d, hero, env.los)) { go('alert'); ev.push('alert'); goal = null; }
      break;
    case 'alert':
      d.heading = angleTo(d, hero);
      if (d.t > 0.6) go('chase', { lost: 0 });
      break;
    case 'chase': {
      if (perceives(d, hero, env.los, true)) d.lost = 0; else d.lost += dt;
      if (d.lost > 3) { go('return'); ev.push('lost'); break; }
      if (fromHome > leash) { go('return'); ev.push('lost'); break; }
      if (dist < ENGAGE_RANGE) { go('windup'); ev.push('windup'); break; }
      d.charging = def.charge > 1 && dist > 4 && dist < 11;
      goal = env.nav(d.x, d.z, hero) || hero;
      speed = def.speed * (d.charging ? def.charge : 1) * (env.enraged ? 1.15 : 1);
      break;
    }
    case 'windup':
      d.heading = angleTo(d, hero);
      if (d.t >= WINDUP) {
        if (dist < STRIKE_RANGE && !hero.invulnerable) ev.push('hit'); else ev.push('miss');
        go('recover');
      }
      break;
    case 'recover':
      if (d.t > 0.9) go('chase', { lost: 0 });
      break;
    case 'stunned':
      if (d.t > (d.stunFor || 1.2)) go(env.friendly ? 'friendly' : 'chase', { lost: 0 });
      break;
    case 'return':
      goal = env.nav(d.x, d.z, d.home) || d.home; speed = def.speed * 0.7;
      if (fromHome < 1.5) { go('idle', { wanderT: 0 }); ev.push('home'); }
      else if (fromHome < leash * 0.7 && perceives(d, hero, env.los)) { go('alert'); ev.push('alert'); goal = null; }
      break;
    case 'friendly':
      if (!env.friendly) { go('idle'); break; }
      if (dist < 14 && dist > 4.5) { goal = env.nav(d.x, d.z, hero) || hero; speed = def.speed * 0.8; }
      else if (dist >= 14 && fromHome > 2) { goal = env.nav(d.x, d.z, d.home) || d.home; speed = def.speed * 0.5; }
      break;
  }
  let vx = 0, vz = 0;
  if (goal && speed > 0) {
    const gx = goal.x - d.x, gz = goal.z - d.z, L = Math.hypot(gx, gz);
    if (L > 0.3) { vx = gx / L * speed; vz = gz / L * speed; d.heading = Math.atan2(vx, vz); }
  }
  return { vx, vz, events: ev };
}

export function hitDragon(d, knockFrom) {
  if (d.state === 'defeated') return 'none';
  d.hp -= 1;
  if (d.hp <= 0) { d.state = 'defeated'; d.t = 0; return 'defeated'; }
  d.state = 'stunned'; d.t = 0; d.stunFor = 1.2;
  if (knockFrom) {
    const a = Math.atan2(d.x - knockFrom.x, d.z - knockFrom.z);
    d.knock = { x: Math.sin(a) * 6, z: Math.cos(a) * 6 };
  }
  return 'stunned';
}

/* Karl the Kameleon: wanders a few rooms, sneaks up on a hero carrying something,
   steals it and runs back to his lookout. Avoids the Crystal of Truth. */
export const KARL = { rooms: [2, 3, 6, 7], lair: 7, speed: 2.2, stalkSpeed: 3.9, fleeSpeed: 5.2 };

export function stepKarl(k, env, dt) {
  const ev = [], hero = env.hero, rand = env.rand || Math.random;
  const dist = Math.hypot(hero.x - k.x, hero.z - k.z);
  k.t = (k.t || 0) + dt; k.cooldown = Math.max(0, (k.cooldown || 0) - dt);
  let goal = null, speed = 0;
  const go = s => { k.state = s; k.t = 0; };
  switch (k.state) {
    case 'stunned':
      if (k.t > 4) go('wander');
      break;
    case 'wander':
      if (!k.goal || Math.hypot(k.goal.x - k.x, k.goal.z - k.z) < 1 || k.t > 9) {
        k.goal = env.randomPoint(); k.t = 0;
      }
      goal = k.goal; speed = KARL.speed;
      if (hero.hasCrystal && dist < 7) { go('avoid'); break; }
      if (env.canSteal && k.cooldown <= 0 && dist < 9 && !k.stolen) go('stalk');
      break;
    case 'stalk':
      if (hero.hasCrystal) { go('avoid'); break; }
      if (!env.canSteal || dist > 13) { go('wander'); break; }
      goal = env.nav(k.x, k.z, hero) || hero; speed = KARL.stalkSpeed;
      if (dist < 1.6) { ev.push('steal'); go('flee'); k.cooldown = 45; }
      break;
    case 'flee':
      goal = env.nav(k.x, k.z, env.lairPoint) || env.lairPoint; speed = KARL.fleeSpeed;
      if (Math.hypot(env.lairPoint.x - k.x, env.lairPoint.z - k.z) < 1.2) { ev.push('stash'); go('wander'); }
      break;
    case 'avoid': {
      if (!hero.hasCrystal || dist > 12) { go('wander'); break; }
      const a = Math.atan2(k.x - hero.x, k.z - hero.z);
      goal = { x: k.x + Math.sin(a) * 4, z: k.z + Math.cos(a) * 4 }; speed = KARL.fleeSpeed * 0.8;
      break;
    }
    default: go('wander');
  }
  let vx = 0, vz = 0;
  if (goal && speed) {
    const gx = goal.x - k.x, gz = goal.z - k.z, L = Math.hypot(gx, gz);
    if (L > 0.2) { vx = gx / L * speed; vz = gz / L * speed; k.heading = Math.atan2(vx, vz); }
  }
  return { vx, vz, events: ev };
}
