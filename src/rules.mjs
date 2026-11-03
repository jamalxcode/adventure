// Pure story rules shared by the browser game and Node tests.
export const ENDINGS = Object.freeze({
  OLD: 'The Old Order', FREE: 'Age of Dragons', UNITED: 'The Three Wardens'
});
export const DRAGON_IDS = ['GOLD', 'GREEN', 'RED'];

export function endingEligibility(flags = {}) {
  const atPedestal = Boolean(flags.CROWN_AT_PEDESTAL || flags.CROWN);
  const blueprint = Boolean(flags.BLUEPRINT);
  const forge = Boolean(flags.FORGE);
  const trust = DRAGON_IDS.every(d => flags[d + '_TRUST']);
  return { old: atPedestal, free: atPedestal && blueprint, united: atPedestal && blueprint && forge && trust };
}
export function mayEarnTrust(flags = {}, dragon) {
  if (!DRAGON_IDS.includes(dragon)) return false;
  return !(flags[dragon + '_DEAD'] || flags[dragon + '_TRUST']);
}
export function inventoryConsistent(items = {}, heldId = null) {
  const carried = Object.entries(items).filter(([, v]) => v?.owner === 'hero').map(([id]) => id);
  return (!heldId && carried.length === 0) || (carried.length === 1 && carried[0] === heldId);
}
export function baseEndingPossible(flags = {}) {
  return !!endingEligibility({ ...flags, CROWN_AT_PEDESTAL: true }).old;
}

// Ordered story objectives; the first unmet one is shown in the HUD.
export const OBJECTIVES = [
  [f => f.SUN_OPEN, 'Find the Sun Key in the garden and open the Sun Castle gate'],
  [f => f.SANCTUARY, 'Touch the sun pedestal inside Sun Castle'],
  [f => f.COLLAR, 'Visit the Gold Dragon’s Nest and find out why the dragons are angry'],
  [f => f.FROST_OPEN || f.CRACK_OPEN, 'Get into Frost Castle: the Frost Key is at Karl’s Lookout (or find a cracked wall)'],
  [f => f.MURAL, 'Read the mural inside Frost Castle'],
  [f => f.MIRRORS, 'Turn the mirrors in Mirror Hall until the light hits the crystal'],
  [f => f.SEAL1 && f.SEAL2, 'Carry the Crystal of Truth to the shadow seals on Shadow Road and Shadow Gate'],
  [f => f.SHADOW_OPEN, 'Find the Shadow Key in the Mine Entrance and open Shadow Castle'],
  [f => f.BOSS_DONE, 'Defeat the Shadow Sorcerer: break his three pylons'],
  [f => f.CROWN, 'Take the Dragon Crown'],
  [f => f.ENDING, 'Escape! Carry the Dragon Crown back to the Sun Castle pedestal']
];
export function currentObjective(flags = {}) {
  const o = OBJECTIVES.find(([done]) => !done(flags));
  return o ? o[1] : 'Adventure complete. Explore freely or start a new adventure.';
}
