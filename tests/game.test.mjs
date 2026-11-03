import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { endingEligibility,mayEarnTrust,inventoryConsistent,baseEndingPossible } from '../src/rules.mjs';

test('Old ending always available at pedestal',()=>{
 assert.deepEqual(endingEligibility({CHALICE:true}),{old:true,free:false,united:false});
 assert.equal(baseEndingPossible({YORGLE_DEAD:true}),true);
 assert.deepEqual(endingEligibility({}),{old:false,free:false,united:false});
});
test('Blueprint unlocks dragon freedom',()=>{
 assert.deepEqual(endingEligibility({CHALICE:true,BLUEPRINT:true}),{old:true,free:true,united:false});
});
test('United requires all trust and forge',()=>{
 const f={CHALICE:true,BLUEPRINT:true,FORGE:true,YORGLE_TRUST:true,GRUNDLE_TRUST:true,RHINDLE_TRUST:true};
 assert.equal(endingEligibility(f).united,true);
 for(const k of ['BLUEPRINT','FORGE','YORGLE_TRUST','GRUNDLE_TRUST','RHINDLE_TRUST']){
  const partial={...f};delete partial[k];assert.equal(endingEligibility(partial).united,false,k);
 }
});
test('Defeated dragons cannot earn trust',()=>{
 assert.equal(mayEarnTrust({YORGLE_DEAD:true},'YORGLE'),false);
 assert.equal(mayEarnTrust({GRUNDLE_TRUST:true},'GRUNDLE'),false);
 assert.equal(mayEarnTrust({},'RHINDLE'),true);
});
test('Single major item ownership is consistent',()=>{
 assert.equal(inventoryConsistent({gold:{owner:'hero'},white:{owner:'world'}},'gold'),true);
 assert.equal(inventoryConsistent({gold:{owner:'hero'},white:{owner:'hero'}},'gold'),false);
 assert.equal(inventoryConsistent({gold:{owner:'hero'}},null),false);
 assert.equal(inventoryConsistent({},null),true);
});
test('Game HTML includes working interaction hooks',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['game','hud','status','overlay','interact','drop','attack','map','help','stick'])
  assert.ok(html.includes('id="'+id+'"'),id);
});
test('Source compiles as JS and contains game interaction implementations',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const stripped=js.replace(/import[\s\S]*?from '@babylonjs\/core';/,'').replace("import './style.css';",'').replace("import { endingEligibility, mayEarnTrust } from './rules.mjs';",'');
 assert.doesNotThrow(()=>new Function(stripped));
 for(const name of ['function interact()','function attack()','function endingMenu()','function moveActors(dt)','function save()'])
  assert.ok(js.includes(name),name);
});
