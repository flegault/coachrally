(function(global){
'use strict';

const POSITIONS=['1B','2B','3B','AC','L1','L2'];
const PITCH=new Set(['L1','L2']);

function combinations(items,size){
  const result=[];
  function visit(start,current){
    if(current.length===size){result.push(current.slice());return}
    for(let index=start;index<=items.length-(size-current.length);index++){
      current.push(items[index]);
      visit(index+1,current);
      current.pop();
    }
  }
  visit(0,[]);
  return result;
}

function averageTotal(stats){
  const values=Object.values(stats);
  return values.length?values.reduce((sum,item)=>sum+item.total,0)/values.length:0;
}

function batterCounts(playerIds,batterIdsByInning,fixed){
  const counts={};
  playerIds.forEach(id=>counts[id]=0);
  if(fixed)(batterIdsByInning||[]).forEach(ids=>(ids||[]).forEach(id=>{if(id in counts)counts[id]++}));
  return counts;
}

function assignPositions(defenderIds,previousPitchers,stats,rules){
  const ids=defenderIds.slice(),positions={},used=new Set();
  const scoreFor=id=>stats[id]||rules.emptyStats();
  let firstBase=ids.filter(id=>(scoreFor(id).pos['1B']||0)===0);
  if(!firstBase.length)firstBase=ids.slice();
  firstBase.sort((a,b)=>((scoreFor(a).pos['1B']||0)-(scoreFor(b).pos['1B']||0))||(scoreFor(a).def-scoreFor(b).def)||(scoreFor(a).total-scoreFor(b).total));
  const one=firstBase[0];
  if(one){positions[one]='1B';used.add(one)}

  let pitchers=ids.filter(id=>!used.has(id)&&!previousPitchers.has(id));
  if(pitchers.length<2)pitchers=ids.filter(id=>!used.has(id));
  pitchers.sort((a,b)=>{
    const sa=scoreFor(a),sb=scoreFor(b);
    const va=(sa.pos['1B']||0)*8+(sa.pos.L1||0)+(sa.pos.L2||0)*1.2+sa.def*.4+sa.total*.2;
    const vb=(sb.pos['1B']||0)*8+(sb.pos.L1||0)+(sb.pos.L2||0)*1.2+sb.def*.4+sb.total*.2;
    return va-vb;
  });
  const p1=pitchers[0],p2=pitchers.find(id=>id!==p1);
  if(p1){positions[p1]='L1';used.add(p1)}
  if(p2){positions[p2]='L2';used.add(p2)}

  const remaining=ids.filter(id=>!used.has(id));
  ['2B','3B','AC'].forEach(position=>{
    if(!remaining.length)return;
    remaining.sort((a,b)=>((scoreFor(a).pos[position]||0)-(scoreFor(b).pos[position]||0))||(scoreFor(a).def-scoreFor(b).def)||a.localeCompare(b));
    const id=remaining.shift();positions[id]=position;used.add(id);
  });
  remaining.forEach(id=>{const free=POSITIONS.find(position=>!Object.values(positions).includes(position));if(free)positions[id]=free});
  return positions;
}

function generateInning(options){
  const rules=options.rules||global.RallyeCapRules;
  if(!rules)throw new Error('RallyeCapRules est requis.');
  const playerIds=(options.playerIds||[]).map(String),prior=options.priorSchedule||[],inning=Number(options.inning)||0;
  const previous=prior[inning-1],previousBench=new Set(),previousPitchers=new Set();
  if(previous)playerIds.forEach(id=>{const position=previous.pos[id];if(!position)previousBench.add(id);if(PITCH.has(position))previousPitchers.add(id)});
  const batterIdsByInning=options.batterIdsByInning||[],batters=new Set(options.fixed?(batterIdsByInning[inning]||[]):[]);
  const counts=batterCounts(playerIds,batterIdsByInning,options.fixed);
  const stats=rules.collectStats(prior,playerIds,counts,options.fixed);
  let best=null,bestScore=Infinity;
  for(const combo of combinations(playerIds,Math.min(6,playerIds.length))){
    const selected=new Set(combo);let score=0,nonBatters=0;
    previousBench.forEach(id=>{if(!selected.has(id))score+=100000});
    combo.forEach(id=>{if(!batters.has(id))nonBatters++});
    score-=nonBatters*30;
    combo.forEach(id=>{const item=stats[id]||rules.emptyStats();score+=item.def*7+item.total*4;if(batters.has(id))score+=2});
    playerIds.filter(id=>!selected.has(id)).forEach(id=>{const item=stats[id]||rules.emptyStats();score+=item.bench*9;if((item.total||0)<averageTotal(stats))score+=4});
    if(score<bestScore){bestScore=score;best=combo}
  }
  return{pos:assignPositions(best||playerIds.slice(0,6),previousPitchers,stats,rules)};
}

function generateSchedule(options){
  const schedule=[];
  for(let inning=0;inning<Number(options.innings||0);inning++)schedule.push(generateInning(Object.assign({},options,{inning,priorSchedule:schedule})));
  return schedule;
}

global.RallyeCapLineupEngine={generateInning,generateSchedule};
})(typeof window!=='undefined'?window:globalThis);
