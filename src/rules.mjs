// Pure gameplay rules for the browser and Node tests.
export const ENDINGS=Object.freeze({
 OLD:'Old Kingdom',FREE:'Age of Dragons',UNITED:'United Kingdom'
});
export function endingEligibility(flags={}){
 const atPedestal=Boolean(flags.CHALICE_AT_GOLDEN_PEDESTAL||flags.CHALICE);
 const blueprint=Boolean(flags.BLUEPRINT);
 const forge=Boolean(flags.FORGE);
 const trust=Boolean(flags.YORGLE_TRUST&&flags.GRUNDLE_TRUST&&flags.RHINDLE_TRUST);
 return {
  old:atPedestal,
  free:atPedestal&&blueprint,
  united:atPedestal&&blueprint&&forge&&trust
 };
}
export function mayEarnTrust(flags={},dragon){
 if(!['YORGLE','GRUNDLE','RHINDLE'].includes(dragon))return false;
 return !Boolean(flags[dragon+'_DEAD']||flags[dragon+'_TRUST']);
}
export function inventoryConsistent(items={},heldId=null){
 const carried=Object.entries(items).filter(([,v])=>v?.owner==='hero').map(([id])=>id);
 return (!heldId&&carried.length===0)||(carried.length===1&&carried[0]===heldId);
}
export function baseEndingPossible(flags={}){
 return !!endingEligibility({...flags,CHALICE_AT_GOLDEN_PEDESTAL:true}).old;
}
