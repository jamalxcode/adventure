// Original 3D developer scaffold, not full gameplay.
import './style.css';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, TransformNode, ShadowGenerator } from '@babylonjs/core';
const canvas=document.getElementById('game');
const status=document.getElementById('status');
if(!canvas||!Engine.isSupported()){
 if(status) status.textContent='WebGL 3D graphics are unavailable on this device. Try a modern browser with hardware acceleration.';
} else {
 const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true});
 const scene=new Scene(engine);scene.clearColor.set(.62,.81,.91,1);
 const camera=new ArcRotateCamera('camera',-Math.PI/2,1.05,26,new Vector3(0,1,0),scene);
 camera.attachControl(canvas,true);camera.lowerRadiusLimit=10;camera.upperRadiusLimit=43;camera.wheelPrecision=35;
 const sky=new HemisphericLight('skyLight',new Vector3(0,1,0),scene);sky.intensity=.65;
 const sun=new DirectionalLight('sun',new Vector3(-.6,-1,-.4),scene);sun.position.set(20,35,18);sun.intensity=1.1;
 const shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=10;
 function mat(name,hex){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);return m;}
 const grass=mat('grass','#5DAB69'),path=mat('path','#CDB68B'),stone=mat('stone','#D8CEAE'),gold=mat('gold','#F0BA4D'),roof=mat('roof','#527C8B'),green=mat('leaf','#277850'),trunk=mat('trunk','#82604D'),skin=mat('skin','#E8B98B'),tunic=mat('tunic','#287BA5'),hair=mat('hair','#382F32'),black=mat('black','#302735'),chaliceGold=mat('chalice','#FFE46B');
 function box(name,w,h,d,x,y,z,material,cast=true){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;m.receiveShadows=true;if(cast)shadows.addShadowCaster(m);return m;}
 function sphere(name,r,x,y,z,material){const m=MeshBuilder.CreateSphere(name,{diameter:r*2,segments:12},scene);m.position.set(x,y,z);m.material=material;shadows.addShadowCaster(m);return m;}
 const ground=box('meadow',80,.4,65,0,-.2,0,grass,false);ground.receiveShadows=true;
 box('stone path',4,.04,47,0,.03,4,path,false);
 box('castle hall',13,8,7,0,4,-19,stone);
 box('central gate',3.7,4,.2,0,2,-15.35,black);
 for(const x of [-7.2,7.2]){box('tower',3.4,12,3.4,x,6,-17.5,stone);const cap=MeshBuilder.CreateCylinder('tower roof',{diameterTop:0,diameterBottom:4.6,height:3,tessellation:4},scene);cap.position.set(x,13.5,-17.5);cap.rotation.y=Math.PI/4;cap.material=roof;shadows.addShadowCaster(cap);}
 for(const x of [-4.8,-2.8,2.8,4.8])box('battlement',1.3,1.5,1.2,x,8.7,-15.8,stone);
 for(let i=0;i<26;i++){const a=i*2.399,r=12+(i%4)*5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<4.5&&z>-14&&z<20)continue;box('tree trunk',.7,3,.7,x,1.5,z,trunk);const canopy=MeshBuilder.CreateSphere('foliage',{diameter:4.5,segments:5},scene);canopy.position.set(x,4.3,z);canopy.material=green;shadows.addShadowCaster(canopy);}
 const hero=new TransformNode('hero',scene);hero.position.set(0,0,12);
 const body=box('hero torso',1.2,1.45,.65,0,1.65,12,tunic);body.parent=hero;body.position.set(0,1.65,0);
 const head=sphere('hero head',.63,0,2.7,0,skin);head.parent=hero;head.position.set(0,2.7,0);
 const haircap=box('hair',1.05,.3,1.05,0,3.2,0,hair);haircap.parent=hero;
 for(const sx of [-1,1]){const arm=box('hero arm',.38,1,.44,sx*.85,1.6,0,skin);arm.parent=hero;const leg=box('hero leg',.44,.75,.48,sx*.32,.46,0,black);leg.parent=hero;}
 const chalice=new TransformNode('chalice anchor',scene);chalice.position.set(5,0,7);
 const stem=MeshBuilder.CreateCylinder('chalice stem',{height:1,diameter:.25},scene);stem.parent=chalice;stem.position.y=1;stem.material=chaliceGold;
 const cup=MeshBuilder.CreateCylinder('chalice bowl',{height:.65,diameterTop:1.15,diameterBottom:.5,tessellation:16},scene);cup.parent=chalice;cup.position.y=1.7;cup.material=chaliceGold;
 const base=MeshBuilder.CreateCylinder('chalice base',{height:.18,diameter:.75},scene);base.parent=chalice;base.position.y=.48;base.material=chaliceGold;
 sphere('dragon body',1.65,-7,1.65,4,gold);sphere('dragon head',1.12,-7,3.1,5.2,gold);box('dragon neck',.85,1,.85,-7,2.5,4.75,gold);
 const keys=new Set();
 window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.code);});
 window.addEventListener('keyup',e=>keys.delete(e.code));
 let last=performance.now();
 engine.runRenderLoop(()=>{const now=performance.now(),delta=Math.min(.05,(now-last)/1000);last=now;const dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),norm=Math.hypot(dx,dz)||1;hero.position.x=Math.max(-35,Math.min(35,hero.position.x+dx/norm*5*delta));hero.position.z=Math.max(-11,Math.min(30,hero.position.z+dz/norm*5*delta));if(dx||dz)hero.rotation.y=Math.atan2(dx,-dz);chalice.rotation.y+=delta*.6;camera.target.copyFrom(hero.position.add(new Vector3(0,1.3,0)));scene.render();});
 window.addEventListener('resize',()=>engine.resize());
 status.textContent='3D preview only. WASD / arrows move; drag rotates camera. Full game mechanics are specified in docs.';
}
