(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.RallyeCapBattingOrder=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function unique(ids){return(Array.isArray(ids)?ids:[]).map(String).filter((id,i,all)=>id&&all.indexOf(id)===i)}
  function rotateFrom(ids,startId){
    if(!ids.length)return[];
    const start=Math.max(0,ids.indexOf(String(startId||'')));
    return ids.slice(start).concat(ids.slice(0,start));
  }
  function buildInning(options){
    const activeOrder=unique(options?.order),active=new Set(activeOrder),order=unique(options?.rotationOrder).filter(id=>active.has(id));
    activeOrder.forEach(id=>{if(!order.includes(id))order.push(id)});
    const pending=unique(options?.pending).filter(id=>active.has(id));
    if(!order.length)return{ids:[],nextId:null,pending:[]};
    const cursor=active.has(String(options?.nextId||''))?String(options.nextId):order[0];
    const priority=pending.slice(0,6),prioritySet=new Set(priority),regular=rotateFrom(order,cursor).filter(id=>!prioritySet.has(id));
    const regularNeeded=Math.max(0,Math.min(6,order.length)-priority.length),regularBatters=regular.slice(0,regularNeeded);
    const ids=priority.concat(regularBatters),remainingPending=pending.filter(id=>!prioritySet.has(id));
    let nextId=cursor;
    if(options?.rotateSix&&order.length===6&&!priority.length){
      nextId=order[(order.indexOf(cursor)+1)%order.length];
    }else if(regularBatters.length){
      const last=regularBatters[regularBatters.length-1];
      const afterLast=order.slice(order.indexOf(last)+1).concat(order.slice(0,order.indexOf(last)+1));
      nextId=afterLast.find(id=>!prioritySet.has(id))||cursor;
    }
    let nextOrder=order.slice();
    if(priority.length&&nextId){
      nextOrder=nextOrder.filter(id=>!prioritySet.has(id));
      const insertAt=nextOrder.indexOf(nextId)+1;
      nextOrder.splice(insertAt,0,...priority);
    }
    return{ids,nextId,pending:remainingPending,order:nextOrder}
  }
  function removePlayer(rotation,id,order){
    const full=unique(order),removed=String(id),active=full.filter(playerId=>playerId!==removed),current=String(rotation?.nextId||'');
    let nextId=active.includes(current)?current:null;
    if(!nextId&&active.length){const index=full.indexOf(removed);nextId=full.slice(index+1).concat(full.slice(0,index)).find(playerId=>playerId!==removed)||active[0]}
    return{nextId,pending:unique(rotation?.pending).filter(playerId=>playerId!==removed&&active.includes(playerId)),order:unique(rotation?.order).filter(playerId=>playerId!==removed&&active.includes(playerId))}
  }
  return{buildInning,removePlayer};
});
