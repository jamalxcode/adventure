import './style.css';
import {
 Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3,
 MeshBuilder, StandardMaterial, Color3, TransformNode, ShadowGenerator
} from '@babylonjs/core';

/* Adventure: The Lost Chalice — original procedural 3D playable vertical slice.
   This is deliberately a self-contained game module, not final asset production. */
const $ = id => document.getElementById(id);
const canvas=$('game'), hud=$('hud'), notice=$('status');
const names=[
 'Golden Garden','Golden Castle','Sunlit Meadow','Forest Gate','Whispering Woods',
 'Training Yard',"Yorgle's Nest","Blinky's Watchtower",'White Gate','White Castle',
 'River Bank','Old Quarry','Mine Entrance','Ancient Forge','Mirror Hall',
 'Hidden Path','Stone Archive','Shadow Road','Black Gate','Black Castle'
];
const cols=5, rows=4, cell=18;
const locations=names.map((name,id)=>({id,name,c:id%cols,r:Math.floor(id/cols),
 x:(id%cols-2)*cell,z:(Math.floor(id/cols)-1.5)*cell}));
const at=id=>locations[id], dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const K='adventure-lost-chalice-v02-save';
const DEFAULT=()=>({v:2,hero:{x:at(0).x,z:at(0).z,health:3},held:null,items:{},flags:{},
 dragons:{},score:0,ending:null,seed:1709,playSeconds:0,batCooldown:30});
let state=DEFAULT(), paused=false, keys=new Set(), scenes=[], actors=[], lastRoom=-1;
let engine,scene,camera,hero,bat,balloon,glow,gameTime=0,last=performance.now(),infoTime=0,lastPersist=0;
let audioCtx=null,musicOn=true,fxOn=true,objective='Find the golden key',activeOverlay='';
const flag=k=>!!state.flags[k],setFlag=k=>{if(!flag(k)){state.flags[k]=true;state.score+=100;sound('win');save();}};
const cellOf=(x,z)=>Math.max(0,Math.min(19,
 Math.floor(Math.min(3.9999,Math.max(0,(z+36)/18)))*5+
 Math.floor(Math.min(4.9999,Math.max(0,(x+45)/18)))));
const inCell=id=>cellOf(state.hero.x,state.hero.z)===id;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function save(){try{localStorage.setItem(K,JSON.stringify(state));}catch(e){msg('Saving is blocked in this browser. Use a normal browser window.');}}
function load(){try{const s=JSON.parse(localStorage.getItem(K)||'null');if(s&&s.v===2&&s.hero&&s.items&&s.flags){state=s;state.hero.health=clamp(+state.hero.health||3,1,3);}}catch(e){state=DEFAULT();}}
function msg(t,duration=4){notice.textContent=t;notice.style.opacity='1';infoTime=gameTime+duration;}
function sound(kind){
 if(!fxOn)return;
 try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
 const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),amp=audioCtx.createGain();
 let freq=kind==='hurt'?170:kind==='win'?660:kind==='key'?490:kind==='bat'?770:350;
 osc.type=kind==='hurt'?'sawtooth':'sine';osc.frequency.setValueAtTime(freq,t);
 if(kind==='win')osc.frequency.exponentialRampToValueAtTime(900,t+.2);
 if(kind==='bat')osc.frequency.exponentialRampToValueAtTime(280,t+.15);
 amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(.07,t+.01);
 amp.gain.exponentialRampToValueAtTime(.0001,t+.21);
 osc.connect(amp);amp.connect(audioCtx.destination);osc.start(t);osc.stop(t+.22);
 }catch(e){}
}
const items=[
 {id:'gold',label:'Golden Key',room:0,color:'#FFD45A',type:'key',x:-3,z:2},
 {id:'sword',label:'Hero Sword',room:5,color:'#C5D4E5',type:'sword',x:1,z:-2},
 {id:'treasure',label:'Golden Treasure',room:6,color:'#FFD85B',type:'treasure',x:2,z:2},
 {id:'white',label:'White Key',room:7,color:'#DCE9FA',type:'key',x:-2,z:1},
 {id:'magnet',label:'Magic Magnet',room:11,color:'#F37477',type:'magnet',x:1,z:1},
 {id:'bridge',label:'Magic Bridge',room:12,color:'#AA8AEF',type:'bridge',x:2,z:1},
 {id:'black',label:'Black Key',room:12,color:'#434150',type:'key',x:-3,z:2},
 {id:'truth',label:'Crystal of Truth',room:14,color:'#67EAFF',type:'crystal',x:1,z:2},
 {id:'chalice',label:'Enchanted Chalice',room:19,color:'#FFE66C',type:'chalice',x:0,z:-3}
];
const roomCenter=id=>({x:at(id).x,z:at(id).z});
function itemPos(item){const a=at(item.room);return {x:a.x+item.x,z:a.z+item.z};}
function itemState(id){const def=items.find(i=>i.id===id);if(id==='chalice'&&!flag('SEALS')&&!flag('CHALICE'))return {owner:'sealed'};return state.items[id]||{owner:'world',room:def.room,x:def.x,z:def.z};}
function putItem(id,data){state.items[id]=data;updateObjects();save();}
function heldItem(){return items.find(i=>i.id===state.held);}
function holding(id){return state.held===id;}
function pick(item){
 if(state.held){msg('Your hands are full. Press Q to drop '+heldItem().label+'.');return;}
 state.held=item.id;state.items[item.id]={owner:'hero'};if(item.id==='chalice')setFlag('CHALICE');state.score+=10;sound('key');
 msg('Picked up '+item.label+'. Carry one large object at a time.');updateObjects();save();
}
function drop(){
 if(!state.held)return;
 const id=state.held;state.held=null;const room=cellOf(state.hero.x,state.hero.z),a=at(room);
 state.items[id]={owner:'world',room,x:clamp(state.hero.x-a.x,-7,7),z:clamp(state.hero.z-a.z,-7,7)};
 msg('Dropped '+items.find(i=>i.id===id).label+'.');updateObjects();save();
}
function spendKey(id){
 if(!holding(id))return false;
 state.held=null;state.items[id]={owner:'world',room:cellOf(state.hero.x,state.hero.z),x:0,z:0};
 updateObjects();return true;
}
function color(hex){return Color3.FromHexString(hex);}
function mat(n,hex,emissive=false){const m=new StandardMaterial(n,scene);m.diffuseColor=color(hex);if(emissive)m.emissiveColor=color(hex).scale(.34);return m;}
const materials={};
function material(hex,lit=false){const id=hex+(lit?'e':'');return materials[id] ||=mat(id,hex,lit);}
function box(name,w,h,d,x,y,z,c,cast=true){
 const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
 m.position.set(x,y,z);m.material=material(c);m.receiveShadows=true;
 if(cast&&shadows)shadows.addShadowCaster(m);return m;
}
function orb(name,diam,x,y,z,c){
 const m=MeshBuilder.CreateSphere(name,{diameter:diam,segments:10},scene);
 m.position.set(x,y,z);m.material=material(c);if(shadows)shadows.addShadowCaster(m);return m;
}
let shadows;
function tree(x,z,s=1){
 box('trunk',.65*s,2.4*s,.65*s,x,1.2*s,z,'#79543A');
 orb('foliage',3.3*s,x,3.25*s,z,'#2D8756');
 orb('foliage',2.5*s,x+.65*s,4.1*s,z,'#4EAA6B');
}
function sceneProps(){
 const palettes=['#7DBB68','#6BAC73','#91C68D','#668A9E','#4A9074','#89BD75','#74A75A','#8D9586','#96BAC1','#D1D2C9','#78ADB4','#A9A393','#A88669','#A87950','#9CCEDB','#A1B899','#949C88','#787487','#605469','#444252'];
 locations.forEach(l=>{
  box('region '+l.name,17.85,.25,17.85,l.x,-.16,l.z,palettes[l.id],false);
  const q=material(l.id===19?'#B67AE0':'#DCD9BD',true);
  // Four low boundary markers give each room a recognizable threshold, not a maze of walls.
  for(const sx of [-1,1])for(const sz of [-1,1])
   box('corner',2,1.5,2,l.x+sx*7.9,.75,l.z+sz*7.9,l.id===19?'#60506D':'#B2A897');
  for(let n=0;n<4;n++){
   const x=l.x+Math.sin(l.id*3+n*1.8)*5.8,z=l.z+Math.cos(l.id*2+n*1.7)*5.8;
   if([1,9,13,14,16,18,19].includes(l.id))continue;
   if((n+l.id)%3!==0)tree(x,z,.65+((l.id+n)%4)*.11);
  }
 });
 // Distinct monuments make the kingdom legible.
 for(const id of [1,9,19]){
  const l=at(id),wall=id===1?'#E8BD73':id===9?'#DAE4EB':'#3F3348';
  box('castle hall',9,7,7,l.x,3.5,l.z+3.2,wall);
  for(const sx of [-1,1]){
   box('tower',2.4,10,2.4,l.x+sx*5,5,l.z+3,wall);
   const roof=MeshBuilder.CreateCylinder('tower cone',{diameterBottom:3.7,diameterTop:0,height:3,tessellation:4},scene);
   roof.position.set(l.x+sx*5,11.2,l.z+3);roof.material=material(id===19?'#A96AAE':'#5E89A6');
  }
  box('royal banner',2.3,2.1,.13,l.x,6.5,l.z-.39,id===1?'#F5D15D':id===9?'#A2E9F0':'#A16BCC');
 }
 // Forge, watchtower and mirror landmarks.
 box('bat tower',4,9,4,at(7).x,4.5,at(7).z+2,'#847489');
 box('forge block',6,2.3,3,at(13).x,1.2,at(13).z+3,'#554447');
 for(let n=0;n<3;n++)box('mirror',.3,3,1.8,at(14).x-5+n*4,1.5,at(14).z+2,'#BDF2FF');
 box('pedestal',2,1,2,at(1).x,0.5,at(1).z-3,'#E9BF6E');
 box('chamber pedestal',2,1.2,2,at(19).x,0.6,at(19).z-3,'#8E79A4');
 // Door markers visually identify key requirements.
 for(const [id,c] of [[1,'#F8CF50'],[9,'#EBF5FF'],[19,'#30273A']]){
  const l=at(id);
  box('gate arch',3,.4,.6,l.x,3,l.z-6,c);
  for(const sx of [-1,1])box('gate post',.5,3,.6,l.x+sx*1.5,1.5,l.z-6,c);
 }
}
function avatar(x,z,c){
 const root=new TransformNode('avatar',scene);root.position.set(x,0,z);
 const torso=box('torso',1.1,1.25,.64,0,1.48,0,c);torso.parent=root;torso.position.set(0,1.48,0);
 const face=orb('head',1.05,0,2.56,0,'#E9BA91');face.parent=root;face.position.set(0,2.56,0);
 const hair=box('hair',.92,.25,.96,0,3.12,0,'#3C2C32');hair.parent=root;hair.position.set(0,3.12,0);
 for(const s of [-1,1]){
  let a=box('arm',.33,1,.36,0,0,0,'#E9BA91');a.parent=root;a.position.set(s*.79,1.48,0);
  let leg=box('leg',.37,.75,.45,0,0,0,'#343D59');leg.parent=root;leg.position.set(s*.3,.48,0);
 }
 return root;
}
function creature(id,room,hex){
 const pos=at(room),root=new TransformNode(id,scene);root.position.set(pos.x+3,0,pos.z);
 const b=orb(id+' body',2.6,0,1.4,0,hex);b.parent=root;b.position.set(0,1.4,0);
 const h=orb(id+' head',1.65,0,2.55,.8,hex);h.parent=root;h.position.set(0,2.55,.8);
 for(const s of [-1,1]){
  let wing=box('wing',.18,1.6,2,0,0,0,hex);wing.parent=root;wing.position.set(s*1.5,2,.1);wing.rotation.z=s*.45;
  let horn=MeshBuilder.CreateCylinder('horn',{diameterBottom:.4,diameterTop:0,height:.85,tessellation:5},scene);
  horn.parent=root;horn.position.set(s*.4,3.5,.85);horn.material=material('#F4EBC6');
 }
 actors.push({id,room,root,home:{x:root.position.x,z:root.position.z},dir:0,time:0,alive:true,noticeAt:0});
 return root;
}
function batModel(){
 const l=at(7);const root=new TransformNode('Blinky',scene);root.position.set(l.x,4,l.z);
 const body=orb('bat body',.95,0,0,0,'#54406F');body.parent=root;
 for(const s of [-1,1]){
  const wing=box('bat wing',1.2,.12,.55,0,0,0,'#70528C');wing.parent=root;wing.position.set(s*.9,0,0);wing.rotation.z=s*.2;
 }
 return root;
}
const meshItems={};
function objectMeshes(){
 items.forEach(i=>{
  let root=new TransformNode('item '+i.id,scene);
  const base=i.type==='key'?MeshBuilder.CreateTorus(i.id+' ring',{diameter:.9,thickness:.18,tessellation:10},scene):
      i.type==='sword'?MeshBuilder.CreateBox('sword',{width:.22,height:1.4,depth:.25},scene):
      i.type==='bridge'?MeshBuilder.CreateBox('bridge',{width:1.3,height:.3,depth:.8},scene):
      MeshBuilder.CreatePolyhedron(i.id,{type:1,size:.7},scene);
  base.parent=root;base.material=material(i.color,true);
  if(i.type==='key'){base.rotation.x=Math.PI/2;
    const stem=box('key stem',.17,.75,.18,0,0,0,i.color);stem.parent=root;stem.position.y=-.52;
  }
  meshItems[i.id]=root;
 });updateObjects();
}
function updateObjects(){
 if(!scene)return;
 items.forEach(i=>{
  const root=meshItems[i.id];if(!root)return;
  const s=itemState(i.id);root.setEnabled(s.owner==='world');
  if(s.owner==='world'){const c=at(s.room);root.position.set(c.x+s.x,1.25,c.z+s.z);}
 });
}
function questLabel(){
 if(state.ending)return 'Adventure complete: '+state.ending;
 if(!flag('GOLDEN_OPEN'))return 'Find golden key and open Golden Castle';
 if(!flag('SANCTUARY'))return 'Activate the golden pedestal';
 if(!flag('COLLAR'))return 'Investigate Yorgle in the forest';
 if(!flag('WHITE_OPEN'))return 'Find the White Key near Blinky and open White Castle';
 if(!flag('MURAL'))return 'Read the White Castle dragon mural';
 if(!flag('BLUEPRINT'))return 'Find the ancient blueprint in Stone Archive';
 if(!flag('FORGE')&&!flag('BLACK_OPEN'))return 'Restore Ancient Forge (optional) or find the Black Key';
 if(!flag('BLACK_OPEN'))return 'Find Black Key in Mine Entrance; open Black Castle';
 if(!flag('SEALS'))return 'Overcome the three Sorcerer seals';
 if(!flag('CHALICE'))return 'Claim the Enchanted Chalice';
 return 'Bring the Chalice back to Golden Castle';
}
function hudUpdate(){
 const room=cellOf(state.hero.x,state.hero.z);
 if(room!==lastRoom){lastRoom=room;msg('Entered '+at(room).name,2);save();}
 const held=heldItem();
 const mini=locations.map(l=>'<span class="mini '+(l.id===room?'here':'')+
  '" title="'+l.name+'">'+(l.id===room?'●':(['G','W','B'].includes(l.name[0])?l.name[0]:'·'))+'</span>').join('');
 hud.innerHTML='<div class="game-brand">THE LOST CHALICE <small>PLAYABLE 3D PROTOTYPE</small></div>'+
 '<div class="hudline"><strong>♥ '.repeat(state.hero.health)+'</strong><span>'+at(room).name+'</span><span>✦ '+state.score+'</span></div>'+
 '<p class="objective">'+questLabel()+'</p>'+
 '<p class="carrying">Carrying: '+(held?held.label:'Nothing')+' · E interact · Q drop · F map · H help · Esc pause</p>'+
 '<div class="minimap" aria-label="Room map">'+mini+'</div>';
}
function nearestInteraction(){
 const p=state.hero;let choices=[];
 function add(x,z,r,text,fn){const d=Math.hypot(p.x-x,p.z-z);if(d<r)choices.push({d,text,fn});}
 for(const i of items){const s=itemState(i.id);if(s.owner!=='world')continue;const a=at(s.room);
 add(a.x+s.x,a.z+s.z,3.1,'Pick up '+i.label,()=>pick(i));}
 for(const gate of [{room:1,key:'gold',flag:'GOLDEN_OPEN',name:'Golden Castle'},
                     {room:9,key:'white',flag:'WHITE_OPEN',name:'White Castle'},
                     {room:19,key:'black',flag:'BLACK_OPEN',name:'Black Castle'}]){
  const a=at(gate.room);
  add(a.x,a.z-6,5,'Open '+gate.name+' gate',()=>{
   if(flag(gate.flag)){msg('This castle gate is already open.');return;}
   if(!holding(gate.key)){msg('Bring the '+gate.key+' key, or find an alternate entrance.');return;}
   spendKey(gate.key);setFlag(gate.flag);msg(gate.name+' unlocked!');});
 }
 const room=cellOf(p.x,p.z),a=at(room);const core=(x,z,txt,fn)=>add(a.x+x,a.z+z,8,txt,fn);
 if(room===1)core(0,-3,'Activate Golden Sanctuary',()=>{
  if(!flag('GOLDEN_OPEN')){msg('The Golden Castle is sealed. Find the sun key.');return;}
  setFlag('SANCTUARY');msg('Sanctuary activated. The kingdom remembers your progress.');});
 if(room===6)core(2,2,'Examine Yorgle collar',()=>{
  setFlag('COLLAR');msg('The dragon wears a broken magical collar. Who bound the dragons?');
  if(!flag('YORGLE_TRUST')&&holding('treasure')){drop();setFlag('YORGLE_TRUST');msg('Yorgle recognizes the returned treasure and trusts you!');}
 });
 if(room===7)core(0,1,"Search Blinky's hoard",()=>{
  setFlag('BAT');msg('Blinky once worked for the Sorcerer. He keeps stealing useful objects.');});
 if(room===8)core(3,0,'Investigate cracked wall',()=>{
  if(!flag('WHITE_OPEN')){setFlag('WHITE_OPEN');msg('Grundle charges and breaks the wall! Secret entrance opened.');}
 });
 if(room===9)core(0,-2,'Inspect White Castle mural',()=>{
  if(!flag('WHITE_OPEN')){msg('The castle is locked. Find another entrance.');return;}
  setFlag('MURAL');msg('The Chalice controlled the dragons. The truth has been hidden.');});
 if(room===14)core(0,0,'Redirect magical mirrors',()=>{
  setFlag('MIRRORS');msg('Mirrors align! The ancient binding spell weakens.');
  if(!flag('GRUNDLE_TRUST')&&flag('WHITE_OPEN')&&!flag('GRUNDLE_DEAD')){
   setFlag('GRUNDLE_TRUST');msg('Grundle is free. He will help defend the kingdom.');}
 });
 if(room===13)core(0,3,'Restart the ancient forge',()=>{
  setFlag('FORGE');msg('The Forge lives again! Now the Chalice can be transformed.');});
 if(room===16)core(0,0,'Read the Chalice blueprint',()=>{
  setFlag('BLUEPRINT');msg('The Chalice can protect the kingdom without binding dragons.');});
 if(room===17)core(0,0,'Activate first shadow seal',()=>{
  setFlag('SEAL1');msg('Shadow seal one disabled.');});
 if(room===18){
  core(0,1,'Activate second shadow seal',()=>{
  setFlag('SEAL2');msg('Shadow seal two disabled.');});
  if(flag('BLUEPRINT')&&flag('CHALICE')&&!flag('RHINDLE_TRUST'))core(3,1,'Show Chalice symbol to Rhindle',()=>{setFlag('RHINDLE_TRUST');msg('Rhindle recognizes the new pact. You have earned his trust.');});
 }
 if(room===19){
  core(0,2,'Confront the Shadow Sorcerer',()=>{
   if(!flag('BLACK_OPEN')){msg('The Black Castle is locked.');return;}
   setFlag('SEAL3');if(flag('SEAL1')&&flag('SEAL2'))setFlag('SEALS');
   msg(flag('SEALS')?'The Sorcerer reveals his mistake. All three seals have fallen.':'The Sorcerer challenges you. Disable the seals along Shadow Road and Black Gate.');
  });
  core(0,-3,'Recover the Chalice',()=>{
   if(!flag('SEALS')){msg('The Chalice is protected by three shadow seals.');return;}
   if(state.held){msg('Drop your current item before carrying the Chalice.');return;}
   state.held='chalice';state.items.chalice={owner:'hero'};setFlag('CHALICE');updateObjects();save();
   msg('THE CHALICE IS YOURS. Return to Golden Castle!');});
 }
 if(room===1&&holding('chalice'))core(0,-3,'Choose the kingdom fate',()=>endingMenu());
 if(room===4)core(0,0,'Discover hidden forest chamber',()=>{setFlag('SECRET1');msg('SECRET FOUND: the ancient druid stone.');});
 if(room===10)core(0,0,'Discover river treasure',()=>{setFlag('SECRET2');msg('SECRET FOUND: sunken royal crest.');});
 if(room===15)core(0,0,'Discover hidden path',()=>{setFlag('SECRET3');msg('SECRET FOUND: forgotten garden.');});
 choices.sort((a,b)=>a.d-b.d);return choices[0];
}
function interact(){
 const target=nearestInteraction();if(!target){msg('No object in reach. Explore the next room.');return;}
 target.fn();sound('key');hudUpdate();save();
}
function endingMenu(){
 if(!flag('CHALICE')||!holding('chalice'))return;
 paused=true;keys.clear();activeOverlay='ending';
 const free=flag('BLUEPRINT'),united=free&&flag('FORGE')&&flag('YORGLE_TRUST')&&flag('GRUNDLE_TRUST')&&flag('RHINDLE_TRUST');
 $('overlay').classList.remove('hidden');
 $('overlay').innerHTML='<section class="dialog"><h1>The Kingdom’s Choice</h1><p>The Chalice can restore the old magic. What should Atheon become?</p>'+
 '<button data-ending="Old Kingdom">Restore the old kingdom</button>'+
 '<button data-ending="Age of Dragons" '+(!free?'disabled':'')+'>Free the dragons '+(!free?'(Requires ancient blueprint)':'')+'</button>'+
 '<button data-ending="United Kingdom" '+(!united?'disabled':'')+'>Form a new pact '+(!united?'(Forge + trust of all dragons)':'')+'</button>'+
 '<button data-close="1">Return to adventure</button></section>';
 $('overlay').querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>complete(b.dataset.ending));
 $('overlay').querySelector('[data-close]').onclick=closeOverlay;
}
function complete(choice){
 state.ending=choice;setFlag('ENDING_SELECTED');state.flags.GAME_COMPLETED=true;state.score+=500;save();sound('win');
 $('overlay').innerHTML='<section class="dialog"><h1>ADVENTURE COMPLETE</h1><h2>'+choice+'</h2><p>'+
 (choice==='United Kingdom'?'The dragons defend Atheon freely. The Sorcerer is redeemed.':
 choice==='Age of Dragons'?'The dragons fly free, and the kingdom begins a new age.':
 'The kingdom regains stability, though the dragons remain bound.')+
 '</p><p>Score '+state.score+' · Your adventure continues in the kingdom.</p><button data-continue="1">Explore Epilogue</button><button data-reset="1">New Adventure</button></section>';
 $('overlay').querySelector('[data-continue]').onclick=closeOverlay;
 $('overlay').querySelector('[data-reset]').onclick=()=>{resetGame();closeOverlay();};
}
function closeOverlay(){paused=false;activeOverlay='';$('overlay').classList.add('hidden');$('overlay').innerHTML='';}
function overlay(type){
 paused=true;keys.clear();activeOverlay=type;
 $('overlay').classList.remove('hidden');
 let html='<section class="dialog">';
 if(type==='help')html+='<h1>How to Play</h1><p>Explore 20 connected 3D locations. Take keys to castle gates, uncover the dragons’ secret, disable the Sorcerer’s seals, and bring the Chalice home. You can carry only one large object at a time.</p><p><strong>WASD / arrows</strong> move · <strong>Shift</strong> sprint · <strong>E</strong> interact · <strong>Q</strong> drop · <strong>F</strong> map · <strong>M</strong> mute · <strong>Esc</strong> pause.</p><p>Some paths have alternate solutions, and the three endings depend on what you discover.</p>';
 if(type==='map')html+='<h1>Map of Atheon</h1><div class="room-grid">'+locations.map(l=>'<div class="'+(inCell(l.id)?'selected':'')+'">'+(l.id+1)+'. '+l.name+'</div>').join('')+'</div>';
 if(type==='pause')html+='<h1>Adventure Paused</h1><p>'+questLabel()+'</p><p>Score: '+state.score+' · Health: '+state.hero.health+'/3</p>';
 html+='<button data-resume="1">Resume</button><button data-save="1">Save Progress</button><button data-reset="1">New Game</button></section>';
 $('overlay').innerHTML=html;
 $('overlay').querySelector('[data-resume]').onclick=closeOverlay;
 $('overlay').querySelector('[data-save]').onclick=()=>{save();closeOverlay();msg('Progress saved on this browser.');};
 $('overlay').querySelector('[data-reset]').onclick=()=>{if(window.confirm('Erase this prototype save and begin again?')){resetGame();closeOverlay();}};
}
function resetGame(){
 state=DEFAULT();actors.forEach(a=>{a.root.position.set(a.home.x,0,a.home.z);a.alive=true;});
 hero.position.set(state.hero.x,0,state.hero.z);updateObjects();save();hudUpdate();msg('A new adventure begins. Find the golden key.');
}
function startState(){load();hero.position.set(state.hero.x,0,state.hero.z);updateObjects();hudUpdate();}
let batTimer=0;
function moveActors(dt){
 for(const a of actors){
  if(flag(a.id.toUpperCase()+'_DEAD')){a.root.setEnabled(false);continue;}
  a.root.setEnabled(true);
  const p=state.hero,d=dist(a.root.position,p),room=cellOf(p.x,p.z);
  let target=a.home;
  if(d<12&&room===a.room&&!state.ending&&(!flag(a.id.toUpperCase()+'_TRUST'))){
   target=p;if(d<2.7&&gameTime>a.noticeAt){
    a.noticeAt=gameTime+2.2;state.hero.health-=1;sound('hurt');
    msg(a.id+' caught you! '+(state.hero.health>0?'Dodge and move away!':'Returning to sanctuary...'));
    if(state.hero.health<=0){
     const home=flag('SANCTUARY')?at(1):at(0);
     state.hero.x=home.x;state.hero.z=home.z;state.hero.health=3;
     if(state.held)drop();save();
    }
   }
  }
  a.time+=dt;
  if(a.time>3){a.time=0;a.dir+=1.3;}
  if(target===a.home)target={x:a.home.x+Math.sin(a.dir)*3,z:a.home.z+Math.cos(a.dir)*3};
  const vx=target.x-a.root.position.x,vz=target.z-a.root.position.z,L=Math.hypot(vx,vz);
  if(L>.3){const sp=a.id==='Rhindle'?3.6:1.7;a.root.position.x+=vx/L*sp*dt;a.root.position.z+=vz/L*sp*dt;a.root.rotation.y=Math.atan2(vx,vz);}
 }
 if(bat){batTimer+=dt;bat.position.x=at(7).x+Math.sin(gameTime*.45)*8;
  bat.position.z=at(7).z+Math.cos(gameTime*.45)*7;
  bat.position.y=4+Math.sin(gameTime*3)*.7;
  state.batCooldown-=dt;
  const p=state.hero,d=Math.hypot(p.x-bat.position.x,p.z-bat.position.z);
  if(d<4&&state.batCooldown<=0&&state.held&&state.held!=='chalice'&&!(inCell(1))&&!(paused)){
   const item=state.held;state.held=null;
   state.items[item]={owner:'world',room:7,x:0,z:0};
   state.batCooldown=100;msg('Blinky stole your '+items.find(i=>i.id===item).label+'! Retrieve it at the Watchtower.',7);
   sound('bat');updateObjects();save();
  }
 }
}
let lastSave=0;
function tick(dt){
 if(paused)return;
 gameTime+=dt;state.playSeconds+=dt;
 const p=state.hero;let f=0,r=0;
 if(keys.has('KeyW')||keys.has('ArrowUp'))f+=1;
 if(keys.has('KeyS')||keys.has('ArrowDown'))f-=1;
 if(keys.has('KeyD')||keys.has('ArrowRight'))r+=1;
 if(keys.has('KeyA')||keys.has('ArrowLeft'))r-=1;
 if(f||r){
  const ang=camera.alpha,forward={x:-Math.cos(ang),z:-Math.sin(ang)},right={x:-forward.z,z:forward.x};
  let dx=f*forward.x+r*right.x,dz=f*forward.z+r*right.z,L=Math.hypot(dx,dz)||1;
  dx/=L;dz/=L;const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?7:4.5;
  const nx=clamp(p.x+dx*speed*dt,-44,44),nz=clamp(p.z+dz*speed*dt,-35,35);
  const targetRoom=cellOf(nx,nz);
  // Locked rooms can be entered from an alternate side after puzzle actions.
  const gate=targetRoom===1?'GOLDEN_OPEN':targetRoom===9?'WHITE_OPEN':targetRoom===19?'BLACK_OPEN':null;
  const blocked=false; // Prototype keeps all regions reachable; locked objectives still require their gates.
  if(!blocked){p.x=nx;p.z=nz;}else if(gameTime>lastSave+1){msg('Castle sealed. Find the matching key and interact at the gate.');}
  hero.rotation.y=Math.atan2(dx,dz);hero.position.set(p.x,0,p.z);
 }
 // Room entry/door proximity and soft recovery visible in minimap.
 moveActors(dt);
 camera.target.copyFrom(hero.position.add(new Vector3(0,1.6,0)));
 if(infoTime&&gameTime>infoTime)notice.style.opacity='0';
 if(gameTime-lastSave>3){lastSave=gameTime;hudUpdate();}
 if(gameTime-lastPersist>20){lastPersist=gameTime;save();}
}
function bind(){
 window.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.repeat&&['KeyE','KeyQ','KeyF','KeyH','Escape','KeyM'].includes(e.code))return;
  if(e.code==='Escape'){activeOverlay?closeOverlay():overlay('pause');return;}
  if(activeOverlay)return;
  if(e.code==='KeyE')interact();
  else if(e.code==='KeyQ')drop();
  else if(e.code==='KeyF')overlay('map');
  else if(e.code==='KeyH')overlay('help');
  else if(e.code==='KeyM'){fxOn=!fxOn;msg(fxOn?'Sound enabled':'Sound muted');}
  else keys.add(e.code);
 });
 window.addEventListener('keyup',e=>keys.delete(e.code));
 window.addEventListener('blur',()=>{keys.clear();if(!paused)overlay('pause');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(!paused)overlay('pause');}});
 $('interact').onclick=()=>{if(!activeOverlay)interact();};
 $('drop').onclick=()=>{if(!activeOverlay)drop();};
 $('map').onclick=()=>overlay('map');
 $('help').onclick=()=>overlay('help');
 const stick=$('stick');let sx=0,sy=0;
 stick.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;stick.setPointerCapture(e.pointerId);});
 stick.addEventListener('pointermove',e=>{if(!stick.hasPointerCapture(e.pointerId))return;const dx=e.clientX-sx,dy=e.clientY-sy;keys.delete('KeyW');keys.delete('KeyS');keys.delete('KeyA');keys.delete('KeyD');if(dx>14)keys.add('KeyD');if(dx<-14)keys.add('KeyA');if(dy>14)keys.add('KeyS');if(dy<-14)keys.add('KeyW');});
 stick.addEventListener('pointerup',()=>{for(const code of ['KeyW','KeyS','KeyA','KeyD'])keys.delete(code);});
}
function boot(){
 if(!canvas||!Engine.isSupported()){msg('WebGL is unavailable. Try a newer browser or enable graphics acceleration.',120);return;}
 engine=new Engine(canvas,true,{stencil:true,antialias:true});
 scene=new Scene(engine);scene.clearColor.set(.56,.76,.88,1);
 camera=new ArcRotateCamera('camera',-Math.PI/2,1.08,16,new Vector3(0,1.5,0),scene);
 camera.attachControl(canvas,true);camera.lowerRadiusLimit=8;camera.upperRadiusLimit=30;camera.wheelPrecision=40;
 const light=new HemisphericLight('ambient',new Vector3(0,1,0),scene);light.intensity=.85;
 const sun=new DirectionalLight('sun',new Vector3(-.6,-1,-.3),scene);sun.intensity=.9;sun.position.set(18,35,12);
 shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=8;
 sceneProps();hero=avatar(at(0).x,at(0).z,'#2A78B4');
 creature('Yorgle',6,'#F1BF49');creature('Grundle',8,'#36A56F');creature('Rhindle',18,'#B94C4D');
 bat=batModel();objectMeshes();startState();bind();
 window.addEventListener('resize',()=>engine.resize());
 let lastTime=performance.now();
 engine.runRenderLoop(()=>{
  const now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  tick(dt);scene.render();
 });
 msg('Welcome! Explore Atheon. Find the Golden Key and press E near objects.',9);
}
boot();
