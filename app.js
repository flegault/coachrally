(function(){
'use strict';
const KEY='rallye_cap_qc_v5';
const MIN=6,MAX=12,MIN_INN=4,MAX_INN=9;
const POSITIONS=['1B','2B','3B','AC','L1','L2'];
const PITCH=new Set(['L1','L2']);
const LEGEND={ '1B':'Premier but','2B':'Deuxième but','3B':'Troisième but','AC':'Arrêt-court','L1':'Lanceur 1 🧢','L2':'Lanceur 2 🧢','B':'Banc','L':'Lanceurs 🧢'};
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const escAttr=s=>esc(s).replace(/'/g,'&#39;');
const cleanNumber=v=>String(v??'').replace(/[^\d]/g,'').slice(0,2);
function normalizeTeamPublicId(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,40)}
function normalizeTeamPublicIdDraft(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+/,'').replace(/-{2,}/g,'-').slice(0,40)}
function validTeamPublicId(v){let s=String(v||'');return s.length>=3&&s.length<=40&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s)}
const cleanFanMessage=v=>String(v??'').replace(/\r\n?/g,'\n').slice(0,300);
function miniMarkdownInline(text){return esc(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>')}
function renderMiniMarkdownHtml(text){
  let html=[],list=[];
  let flush=()=>{if(list.length){html.push('<ul>'+list.map(item=>'<li>'+miniMarkdownInline(item)+'</li>').join('')+'</ul>');list=[]}};
  cleanFanMessage(text).split('\n').forEach(line=>{
    let trimmed=line.trim();
    if(!trimmed){flush();return}
    let item=trimmed.match(/^-\s+(.+)/);
    if(item)list.push(item[1]);
    else{flush();html.push('<p>'+miniMarkdownInline(trimmed)+'</p>')}
  });
  flush();
  return html.join('')
}
function miniMarkdownLines(text){
  return cleanFanMessage(text).split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^-\s+/,'• ').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1')).slice(0,8)
}
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const cloudClientId=(()=>{try{let k='rallye_cap_cloud_client_id',v=sessionStorage.getItem(k);if(!v){v=uid();sessionStorage.setItem(k,v)}return v}catch(e){return uid()}})();
let state=loadState();
let cloud={module:null,user:null,enabled:null,status:'local',matchId:null,publicId:null,publicPassword:'',teamPublicId:null,teamPublicPassword:'',unsubAuth:null,unsubMatch:null,unsubPrivateTeam:null,unsubPublic:null,unsubPublicTeam:null,matchListenToken:0,teamListenToken:0,lastRemoteMs:0,lastLocalMs:0,lastPayloadJson:'',lastPublicPayloadJson:'',teamPayloads:{},saving:false,pendingSave:false,clientId:cloudClientId,publicView:null,publicIdRoute:null,publicTeamView:null,publicTeamRoute:null,publicFavoriteContext:null,publicFavoriteKeys:[],publicCurrentIndex:null,publicPromptedIndex:null,publicUpdateAvailable:false,matches:[],matchesLoading:false,matchesLoaded:false,teams:[],teamsLoading:false,teamsLoaded:false,publicTeams:[],publicTeamsLoading:false,publicTeamsLoaded:false};
let cloudSaveTimer=null,privateTeamSaveTimer=null,publicMatchSaveTimer=null,publicTeamSaveTimer=null,suppressCloudSave=false,suppressTeamCloudSave=false;
let analysis=null, problems=new Map(), dragRow=null, dragCell=null, selectedRow=null, selectedCol=null, selectedHalf=null, highlightPos=null, statSort={key:'order',dir:1}, matchTableSort={active:{key:'date',dir:-1},archived:{key:'date',dir:-1}}, matchIndex=0, spectatorTouched=false, touchStartX=0, coachMatchIndex=0, coachTouchStartX=0, optimizeDirty=true, lineupAutoDirty=false, addPlayersExpanded=false, selectedArchiveId=null, playView='complete', lineupScrollHintDismissed=false, lineupScrollInteracting=false;
function normalizeRoute(r){return['accueil','matchs','match','joueurs','alignement','jouer','a-propos'].includes(r)?r:'accueil'}
function routeTitle(r){let names={accueil:'Accueil',matchs:'Matchs',match:'Match',joueurs:'Joueurs',alignement:'Alignement',jouer:'Jouer','a-propos':'À propos'};return (names[r]||'Alignement')+' - CoachRally'}
function blankMatch(){return{id:uid(),teamId:null,schemaVersion:5,status:'draft',team:'',opp:'',date:'',time:'',place:'',fanMessage:'',side:'visiteur',fixed:true,innings:4,players:[],order:[],battingOrders:{},schedule:[],started:false,locks:{innings:{},halves:{}},cloud:{matchId:null,publicId:null,publicPassword:''},createdAtMs:Date.now(),updatedAtMs:Date.now()}}
function blankTeam(){let now=Date.now();return{id:uid(),name:'',publicId:null,publicSlug:'',publicPassword:'',fanMessage:'Merci de nous encourager!',roster:[],cloud:{enabled:false},createdAtMs:now,updatedAtMs:now}}
function defaults(){let m=blankMatch();return{schemaVersion:5,teams:[],activeTeamId:null,matches:[],activeMatchId:null,route:'accueil',teamProfile:{name:'',publicId:null,publicSlug:'',publicPassword:'',fanMessage:'Merci de nous encourager!',roster:[]},roster:[],team:m.team,opp:m.opp,date:m.date,time:m.time,place:m.place,fanMessage:m.fanMessage,side:m.side,fixed:m.fixed,innings:m.innings,players:m.players,order:m.order,battingOrders:m.battingOrders,schedule:m.schedule,started:m.started,locks:m.locks,cloud:m.cloud}}
function normalizeArchive(raw){
  if(!raw||typeof raw!=='object')return null;
  if(raw.schemaVersion===1&&raw.match&&Array.isArray(raw.players)){
    let ids=new Set();
    let players=raw.players.slice(0,40).map(p=>({id:String(p.id||uid()),name:String(p.name||'').trim().slice(0,60),number:cleanNumber(p.number),on:p.on!==false})).filter(p=>p.name&&!ids.has(p.id)&&ids.add(p.id)).slice(0,24);
    let idSet=new Set(players.map(p=>p.id));
    let innings=Math.min(MAX_INN,Math.max(MIN_INN,parseInt(raw.innings||4,10)||4));
    let order=(Array.isArray(raw.order)?raw.order:[]).map(String).filter(id=>idSet.has(id));players.forEach(p=>{if(!order.includes(p.id))order.push(p.id)});
    let schedule=(Array.isArray(raw.schedule)?raw.schedule:[]).slice(0,innings);while(schedule.length<innings)schedule.push({pos:{}});
    schedule=schedule.map(inn=>{let pos={};if(inn&&inn.pos&&typeof inn.pos==='object')Object.keys(inn.pos).forEach(id=>{if(idSet.has(id)&&POSITIONS.includes(String(inn.pos[id])))pos[id]=String(inn.pos[id])});return{pos}});
    let battingOrders={};if(raw.battingOrders&&typeof raw.battingOrders==='object')Object.keys(raw.battingOrders).forEach(k=>{let m=k.match(/^(\d+):(debut|fin)$/),i=m?parseInt(m[1],10):-1;if(m&&i>=0&&i<innings)battingOrders[k]=(Array.isArray(raw.battingOrders[k])?raw.battingOrders[k]:[]).map(String).filter(id=>idSet.has(id))});
    let locks={innings:{},halves:{}};if(raw.locks&&typeof raw.locks==='object'){let halves=raw.locks.halves&&typeof raw.locks.halves==='object'?raw.locks.halves:{};Object.keys(halves).forEach(k=>{let m=k.match(/^(\d+):(debut|fin)$/),i=m?parseInt(m[1],10):-1;if(m&&i>=0&&i<innings&&halves[k]===true)locks.halves[k]=true})}
    return{id:String(raw.id||uid()),schemaVersion:1,type:'match',completedAt:String(raw.completedAt||'').slice(0,40),match:{team:String(raw.match.team||'').slice(0,80),opp:String(raw.match.opp||'').slice(0,80),date:String(raw.match.date||'').slice(0,20),time:String(raw.match.time||'').slice(0,10),place:String(raw.match.place||'').slice(0,120),fanMessage:cleanFanMessage(raw.match.fanMessage),side:raw.match.side==='locale'?'locale':'visiteur'},fixed:raw.fixed!==false,innings,players,order,schedule,battingOrders,locks}
  }
  return{id:String(raw.id||uid()),schemaVersion:0,type:'legacy',completedAt:String(raw.completedAt||'').slice(0,40),team:String(raw.team||'').slice(0,80),opp:String(raw.opp||'').slice(0,80),date:String(raw.date||'').slice(0,20),time:String(raw.time||'').slice(0,10),place:String(raw.place||'').slice(0,120),side:raw.side==='locale'?'locale':'visiteur',players:Array.isArray(raw.players)?raw.players.slice(0,24).map(p=>({name:String(p.name||'').slice(0,60),number:cleanNumber(p.number),on:p.on!==false})):[],innings:parseInt(raw.innings||0,10)||0}
}
function normalizePlayers(list){
  let seen=new Set();
  return (Array.isArray(list)?list:[]).slice(0,40).map(p=>({id:String(p.id||uid()),name:String(p.name||'').trim().slice(0,60),number:cleanNumber(p.number),on:p.on!==false})).filter(p=>p.name&&!seen.has(p.id)&&seen.add(p.id)).slice(0,24)
}
function normalizeTeam(raw){
  let t=Object.assign(blankTeam(),raw&&typeof raw==='object'?raw:{});
  t.id=String(t.id||uid());
  t.name=String(t.name||'').trim().slice(0,80);
  t.publicId=t.publicId?String(t.publicId).slice(0,100):null;
  t.publicSlug=normalizeTeamPublicId(t.publicSlug||t.publicId||'');
  t.publicPassword=String(t.publicPassword||'').slice(0,120);
  t.fanMessage=cleanFanMessage(t.fanMessage);
  t.cloud={enabled:t.cloud?.enabled===true};
  t.roster=normalizePlayers(t.roster);
  t.createdAtMs=Number(t.createdAtMs)||Date.now();
  t.updatedAtMs=Number(t.updatedAtMs)||t.createdAtMs;
  return t
}
function activeTeam(){return state.teams.find(t=>t.id===state.activeTeamId)||null}
function matchesForActiveTeam(){let tid=state.activeTeamId;return state.matches.filter(m=>m.teamId===tid)}
function syncActiveTeamAliases(){
  let t=activeTeam();
  if(t){state.teamProfile=t;state.roster=t.roster}
  else{state.teamProfile={name:'',publicId:null,publicSlug:'',publicPassword:'',fanMessage:'Merci de nous encourager!',roster:[]};state.roster=[]}
  return t
}
function ensureActiveTeam(){
  let t=activeTeam();
  if(t)return t;
  t=blankTeam();
  state.teams.push(t);
  state.activeTeamId=t.id;
  syncActiveTeamAliases();
  return t
}
function activeTeamHasMatches(){let id=state.activeTeamId;return state.matches.some(m=>m.teamId===id)}
function activeTeamPublicId(){let team=activeTeam(),id=team?.publicId||null;if(!id)return null;let owner=state.teams.find(t=>t.publicId===id);return owner?.id===team.id?id:null}
function activeTeamHasPublicLink(){return !!activeTeamPublicId()}
function normalizeMatch(raw,roster){
  let m=Object.assign(blankMatch(),raw&&typeof raw==='object'?raw:{});
  m.id=String(m.id||uid());
  m.teamId=m.teamId?String(m.teamId):null;
  m.status=['draft','ready','active','completed','archived'].includes(m.status)?m.status:(m.started?'active':'draft');
  m.team=String(m.team||'').slice(0,80);
  m.opp=String(m.opp||'').slice(0,80);
  m.date=String(m.date||'').slice(0,20);
  m.time=String(m.time||'').slice(0,10);
  m.place=String(m.place||'').slice(0,120);
  m.fanMessage=cleanFanMessage(m.fanMessage);
  m.side=m.side==='locale'?'locale':'visiteur';
  m.fixed=m.fixed!==false;
  m.started=m.status==='active'||m.status==='completed'||m.started===true;
  m.innings=Math.min(MAX_INN,Math.max(MIN_INN,parseInt(m.innings||4,10)||4));
  m.players=normalizePlayers(m.players?.length?m.players:roster);
  let ids=new Set(m.players.map(p=>p.id));
  m.order=(Array.isArray(m.order)?m.order:[]).map(String).filter(id=>ids.has(id));
  m.players.forEach(p=>{if(!m.order.includes(p.id))m.order.push(p.id)});
  let activeSeen=0;
  m.order.forEach(id=>{let p=m.players.find(x=>x.id===id);if(p&&p.on!==false){activeSeen++;if(activeSeen>MAX)p.on=false}});
  m.players.forEach(p=>{if(p.on!==false&&!m.order.includes(p.id)){activeSeen++;if(activeSeen>MAX)p.on=false}});
  m.locks=m.locks&&typeof m.locks==='object'?m.locks:{innings:{},halves:{}};
  m.locks.innings=m.locks.innings&&typeof m.locks.innings==='object'?m.locks.innings:{};
  m.locks.halves=m.locks.halves&&typeof m.locks.halves==='object'?m.locks.halves:{};
  Object.keys(m.locks.innings).forEach(k=>{let i=parseInt(k,10);if(isNaN(i)||i<0||i>=m.innings)delete m.locks.innings[k]});
  Object.keys(m.locks.halves).forEach(k=>{let mm=k.match(/^(\d+):(debut|fin)$/),i=mm?parseInt(mm[1],10):-1;if(!mm||i<0||i>=m.innings)delete m.locks.halves[k]});
  m.battingOrders=m.battingOrders&&typeof m.battingOrders==='object'?m.battingOrders:{};
  Object.keys(m.battingOrders).forEach(k=>{let mm=k.match(/^(\d+):(debut|fin)$/),i=mm?parseInt(mm[1],10):-1;if(!mm||i<0||i>=m.innings){delete m.battingOrders[k];return}m.battingOrders[k]=(Array.isArray(m.battingOrders[k])?m.battingOrders[k]:[]).map(String).filter(id=>ids.has(id))});
  m.schedule=Array.isArray(m.schedule)?m.schedule.slice(0,m.innings):[];
  while(m.schedule.length<m.innings)m.schedule.push({pos:{}});
  m.schedule=m.schedule.map(inn=>{let pos={};if(inn&&inn.pos&&typeof inn.pos==='object'){Object.keys(inn.pos).slice(0,24).forEach(id=>{if(ids.has(id)){let v=String(inn.pos[id]||'');if(POSITIONS.includes(v))pos[id]=v}})}return{pos}});
  m.cloud=m.cloud&&typeof m.cloud==='object'?m.cloud:{};
  m.cloud={matchId:m.cloud.matchId?String(m.cloud.matchId).slice(0,80):null,publicId:m.cloud.publicId?String(m.cloud.publicId).slice(0,100):null,publicPassword:String(m.cloud.publicPassword||'').slice(0,120)};
  m.createdAtMs=Number(m.createdAtMs)||Date.now();
  m.updatedAtMs=Number(m.updatedAtMs)||m.createdAtMs;
  return m
}
function activeMatch(){return state.matches.find(m=>m.id===state.activeMatchId&&m.teamId===state.activeTeamId)||null}
function hasActiveMatch(){return !!activeMatch()}
function hydrateDraftMatchFromRoster(m){
  if(!m||m.started||m.status==='active'||m.status==='completed'||m.status==='archived'||m.players.length||!state.roster.length)return;
  m.players=normalizePlayers(state.roster).map((p,i)=>({id:p.id,name:p.name,number:p.number||'',on:i<MAX}));
  m.order=m.players.map(p=>p.id);
  m.schedule=[];
  m.battingOrders={};
  m.locks={innings:{},halves:{}};
}
function exposeMatch(m){
  m=m||blankMatch();
  Object.assign(state,{team:m.team,opp:m.opp,date:m.date,time:m.time,place:m.place,fanMessage:m.fanMessage,side:m.side,fixed:m.fixed,innings:m.innings,players:m.players,order:m.order,battingOrders:m.battingOrders,schedule:m.schedule,started:m.started,locks:m.locks,cloud:m.cloud});
}
function reconcileActiveMatch(){
  syncActiveTeamAliases();
  let m=activeMatch();
  let teamName=teamProfileName();
  if(!m){
    if(teamName)state.team=teamName;
    state.players=[];
    state.order=[];
    state.battingOrders={};
    state.schedule=[];
    state.fanMessage='';
    state.started=false;
    state.locks={innings:{},halves:{}};
    state.cloud={matchId:null,publicId:null,publicPassword:''};
    return null
  }
  if(!m.team&&teamName)m.team=teamName;
  if(!m.teamId)m.teamId=state.activeTeamId;
  hydrateDraftMatchFromRoster(m);
  exposeMatch(m);
  return m
}
function captureActiveMatch(){
  let m=activeMatch();
  if(!m)return null;
  let archived=m.status==='archived',completed=m.status==='completed';
  let t=syncActiveTeamAliases();
  if(!state.team&&t?.name)state.team=t.name;
  Object.assign(m,{team:state.team,opp:state.opp,date:state.date,time:state.time,place:state.place,fanMessage:cleanFanMessage(state.fanMessage),side:state.side,fixed:state.fixed,innings:state.innings,players:state.players,order:state.order,battingOrders:state.battingOrders,schedule:state.schedule,started:state.started,locks:state.locks,cloud:state.cloud||{}});
  m.teamId=state.activeTeamId;
  if(archived)m.status='archived';
  else if(completed)m.status='completed';
  else{
    m.status=state.started?'active':m.status==='ready'?'ready':'draft';
    if(state.started&&currentPlayIndex()>=matchPhases().length)m.status='completed';
  }
  m.updatedAtMs=Date.now();
  return m
}
function safeState(raw){
  let s=defaults();
  if(!raw||typeof raw!=='object'||raw.schemaVersion!==5||!Array.isArray(raw.teams))return s;
  s.schemaVersion=5;
  s.route=normalizeRoute(raw.route);
  s.teams=raw.teams.map(normalizeTeam).filter(t=>t.name||t.roster.length||t.publicId).slice(0,40);
  let publicIds=new Set();s.teams.forEach(t=>{if(!t.publicId)return;if(publicIds.has(t.publicId)){t.publicId=null;t.publicSlug='';t.publicPassword=''}else publicIds.add(t.publicId)});
  s.activeTeamId=s.teams.some(t=>t.id===raw.activeTeamId)?String(raw.activeTeamId):(s.teams[0]?.id||null);
  let rosterFor=id=>s.teams.find(t=>t.id===id)?.roster||[];
  s.matches=(Array.isArray(raw.matches)?raw.matches:[]).map(m=>normalizeMatch(m,rosterFor(m?.teamId))).filter(m=>m.teamId&&s.teams.some(t=>t.id===m.teamId)).slice(0,200);
  s.activeMatchId=s.matches.some(m=>m.id===raw.activeMatchId&&m.teamId===s.activeTeamId)?String(raw.activeMatchId):null;
  syncStateAliases(s);
  let m=s.matches.find(x=>x.id===s.activeMatchId)||null;if(m)Object.assign(s,{team:m.team,opp:m.opp,date:m.date,time:m.time,place:m.place,fanMessage:m.fanMessage,side:m.side,fixed:m.fixed,innings:m.innings,players:m.players,order:m.order,battingOrders:m.battingOrders,schedule:m.schedule,started:m.started,locks:m.locks,cloud:m.cloud});
  if(!m){s.team=s.teamProfile.name;s.players=[];s.order=[]}
  return s
}
function loadState(){try{return safeState(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return defaults()}}
function syncStateAliases(target){let t=target.teams.find(x=>x.id===target.activeTeamId)||null;if(t){target.teamProfile=t;target.roster=t.roster}else{target.teamProfile={name:'',publicId:null,publicSlug:'',publicPassword:'',fanMessage:'Merci de nous encourager!',roster:[]};target.roster=[]}}
function persistStateOnly(){try{syncActiveTeamAliases();localStorage.setItem(KEY,JSON.stringify({schemaVersion:5,teams:state.teams,activeTeamId:state.activeTeamId,matches:state.matches,activeMatchId:state.activeMatchId,route:state.route}))}catch(e){}}
function save(){try{captureActiveMatch();reconcileActiveMatch();persistStateOnly();if(!suppressCloudSave){cloud.lastLocalMs=Date.now();scheduleCloudSave();schedulePublicMatchSave()}if(!suppressTeamCloudSave)schedulePrivateTeamSave()}catch(e){console.error(e)}}
function initCloudFromState(){syncActiveTeamAliases();cloud.matchId=state.cloud?.matchId||null;cloud.publicId=state.cloud?.publicId||null;cloud.publicPassword=state.cloud?.publicPassword||'';cloud.teamPublicId=state.teamProfile?.publicId||null;cloud.teamPublicPassword=state.teamProfile?.publicPassword||'';cloud.lastPayloadJson=cloudPayloadJson()}
function persistCloudRefs(){state.cloud={matchId:cloud.matchId||null,publicId:cloud.publicId||null,publicPassword:cloud.publicPassword||''};let m=activeMatch();if(m)m.cloud=state.cloud;persistStateOnly()}
function privateTeamPayload(team){return{name:team?.name||'',fanMessage:cleanFanMessage(team?.fanMessage),roster:normalizePlayers(team?.roster||[]),publicId:team?.publicId||null,publicSlug:team?.publicSlug||''}}
function privateTeamPayloadJson(team){return JSON.stringify(privateTeamPayload(team))}
function applyPrivateTeamPayload(team,payload,remoteMs){if(!team||!payload)return;team.name=String(payload.name||'').trim().slice(0,80);team.fanMessage=cleanFanMessage(payload.fanMessage);team.roster=normalizePlayers(payload.roster);team.publicId=payload.publicId?String(payload.publicId).slice(0,100):null;team.publicSlug=normalizeTeamPublicId(payload.publicSlug||payload.publicId||'');team.cloud={enabled:true};team.updatedAtMs=Number(remoteMs)||Date.now()}
async function savePrivateTeam(team,silent){try{team=team||activeTeam();if(!team?.cloud?.enabled)return null;if(!cloud.user&&!(await requireCloudAuth('Connecte-toi pour gérer cette équipe en ligne.')))return null;let mod=await cloudModule(),payload=privateTeamPayload(team);cloud.status='synchronisation';renderCloudUi();await mod.saveTeam(team.id,payload,cloud.clientId);cloud.teamPayloads[team.id]=JSON.stringify(payload);cloud.status='synchronisé';listenPrivateTeam(team.id);if(!silent)modal('Équipe en ligne','Cette équipe est maintenant disponible avec ton compte.');return team.id}catch(e){cloud.status='erreur';renderCloudUi();if(!silent)modal('Sauvegarde impossible',e.message||String(e));return null}}
function schedulePrivateTeamSave(){let team=activeTeam();if(!team?.cloud?.enabled||!cloud.user)return;let signature=privateTeamPayloadJson(team);if(signature===cloud.teamPayloads[team.id])return;clearTimeout(privateTeamSaveTimer);privateTeamSaveTimer=setTimeout(()=>savePrivateTeam(team,true),1200)}
function stopPrivateTeamListener(){cloud.teamListenToken++;if(cloud.unsubPrivateTeam){cloud.unsubPrivateTeam();cloud.unsubPrivateTeam=null}}
async function listenPrivateTeam(id){stopPrivateTeamListener();let token=cloud.teamListenToken;try{let mod=await cloudModule(),initial=true;let unsub=await mod.listenTeam(id,doc=>{if(token!==cloud.teamListenToken)return;let team=state.teams.find(t=>t.id===id);if(!doc||!team)return;let remoteMs=Number(doc.updatedAtMs)||0;if(doc.updatedByClientId===cloud.clientId){cloud.teamPayloads[id]=privateTeamPayloadJson(team);initial=false;return}if(remoteMs>(team.updatedAtMs||0)){suppressTeamCloudSave=true;try{applyPrivateTeamPayload(team,doc.payload,remoteMs);cloud.teamPayloads[id]=privateTeamPayloadJson(team);if(team.id===state.activeTeamId){syncActiveTeamAliases();cloud.teamPublicId=team.publicId||null;cloud.teamPublicPassword=team.publicPassword||''}persistStateOnly();renderAll();if(!initial)modal('Équipe mise à jour','Une version plus récente de l’équipe a été reçue.')}finally{suppressTeamCloudSave=false}}initial=false});if(token!==cloud.teamListenToken)unsub();else cloud.unsubPrivateTeam=unsub}catch(e){}}
async function refreshCloudTeams(silent){if(!cloud.user)return;try{cloud.teamsLoading=true;let mod=await cloudModule();cloud.teams=await mod.listTeams();cloud.teamsLoaded=true;let changed=false;for(let doc of cloud.teams){let local=state.teams.find(t=>t.id===doc.id),remoteMs=Number(doc.updatedAtMs)||0;if(!local){local=normalizeTeam(Object.assign({},doc.payload,{id:doc.id,cloud:{enabled:true},updatedAtMs:remoteMs}));state.teams.push(local);changed=true}else{local.cloud={enabled:true};let choice=RallyeCapTeamSync.decideVersion(local.updatedAtMs,remoteMs);if(choice==='remote'){applyPrivateTeamPayload(local,doc.payload,remoteMs);changed=true}else if(choice==='local')await savePrivateTeam(local,true)}cloud.teamPayloads[local.id]=privateTeamPayloadJson(local)}if(!state.activeTeamId&&state.teams.length){state.activeTeamId=cloud.teams[0]?.id||state.teams[0].id;changed=true}if(changed){syncActiveTeamAliases();cloud.teamPublicId=activeTeam()?.publicId||null;cloud.teamPublicPassword=activeTeam()?.publicPassword||'';persistStateOnly();renderAll()}if(activeTeam()?.cloud?.enabled)listenPrivateTeam(activeTeam().id)}catch(e){if(!silent)modal('Équipes en ligne impossibles',e.message||String(e))}finally{cloud.teamsLoading=false}}
function isExternalRoute(raw){return /^(public|fans|banc)\/[^/]+/.test(raw)}
function cloudBaseUrl(){return location.href.split('#')[0]}
function cloudPublicUrl(){return cloud.publicId?cloudBaseUrl()+'#public/'+encodeURIComponent(cloud.publicId):''}
function cloudBenchUrl(){return cloud.publicId?cloudBaseUrl()+'#banc/'+encodeURIComponent(cloud.publicId):''}
function cloudTeamUrl(){let id=activeTeamPublicId();return id?cloudBaseUrl()+'#fans/'+encodeURIComponent(id):''}
async function cloudModule(){if(cloud.module)return cloud.module;cloud.module=await import('./firebase-sync.js');return cloud.module}
async function ensureCloudAuth(){let mod=await cloudModule(),user=await mod.currentUser();if(!user)return null;cloud.user=user;return user}
async function requireCloudAuth(reason){try{let user=await ensureCloudAuth();if(user)return user;cloud.status='connexion requise';renderCloudUi();cloudLoginModal(reason||'Connecte-toi pour utiliser cette action cloud.');return null}catch(e){cloud.status='erreur';renderCloudUi();modal('Cloud non configuré',e.message||String(e));return null}}
function currentCloudPayload(){let m=activeMatch();return{status:m?.status||'draft',teamId:state.activeTeamId,team:state.team,opp:state.opp,date:state.date,time:state.time,place:state.place,fanMessage:cleanFanMessage(state.fanMessage),side:state.side,fixed:state.fixed,innings:state.innings,players:state.players.map(p=>({id:p.id,name:p.name,number:p.number||'',on:p.on!==false})),order:state.order.slice(),battingOrders:JSON.parse(JSON.stringify(state.battingOrders||{})),schedule:state.schedule.map(inn=>({pos:Object.assign({},inn.pos||{})})),started:state.started===true,locks:JSON.parse(JSON.stringify(state.locks||{innings:{},halves:{}})),updatedAtMs:Date.now()}}
function cloudPayloadFromMatch(m){return{status:m?.status||'draft',teamId:m?.teamId||null,team:m?.team||'',opp:m?.opp||'',date:m?.date||'',time:m?.time||'',place:m?.place||'',fanMessage:cleanFanMessage(m?.fanMessage),side:m?.side==='locale'?'locale':'visiteur',fixed:m?.fixed!==false,innings:m?.innings||MIN_INN,players:(m?.players||[]).map(p=>({id:p.id,name:p.name,number:p.number||'',on:p.on!==false})),order:(m?.order||[]).slice(),battingOrders:JSON.parse(JSON.stringify(m?.battingOrders||{})),schedule:(m?.schedule||[]).map(inn=>({pos:Object.assign({},inn.pos||{})})),started:m?.started===true,locks:JSON.parse(JSON.stringify(m?.locks||{innings:{},halves:{}})),updatedAtMs:Date.now()}}
function cloudSyncPayload(){let payload=currentCloudPayload();delete payload.updatedAtMs;return payload}
function cloudSyncPayloadFromMatch(m){let payload=cloudPayloadFromMatch(m);delete payload.updatedAtMs;return payload}
function cloudPayloadJson(){return JSON.stringify(cloudSyncPayload())}
function cloudMatchExtra(){let current=currentPlayIndex(),phases=matchPhases();return{publicId:cloud.publicId||null,currentIndex:current,completed:state.started===true&&current>=phases.length,phases}}
function cloudMatchExtraFromMatch(m){return{publicId:m?.cloud?.publicId||null,currentIndex:0,completed:m?.status==='completed'||m?.status==='archived',phases:[]}}
async function saveLocalMatchCloud(m){if(!m?.cloud?.matchId||!cloud.user)return;let mod=await cloudModule();await mod.saveMatch(m.cloud.matchId,cloudSyncPayloadFromMatch(m),cloud.clientId,cloudMatchExtraFromMatch(m));await refreshCloudMatches(true)}
function applyCloudPayload(payload,remoteMs){if(!payload||typeof payload!=='object')return;let m=activeMatch();if(m?.status==='archived'){if(remoteMs)cloud.lastLocalMs=Math.max(cloud.lastLocalMs,remoteMs);cloud.lastPayloadJson=cloudPayloadJson();return}if(!m){m=normalizeMatch(payload,state.roster);state.matches.unshift(m);state.activeMatchId=m.id}else Object.assign(m,normalizeMatch(Object.assign({},m,payload,{cloud:m.cloud}),state.roster));suppressCloudSave=true;try{exposeMatch(m);ensureSchedule();if(remoteMs)cloud.lastLocalMs=Math.max(cloud.lastLocalMs,remoteMs);cloud.lastPayloadJson=cloudPayloadJson();save();renderAll()}finally{suppressCloudSave=false}}
function publicProjection(){let phases=matchPhases().map(ph=>({inning:ph.inning,half:ph.half,label:ph.label,type:ph.type,locked:isHalfLocked(ph.inning,ph.half)})),current=currentPlayIndex(),fanMessage=cleanFanMessage(state.fanMessage),ready=isMatchReady(),visible=state.started===true||ready,base={team:state.team,teamPublicId:activeTeamPublicId(),opp:state.opp,date:state.date,time:state.time,place:state.place,fanMessage,side:state.side,fixed:state.fixed,ready,started:state.started===true,currentIndex:current,publicStage:ready?'ready':!state.started?'programme':current>=phases.length?'termine':'manche',phases,programme:{players:[],fanMessage},updatedAtMs:Date.now()};if(!visible)return base;let battersByInning={},defenseByInning={},playerMap=new Map(state.players.map(p=>[p.id,p]));for(let i=0;i<state.innings;i++){battersByInning[i]=batters(i).map(b=>({playerId:b.id,rank:b.rank,label:b.label||b.name,name:b.name,number:b.number||''}));defenseByInning[i]=defenseItems(i).map(r=>{let p=playerMap.get(r[2]);return{playerId:r[2]||'',pos:r[0],name:p?.name||r[1],number:p?.number||''}})}base.programme.players=active().map((p,i)=>({playerId:p.id,rank:i+1,label:playerLabel(p),name:p.name,number:p.number||''}));base.batters=battersByInning;base.defense=defenseByInning;base.battingOrder=active().map((p,i)=>({playerId:p.id,rank:i+1,label:playerLabel(p),name:p.name,number:p.number||''}));return base}
function publicMatchSummaryFromMatch(m){
  let started=m?.started===true||m?.status==='active'||m?.status==='completed'||m?.status==='archived',completed=m?.status==='completed'||m?.status==='archived';
  return{publicId:m?.cloud?.publicId||null,passwordProtected:!!String(m?.cloud?.publicPassword||'').trim(),teamId:m?.teamId||null,team:m?.team||teamProfileName(),opp:m?.opp||'',date:m?.date||'',time:m?.time||'',place:m?.place||'',ready:m?.status==='ready',started,completed,status:completed?'completed':started?'active':m?.status==='ready'?'ready':'draft',updatedAtMs:m?.updatedAtMs||Date.now()}
}
function publicTeamProjection(){
  let players=state.roster.map(p=>({playerId:p.id,name:p.name,number:p.number||'',label:playerLabel(p)}));
  let matches=matchesForActiveTeam().filter(m=>m.cloud?.publicId).map(publicMatchSummaryFromMatch).sort((a,b)=>{
    let ad=matchDateValue(a),bd=matchDateValue(b);
    if(ad===Number.NEGATIVE_INFINITY&&bd!==Number.NEGATIVE_INFINITY)return 1;
    if(bd===Number.NEGATIVE_INFINITY&&ad!==Number.NEGATIVE_INFINITY)return -1;
    if(ad!==bd)return ad-bd;
    return (b.updatedAtMs||0)-(a.updatedAtMs||0)
  });
  return{team:teamProfileName(),fanMessage:cleanFanMessage(activeTeam()?.fanMessage),players,matches,updatedAtMs:Date.now()}
}
function syncPublicTeamIfActive(){if(!activeTeamPublicId()||!cloud.user)return;clearTimeout(publicTeamSaveTimer);publicTeamSaveTimer=setTimeout(()=>savePublicTeam(true).catch(()=>{}),800)}
function scheduleCloudSave(){if(suppressCloudSave||!cloud.matchId||!cloud.user)return;let signature=cloudPayloadJson();if(signature===cloud.lastPayloadJson)return;if(cloud.saving){cloud.pendingSave=true;return}clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(()=>{if(cloudPayloadJson()!==cloud.lastPayloadJson)saveCloudMatch(true)},1200)}
function schedulePublicMatchSave(){if(suppressCloudSave||!cloud.publicId||!cloud.user)return;let signature=JSON.stringify(publicProjection());if(signature===cloud.lastPublicPayloadJson)return;clearTimeout(publicMatchSaveTimer);publicMatchSaveTimer=setTimeout(()=>savePublicMatch(true),900)}
async function savePublicMatch(silent){try{if(!activeMatch()||!cloud.publicId||!cloud.user)return null;let payload=publicProjection(),mod=await cloudModule();await mod.publishPublic(cloud.publicId,cloud.matchId||null,payload,cloud.publicPassword||'');cloud.lastPublicPayloadJson=JSON.stringify(payload);if(cloud.teamPublicId)await savePublicTeam(true);return cloud.publicId}catch(e){if(!silent)modal('Mise à jour du lien impossible',e.message||String(e));return null}}
async function startCloud(){try{let mod=await cloudModule();if(cloud.unsubAuth)return;cloud.unsubAuth=await mod.onAuth(async user=>{cloud.user=user||null;cloud.status=user?'connecté':'local';if(!user){cloud.matches=[];cloud.matchesLoaded=false;cloud.teams=[];cloud.teamsLoaded=false;cloud.publicTeams=[];cloud.publicTeamsLoaded=false;stopPrivateTeamListener()}renderCloudUi();if(user){await refreshCloudTeams(true);await refreshCloudMatches(true);refreshPublicTeams(true);if(cloud.matchId)listenCloudMatch(cloud.matchId);if(cloud.publicId)schedulePublicMatchSave()}})}catch(e){cloud.status='non configuré';renderCloudUi()}}
function cloudLoginModal(reason){modal('Connexion',reason||'Connecte-toi pour synchroniser le match courant entre appareils.',[{label:'Courriel / mot de passe',kind:'inputCloudEmail',onClick:null},{label:'G Continuer avec Google',kind:'googleBtn',onClick:signInGoogleCloud},{label:'Fermer',kind:'modalCancel'}])}
async function signInEmailCloud(email,password,create){try{let mod=await cloudModule();if(create)await mod.signUpEmail(email,password);else await mod.signInEmail(email,password);modal('Connecté','La connexion cloud est active.')}catch(e){modal('Connexion impossible',e.message||String(e))}}
async function signInGoogleCloud(){try{let mod=await cloudModule();await mod.signInGoogle();modal('Connecté','La connexion Google est active.')}catch(e){modal('Connexion impossible',e.message||String(e))}}
async function signOutCloud(){try{let mod=await cloudModule();await mod.signOut();cloud.user=null;cloud.status='local';renderCloudUi()}catch(e){modal('Déconnexion impossible',e.message||String(e))}}
async function saveCloudMatch(silent){try{if(!activeMatch()){if(!silent)modal('Aucun match actif','Ouvre ou crée un match avant de le mettre en ligne.');return null}if(!activeTeam()?.cloud?.enabled){if(!silent)modal('Gestion en ligne impossible','Active d’abord « Gérer en ligne » dans le lien d’équipe.',[{label:'Ouvrir le lien d’équipe',kind:'brandBtn',onClick:openTeamPublicLinkModal},{label:'Fermer',kind:'modalCancel'}]);return null}if(!cloud.user&&!(await requireCloudAuth('Connecte-toi pour sauvegarder ce match en ligne et pouvoir le reprendre sur un autre appareil.')))return null;let signature=cloudPayloadJson();cloud.saving=true;cloud.pendingSave=false;cloud.lastLocalMs=Date.now();cloud.status='synchronisation';renderCloudUi();let mod=await cloudModule();let id=await mod.saveMatch(cloud.matchId,cloudSyncPayload(),cloud.clientId,cloudMatchExtra());cloud.matchId=id;persistCloudRefs();if(cloud.teamPublicId)await savePublicTeam(true);cloud.status='synchronisé';cloud.lastPayloadJson=signature;cloud.lastRemoteMs=Date.now();listenCloudMatch(id);renderCloudUi();refreshCloudMatches(true);if(!silent)modal('Sauvegardé en ligne','Le match courant est disponible avec ton compte.');return id}catch(e){cloud.status='erreur';renderCloudUi();if(!silent)modal('Sauvegarde impossible',e.message||String(e));return null}finally{cloud.saving=false;if(cloud.pendingSave){cloud.pendingSave=false;scheduleCloudSave()}}}
function stopCloudMatchListener(){cloud.matchListenToken++;if(cloud.unsubMatch){cloud.unsubMatch();cloud.unsubMatch=null}}
function isPublicFacingRoute(){let raw=location.hash.replace(/^#/,'');return raw==='spectateur'||raw.startsWith('fans/')||raw.startsWith('public/')||raw.startsWith('banc/')}
async function listenCloudMatch(id){stopCloudMatchListener();let token=cloud.matchListenToken;try{let mod=await cloudModule(),initial=true,unsub=await mod.listenMatch(id,doc=>{if(token!==cloud.matchListenToken||isPublicFacingRoute())return;if(!doc||!doc.payload){initial=false;return}let remoteMs=doc.updatedAtMs||0;if(doc.updatedByClientId&&doc.updatedByClientId===cloud.clientId){cloud.lastRemoteMs=remoteMs||Date.now();cloud.lastPayloadJson=cloudPayloadJson();initial=false;return}if(remoteMs&&remoteMs<=cloud.lastRemoteMs){initial=false;return}let remoteIsNewer=!remoteMs||remoteMs>cloud.lastLocalMs+800;cloud.lastRemoteMs=remoteMs||Date.now();if(remoteIsNewer){if(!initial)modal('Version distante reçue','Une version plus récente du match a été reçue du cloud. Elle remplace la copie locale.');applyCloudPayload(doc.payload,remoteMs)}initial=false});if(token!==cloud.matchListenToken||isPublicFacingRoute())unsub();else cloud.unsubMatch=unsub}catch(e){}}
async function publishPublicMatch(){try{if(!cloud.user&&!(await requireCloudAuth('Connecte-toi pour créer le lien Match. Les fans auront seulement accès à une vue limitée.')))return;let passInput=$('#publicPassword'),pass=passInput?passInput.value:(cloud.publicPassword||'');cloud.publicPassword=pass;let payload=publicProjection(),mod=await cloudModule();let id=await mod.publishPublic(cloud.publicId,cloud.matchId||null,payload,pass);cloud.publicId=id;cloud.lastPublicPayloadJson=JSON.stringify(payload);persistCloudRefs();if(cloud.matchId)await mod.saveMatch(cloud.matchId,cloudSyncPayload(),cloud.clientId,cloudMatchExtra());if(cloud.teamPublicId)await savePublicTeam(true);renderCloudUi();refreshCloudMatches(true)}catch(e){cloud.status='erreur';renderCloudUi();modal('Publication impossible',e.message||String(e))}}
async function unpublishPublicMatch(){try{if(!cloud.publicId)return;let mod=await cloudModule();await mod.deletePublic(cloud.publicId);cloud.publicId=null;cloud.publicPassword='';persistCloudRefs();if(cloud.teamPublicId)await savePublicTeam(true);renderCloudUi()}catch(e){modal('Retrait impossible',e.message||String(e))}}
async function savePublicTeam(silent,onError){
  let report=(title,text)=>{if(onError)onError(text);else if(!silent)modal(title,text)};
  try{
    let team=activeTeam();
    if(!team||!teamProfileName()){report('Équipe requise','Crée et nomme une équipe avant de publier son lien permanent.');return null}
    if(!cloud.user&&!(await requireCloudAuth('Connecte-toi pour créer le lien permanent de l’équipe.')))return null;
    let existingId=activeTeamPublicId(),slugInput=$('#teamPublicModalSlug')||$('#teamPublicSlug'),rawSlug=slugInput?slugInput.value:(team.publicSlug||''),slug=normalizeTeamPublicId(rawSlug),createOnly=!existingId;
    if(createOnly&&!slug){if(slugInput)slugInput.focus();report('Identifiant requis','Entre un identifiant public pour créer le lien d’équipe.');return null}
    if(slug&&!validTeamPublicId(slug)){if(slugInput)slugInput.focus();report('Identifiant invalide','Utilise de 3 à 40 caractères: lettres, chiffres et tirets. Exemple: expos-rallye-cap.');return null}
    let passInput=$('#teamPublicModalPassword')||$('#teamPublicPassword'),pass=passInput?passInput.value:(team.publicPassword||''),mod=await cloudModule();
    let id=await mod.publishPublicTeam(existingId||slug,publicTeamProjection(),pass,createOnly);
    team.publicId=id;team.publicSlug=id;team.publicPassword=pass;team.updatedAtMs=Date.now();cloud.teamPublicId=id;cloud.teamPublicPassword=pass;
    if(cloud.publicId)await mod.publishPublic(cloud.publicId,cloud.matchId||null,publicProjection(),cloud.publicPassword||'');
    persistStateOnly();schedulePrivateTeamSave();renderCloudUi();refreshPublicTeams(true);
    if(!silent)modal('Lien d’équipe actif','Le lien permanent affiche l’équipe et les matchs publiés.');
    return id
  }catch(e){report('Lien d’équipe impossible',e.message||String(e));return null}
}
async function publishPublicTeam(){return savePublicTeam(false)}
async function unpublishPublicTeam(){try{let team=activeTeam(),id=activeTeamPublicId();if(!team||!id)return;let mod=await cloudModule();await mod.deletePublicTeam(id);team.publicId=null;team.publicSlug='';team.publicPassword='';team.updatedAtMs=Date.now();cloud.teamPublicId=null;cloud.teamPublicPassword='';persistStateOnly();schedulePrivateTeamSave();renderCloudUi();refreshPublicTeams(true)}catch(e){modal('Retrait impossible',e.message||String(e))}}
async function refreshPublicTeams(silent){let box=$('#publicTeamsList');if(!box)return;if(!cloud.user){cloud.publicTeams=[];cloud.publicTeamsLoaded=false;renderPublicTeamsList();return}try{cloud.publicTeamsLoading=true;renderPublicTeamsList();let mod=await cloudModule();cloud.publicTeams=await mod.listPublicTeams();cloud.publicTeamsLoaded=true}catch(e){cloud.publicTeams=[];cloud.publicTeamsLoaded=true;if(!silent)modal('Liens d’équipe impossibles',e.message||String(e))}finally{cloud.publicTeamsLoading=false;renderPublicTeamsList()}}
function publicTeamTitle(doc){let payload=doc.payload||{};return payload.team||doc.id}
function publicTeamUrl(id){return cloudBaseUrl()+'#fans/'+encodeURIComponent(id)}
function renderPublicTeamsList(){let box=$('#publicTeamsList');if(!box)return;if(!cloud.user){box.innerHTML='<div class="smallEmpty empty">Connecte-toi pour voir les liens d’équipe existants.</div>';return}let current=teamProfileName(),rows=(cloud.publicTeams||[]).filter(doc=>doc.id===cloud.teamPublicId||publicTeamTitle(doc)===current),loading=cloud.publicTeamsLoading?'<p class="hint">Actualisation des liens d’équipe...</p>':'';if(!rows.length){box.innerHTML='<h4 class="onlineMatchesTitle">Liens d’équipe de cette équipe</h4><div class="smallEmpty empty">Aucun lien Firestore trouvé pour cette équipe.</div>'+loading;return}box.innerHTML='<h4 class="onlineMatchesTitle">Liens d’équipe de cette équipe</h4><div class="onlineMatchList">'+rows.map(doc=>{let active=doc.id===cloud.teamPublicId,meta=doc.passwordProtected?'Protégé par mot de passe':'Sans mot de passe',title=publicTeamTitle(doc),useBtn=active?'':'<button class="btn secondary" data-team-use="'+escAttr(doc.id)+'" type="button">Utiliser</button>';return '<div class="onlineMatch"><div><b>'+esc(title)+'</b><span>#fans/'+esc(doc.id)+'</span><em>'+esc(meta)+'</em></div><div class="onlineMatchActions">'+useBtn+'<button class="btn secondary" data-team-copy="'+escAttr(doc.id)+'" type="button">Copier</button><button class="btn danger" data-team-delete="'+escAttr(doc.id)+'" type="button">Retirer</button></div></div>'}).join('')+'</div>'+loading;$$('[data-team-use]').forEach(b=>b.onclick=()=>useListedPublicTeam(b.dataset.teamUse));$$('[data-team-copy]').forEach(b=>b.onclick=()=>copyTextToClipboard(publicTeamUrl(b.dataset.teamCopy),'Lien d’équipe non disponible',true));$$('[data-team-delete]').forEach(b=>b.onclick=()=>confirmModal('Retirer le lien d’équipe','Retirer le lien #fans/'+b.dataset.teamDelete+'? Les liens de match déjà créés resteront actifs.',()=>deleteListedPublicTeam(b.dataset.teamDelete)))}
function useListedPublicTeam(id){let t=activeTeam();if(!t)return;t.publicId=id;t.publicSlug=id;cloud.teamPublicId=id;cloud.teamPublicPassword=t.publicPassword||'';persistStateOnly();renderCloudUi()}
async function deleteListedPublicTeam(id){try{let mod=await cloudModule();await mod.deletePublicTeam(id);if(id===cloud.teamPublicId){cloud.teamPublicId=null;cloud.teamPublicPassword='';state.teamProfile.publicId=null;state.teamProfile.publicSlug='';state.teamProfile.publicPassword='';persistStateOnly()}await refreshPublicTeams(true);renderCloudUi()}catch(e){modal('Retrait impossible',e.message||String(e))}}
async function copyTextToClipboard(text,title,silent){if(!text){modal(title||'Lien non disponible','Aucun lien à copier.');return}try{await navigator.clipboard.writeText(text);if(!silent)modal('Lien copié',text)}catch(e){fallbackCopy(text)}}
function cloudMatchTitle(m){let team=m.team||m.payload?.team||'Équipe',opp=m.opp||m.payload?.opp||'Adversaire';return team+' vs '+opp}
function cloudMatchStatus(m){if(m.completed)return'Match terminé';if(m.started)return'En cours'+(m.currentLabel?' - '+m.currentLabel:'');if(m.status==='ready')return'Prêt à jouer';return'En préparation'}
function formatDateTimeMs(ms){if(!ms)return'—';try{return new Date(ms).toLocaleString('fr-CA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return String(ms)}}
function formatLocalDateTimeMs(ms){if(!ms)return'—';try{let d=new Date(ms),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())}catch(e){return String(ms)}}
function matchStatusLabel(m){if(m.status==='archived')return'Archivé';if(m.status==='completed')return'Match terminé';if(m.started||m.status==='active')return'En cours'+(m.id===state.activeMatchId&&currentPlayPhase()?' - '+matchPhases()[currentPlayIndex()].label:'');if(m.status==='ready')return'Prêt à jouer';return'En préparation'}
function matchDateValue(m){let d=String(m.date||''),t=String(m.time||'');if(!d)return Number.NEGATIVE_INFINITY;let ms=Date.parse(d+'T'+(t||'00:00'));return Number.isFinite(ms)?ms:Number.NEGATIVE_INFINITY}
function cloudDocToMatch(doc){let payload=doc.payload||{},teamId=payload.teamId||doc.teamId||state.activeTeamId;let roster=state.teams.find(t=>t.id===teamId)?.roster||state.roster;let m=normalizeMatch(Object.assign({},payload,{id:'cloud-'+doc.id,teamId,status:doc.status||payload.status||(doc.completed?'completed':doc.started?'active':'draft')}),roster);m.cloud={matchId:doc.id,publicId:doc.publicId||payload.cloud?.publicId||null,publicPassword:''};m.updatedAtMs=doc.updatedAtMs||m.updatedAtMs;return m}
function combinedMatchRows(kind){let rows=[],byCloud=new Map(),teamId=state.activeTeamId;state.matches.filter(m=>m.teamId===teamId).forEach(m=>{let row={key:'local:'+m.id,local:m,cloud:null,match:m};rows.push(row);if(m.cloud?.matchId)byCloud.set(m.cloud.matchId,row)});(cloud.matches||[]).filter(doc=>(doc.payload?.teamId||doc.teamId)===teamId).forEach(doc=>{let cm=cloudDocToMatch(doc),row=byCloud.get(doc.id);if(row){row.cloud=doc;row.match=Object.assign({},row.local,{updatedAtMs:Math.max(row.local.updatedAtMs||0,doc.updatedAtMs||0)})}else rows.push({key:'cloud:'+doc.id,local:null,cloud:doc,match:cm})});if(kind==='active')rows=rows.filter(r=>r.match.status!=='archived');else if(kind==='archived')rows=rows.filter(r=>r.match.status==='archived');return sortMatchRows(rows,kind)}
function sortMatchRows(rows,kind){let sort=matchTableSort[kind]||{key:'date',dir:-1},dir=sort.dir||1,key=sort.key;return rows.slice().sort((a,b)=>{let av,bv;if(key==='team'){av=a.match.team||'';bv=b.match.team||''}else if(key==='opp'){av=a.match.opp||'';bv=b.match.opp||''}else if(key==='place'){av=a.match.place||'';bv=b.match.place||''}else if(key==='status'){av=matchStatusLabel(a.match);bv=matchStatusLabel(b.match)}else if(key==='updated'){av=a.match.updatedAtMs||0;bv=b.match.updatedAtMs||0}else{av=matchDateValue(a.match);bv=matchDateValue(b.match)}if(av===Number.NEGATIVE_INFINITY&&bv!==Number.NEGATIVE_INFINITY)return 1;if(bv===Number.NEGATIVE_INFINITY&&av!==Number.NEGATIVE_INFINITY)return -1;if(typeof av==='string')return av.localeCompare(bv,'fr')*dir;return (av-bv)*dir})}
function sortHeader(kind,key,label){let cur=matchTableSort[kind]||{},mark=cur.key===key?(cur.dir===1?' ▲':' ▼'):'';return '<button class="tableSort" data-match-sort="'+kind+':'+key+'">'+label+mark+'</button>'}
function renderMatchTable(kind){let rows=combinedMatchRows(kind),h='<div class="tableWrap"><table class="matchListTable statSort"><thead><tr><th>'+sortHeader(kind,'opp','Adversaire')+'</th><th>'+sortHeader(kind,'date','Date / heure')+'</th><th>'+sortHeader(kind,'place','Endroit')+'</th><th>'+sortHeader(kind,'status','Statut')+'</th><th>'+sortHeader(kind,'updated','Modifié')+'</th><th>Actions</th></tr></thead><tbody>';if(!rows.length)h+='<tr><td colspan="6" class="empty">Aucun</td></tr>';rows.forEach(r=>{let m=r.match,dateTime=[m.date?formatDate(m.date):'',m.time||''].filter(Boolean).join(' • '),actions='<button class="btn secondary tableShareBtn" data-match-share="'+escAttr(r.key)+'" type="button">Partager</button> ';if(r.local&&m.status==='completed')actions+='<button class="icon soft" data-match-archive="'+escAttr(r.key)+'" title="Archiver" aria-label="Archiver">📁</button> ';actions+='<button class="icon soft dangerIcon" data-match-delete="'+escAttr(r.key)+'" title="Supprimer" aria-label="Supprimer">🗑</button>';h+='<tr class="matchRow" data-match-row="'+escAttr(r.key)+'" tabindex="0"><td><b>'+esc(m.opp||'—')+'</b></td><td>'+esc(dateTime||'—')+'</td><td>'+esc(m.place||'—')+'</td><td>'+esc(matchStatusLabel(m))+'</td><td>'+esc(formatLocalDateTimeMs(m.updatedAtMs))+'</td><td class="tableActions">'+actions+'</td></tr>'});return h+'</tbody></table></div>'}
function renderMatchTables(){let box=$('#cloudMatchesList');if(!box)return;box.innerHTML=renderMatchTable('all')+(cloud.matchesLoading?'<p class="hint">Actualisation des matchs en ligne...</p>':'');$$('[data-match-sort]').forEach(b=>b.onclick=()=>{let [kind,key]=b.dataset.matchSort.split(':'),cur=matchTableSort[kind]||{key,dir:-1};matchTableSort[kind]={key,dir:cur.key===key?cur.dir*-1:(key==='date'||key==='updated'?-1:1)};renderMatchTables()});$$('[data-match-row]').forEach(r=>{r.onclick=()=>openCombinedMatch(r.dataset.matchRow);r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCombinedMatch(r.dataset.matchRow)}}});$$('[data-match-share]').forEach(b=>b.onclick=e=>{e.stopPropagation();openCombinedMatchShare(b.dataset.matchShare)});$$('[data-match-archive]').forEach(b=>b.onclick=e=>{e.stopPropagation();archiveMatchPrompt(b.dataset.matchArchive)});$$('[data-match-delete]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteMatchPrompt(b.dataset.matchDelete)})}
function rowForKey(key){return combinedMatchRows('all').find(r=>r.key===key)}
async function refreshCloudMatches(silent){if(!cloud.user){renderMatchTables();return}try{cloud.matchesLoading=true;renderMatchTables();let mod=await cloudModule();cloud.matches=await mod.listMatches();cloud.matchesLoaded=true}catch(e){if(!silent)modal('Liste impossible',e.message||String(e));cloud.matches=[];cloud.matchesLoaded=true}finally{cloud.matchesLoading=false;renderMatchTables()}}
function openCombinedMatch(key){let row=rowForKey(key);if(!row)return;captureActiveMatch();let m=row.local;if(!m){m=cloudDocToMatch(row.cloud);state.matches.unshift(m)}state.activeMatchId=m.id;exposeMatch(m);cloud.matchId=m.cloud?.matchId||null;cloud.publicId=m.cloud?.publicId||null;cloud.publicPassword=m.cloud?.publicPassword||'';save();if(cloud.matchId)listenCloudMatch(cloud.matchId);location.hash='#match';renderAll()}
function activateCombinedMatchForAction(key){let row=rowForKey(key);if(!row)return null;captureActiveMatch();let m=row.local;if(!m){m=cloudDocToMatch(row.cloud);state.matches.unshift(m)}state.activeMatchId=m.id;exposeMatch(m);cloud.matchId=m.cloud?.matchId||null;cloud.publicId=m.cloud?.publicId||null;cloud.publicPassword=m.cloud?.publicPassword||'';save();if(cloud.matchId)listenCloudMatch(cloud.matchId);renderAll();return m}
function openCombinedMatchShare(key){if(activateCombinedMatchForAction(key))setTimeout(openMatchShareModal,0)}
function activeMatchRow(){let m=activeMatch();if(!m)return null;return combinedMatchRows('all').find(r=>r.local?.id===m.id||r.match?.id===m.id||r.cloud?.id===m.cloud?.matchId)||{key:'local:'+m.id,local:m,cloud:null,match:m}}
async function removePrivateMatchCloud(row){let m=row.local||cloudDocToMatch(row.cloud),matchId=m.cloud?.matchId||row.cloud?.id,mod=await cloudModule();if(matchId)await mod.deleteMatch(matchId);if(row.local){row.local.cloud=Object.assign({},row.local.cloud,{matchId:null});if(row.local.id===state.activeMatchId){cloud.matchId=null;state.cloud=row.local.cloud}}await refreshCloudMatches(true);save();renderAll()}
async function removeMatchCloud(row){let m=row.local||cloudDocToMatch(row.cloud),publicId=m.cloud?.publicId||row.cloud?.publicId,mod=await cloudModule();if(publicId)await mod.deletePublic(publicId);await removePrivateMatchCloud(row);if(row.local){row.local.cloud.publicId=null;row.local.cloud.publicPassword='';if(row.local.id===state.activeMatchId){cloud.publicId=null;cloud.publicPassword=''}}if(cloud.teamPublicId)await savePublicTeam(true);save();renderAll()}
function archiveMatchPrompt(key){let row=rowForKey(key);if(!row?.local)return;if(row.local.status!=='completed'){modal('Archivage impossible','Un match doit être terminé avant d’être archivé.');return}confirmModal('Archiver le match','Archiver ce match en lecture seule?',async()=>{row.local.status='archived';row.local.started=true;if(row.local.id===state.activeMatchId)exposeMatch(row.local);save();if(row.local.cloud?.matchId)await saveLocalMatchCloud(row.local).catch(()=>{});renderAll()})}
function deleteMatchPrompt(key){let row=rowForKey(key);if(!row)return;let online=!!(row.cloud||row.local?.cloud?.matchId||row.local?.cloud?.publicId);confirmModal('Supprimer le match','Le match et ses données seront supprimés. Continuer?',async()=>{try{if(online)await removeMatchCloud(row);if(row.local){state.matches=state.matches.filter(m=>m.id!==row.local.id);if(state.activeMatchId===row.local.id){state.activeMatchId=null;exposeMatch(null)}}save();renderAll()}catch(e){modal('Suppression impossible',e.message||String(e))}})}
function deleteCurrentMatchPrompt(){let row=activeMatchRow();if(!row)return;confirmModal('Supprimer le match','Le match et ses données seront supprimés. Continuer?',async()=>{try{if(row.cloud||row.local?.cloud?.matchId||row.local?.cloud?.publicId)await removeMatchCloud(row);if(row.local){state.matches=state.matches.filter(m=>m.id!==row.local.id);if(state.activeMatchId===row.local.id){state.activeMatchId=null;exposeMatch(null)}}save();renderAll()}catch(e){modal('Suppression impossible',e.message||String(e))}})}
function renderCloudMatchesList(){renderMatchTables()}
function renderSharedMatchesList(){let box=$('#sharedMatchesList');if(!box)return;let rows=matchesForActiveTeam().filter(m=>m.cloud?.publicId);if(!rows.length){box.innerHTML='<h4 class="onlineMatchesTitle">Matchs partagés</h4><div class="smallEmpty empty">Aucun match partagé pour cette équipe.</div>';return}box.innerHTML='<h4 class="onlineMatchesTitle">Matchs partagés</h4><div class="onlineMatchList">'+rows.map(m=>{let meta=[m.date?formatDate(m.date):'',m.time||'',m.place||''].filter(Boolean).join(' • ')||'Détails à venir',title=m.opp?'vs '+m.opp:'Match';return '<div class="onlineMatch"><div><b>'+esc(title)+'</b><span>'+esc(meta)+'</span><em>#public/'+esc(m.cloud.publicId)+'</em></div><div class="onlineMatchActions"><button class="btn secondary" data-shared-copy="'+escAttr(m.id)+'" type="button">Copier</button><button class="btn danger" data-shared-delete="'+escAttr(m.id)+'" type="button">Retirer</button></div></div>'}).join('')+'</div>';$$('[data-shared-copy]').forEach(b=>{let m=state.matches.find(x=>x.id===b.dataset.sharedCopy);b.onclick=()=>copyTextToClipboard(m?.cloud?.publicId?cloudBaseUrl()+'#public/'+encodeURIComponent(m.cloud.publicId):'','Lien public non disponible',true)});$$('[data-shared-delete]').forEach(b=>b.onclick=()=>confirmModal('Retirer le lien du match','Retirer le lien public de ce match?',()=>unpublishSharedMatch(b.dataset.sharedDelete)))}
async function unpublishSharedMatch(id){let m=state.matches.find(x=>x.id===id&&x.teamId===state.activeTeamId);if(!m?.cloud?.publicId)return;try{let mod=await cloudModule();await mod.deletePublic(m.cloud.publicId);m.cloud.publicId=null;m.cloud.publicPassword='';if(m.id===state.activeMatchId){cloud.publicId=null;cloud.publicPassword='';state.cloud=m.cloud}if(cloud.teamPublicId)await savePublicTeam(true);save();renderAll()}catch(e){modal('Retrait impossible',e.message||String(e))}}
function renderCloudUi(){
  let team=activeTeam(),hasTeam=!!team,hasTeamName=!!teamProfileName();
  let account=$('#cloudAccountBtn');
  if(account){account.textContent=cloud.user?'Déconnexion':'Connexion';account.onclick=cloud.user?signOutCloud:()=>cloudLoginModal()}
  let pub=$('#publicShareText');
  if(pub)pub.textContent=cloud.publicId?'Lien actif. Les données se mettent à jour automatiquement.':'Les fans pourront suivre le match en direct!';
  ['parentImageBtn','printCoachBtn','copyTextBtn'].forEach(id=>{let btn=$('#'+id);if(btn){btn.disabled=!activeMatch();btn.title=activeMatch()?'':'Ouvre ou crée un match avant d’exporter.'}});
  let pass=$('#publicPassword');
  if(pass){if(document.activeElement!==pass)pass.value=cloud.publicPassword||'';pass.disabled=!!cloud.publicId;pass.title=cloud.publicId?'Retire le lien pour changer le mot de passe.':''}
  let passHint=$('#publicPasswordHint');
  if(passHint)passHint.classList.toggle('hide',!String(cloud.publicPassword||pass?.value||'').trim());
  let teamText=$('#teamPublicShareText');
  if(teamText)teamText.textContent=!hasTeam?'Crée une équipe pour activer un lien permanent.':cloud.teamPublicId?'Lien permanent actif pour l’équipe courante.':'Un seul lien à conserver pour cette équipe.';
  let teamSlug=$('#teamPublicSlug');
  if(teamSlug){
    if(document.activeElement!==teamSlug)teamSlug.value=team?.publicSlug||'';
    teamSlug.disabled=!hasTeam||!!cloud.teamPublicId;
    teamSlug.title=!hasTeam?'Crée une équipe avant de choisir un identifiant public.':cloud.teamPublicId?'Retire le lien permanent avant de changer l’identifiant public.':'';
  }
  let teamSlugUrl=$('#teamPublicSlugUrl');
  if(teamSlugUrl)teamSlugUrl.textContent=(team?.publicSlug||cloud.teamPublicId)?'#fans/'+(team?.publicSlug||cloud.teamPublicId):'#fans/expos-rallye-cap';
  let teamPass=$('#teamPublicPassword');
  if(teamPass){
    if(document.activeElement!==teamPass)teamPass.value=cloud.teamPublicPassword||'';
    teamPass.disabled=!hasTeam||!!cloud.teamPublicId;
    teamPass.title=!hasTeam?'Crée une équipe avant de choisir un mot de passe.':cloud.teamPublicId?'Retire le lien pour changer le mot de passe.':'';
  }
  let teamPassHint=$('#teamPublicPasswordHint');
  if(teamPassHint)teamPassHint.classList.toggle('hide',!String(cloud.teamPublicPassword||teamPass?.value||'').trim());
  let publishTeam=$('#publishTeamPublicBtn');
  if(publishTeam){
    publishTeam.classList.toggle('hide',!!cloud.teamPublicId);
    publishTeam.disabled=!hasTeam||!hasTeamName;
    publishTeam.title=!hasTeam?'Crée une équipe avant de publier.':!hasTeamName?'Nomme l’équipe avant de publier.':cloud.user?'Créer le lien permanent de l’équipe.':'Connexion requise.';
  }
  let copyTeam=$('#copyTeamPublicLinkBtn');
  if(copyTeam){copyTeam.classList.toggle('hide',!cloud.teamPublicId);copyTeam.disabled=!cloud.teamPublicId;copyTeam.title=cloud.teamPublicId?'Copier le lien permanent.':'Crée le lien avant de le copier.'}
  let unpubTeam=$('#unpublishTeamPublicBtn');
  if(unpubTeam){unpubTeam.classList.toggle('hide',!cloud.teamPublicId);unpubTeam.disabled=!cloud.teamPublicId;unpubTeam.title=cloud.teamPublicId?'Retirer le lien permanent.':'Aucun lien permanent actif.'}
  let publish=$('#publishPublicBtn');
  if(publish){publish.classList.toggle('hide',!!cloud.publicId);publish.disabled=!activeMatch();publish.title=!activeMatch()?'Ouvre ou crée un match avant de publier.':cloud.user?'Créer le lien Match.':'Connexion requise.'}
  let copyPub=$('#copyPublicLinkBtn');
  if(copyPub){copyPub.classList.toggle('hide',!cloud.publicId);copyPub.disabled=!cloud.publicId;copyPub.title=cloud.publicId?'Copier le lien pour les fans.':'Crée le lien avant de le copier.'}
  let unpub=$('#unpublishPublicBtn');
  if(unpub){unpub.classList.toggle('hide',!cloud.publicId);unpub.disabled=!cloud.publicId;unpub.title=cloud.publicId?'Retirer le lien public.':'Aucun lien public actif.'}
  let m=activeMatch(),quick=$('#quickMatchLink'),quickVisible=!!(m&&(m.status==='active'||m.status==='completed'));
  if(quick){quick.classList.toggle('hide',!quickVisible||state.route==='jouer');quick.href=quickVisible?'#jouer':'#accueil';quick.textContent=m?.status==='completed'?'Match terminé':'Match en cours'}
  renderShareStep();
  renderCloudMatchesList();
  renderPublicTeamsList();
  renderSharedMatchesList();
}
function renderShareStep(){let btn=$('#shareStepBtn');if(!btn)return;let m=activeMatch(),shared=!!m?.cloud?.publicId;btn.disabled=!m||m.status==='archived';btn.classList.toggle('shared',shared);let title=$('#shareStepTitle');if(title)title.textContent='Partager'}
function setPublicControlsVisible(visible){let dots=$('#matchDots'),controls=$('.matchControls');if(dots)dots.classList.toggle('hide',!visible);if(controls)controls.classList.toggle('hide',!visible)}
async function openFansRoute(id){stopCloudMatchListener();cloud.publicTeamRoute=id;cloud.publicIdRoute=null;if(cloud.unsubPublic){cloud.unsubPublic();cloud.unsubPublic=null}state.route='spectateur';document.title='Matchs disponibles - CoachRally';document.body.classList.add('spectatorRoute');$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-spectateur'));$$('.steps').forEach(el=>el.classList.add('hide'));setPublicControlsVisible(false);$('#matchCard').innerHTML='<div><span class="matchPill future">Chargement</span><h2 class="matchTitle">Matchs disponibles</h2><div class="tiny matchMeta">Connexion au lien d’équipe...</div></div>';$('#matchDots').innerHTML='';$('#matchPrev').disabled=true;$('#matchNext').disabled=true;let currentBtn=$('#matchCurrent');if(currentBtn)currentBtn.disabled=true;try{let mod=await cloudModule();if(cloud.unsubPublicTeam){cloud.unsubPublicTeam();cloud.unsubPublicTeam=null}cloud.unsubPublicTeam=await mod.listenPublicTeam(id,async doc=>{if(!doc){renderPublicError('Lien introuvable','Ce partage d’équipe n’existe plus.');return}if(doc.passwordProtected){let pass=cloud.teamPublicPassword||sessionStorage.getItem('rallye_cap_public_team_password_'+id)||'';if(!pass){askPublicTeamPassword(id);return}try{cloud.publicTeamView=await mod.decryptJson(doc.encryptedPayload,pass);sessionStorage.setItem('rallye_cap_public_team_password_'+id,pass);renderPublicTeam()}catch(e){sessionStorage.removeItem('rallye_cap_public_team_password_'+id);cloud.teamPublicPassword='';askPublicTeamPassword(id,true)}}else{cloud.publicTeamView=doc.payload||{};renderPublicTeam()}})}catch(e){renderPublicError('Cloud non configuré',e.message||String(e))}}
function askPublicTeamPassword(id,bad){modal(bad?'Mot de passe invalide':'Mot de passe requis','Entre le mot de passe du lien d’équipe.',[{kind:'inputPublicPassword',onClick:pass=>{cloud.teamPublicPassword=pass;sessionStorage.setItem('rallye_cap_public_team_password_'+id,pass);openFansRoute(id)}},{label:'Annuler',kind:'modalCancel'}])}
function renderPublicTeam(){setPublicControlsVisible(false);let view=cloud.publicTeamView||{},matches=Array.isArray(view.matches)?view.matches:[],players=Array.isArray(view.players)?view.players:[],title=view.team||'Équipe',teamMessage=renderMiniMarkdownHtml(view.fanMessage||'');ensurePublicFavoriteContext(cloud.publicTeamRoute);let playerItems=players.length?players.map((p,i)=>publicPlayerItem(p.number?'#'+p.number:i+1,p.name||p.label,p.playerId,p.number)).join(''):'<div class="matchItem"><strong>⚾</strong><span>Aucun joueur publié pour le moment.</span></div>',matchItems=matches.length?matches.map(m=>{let meta=[m.date?formatDate(m.date):'',m.time||'',m.place||''].filter(Boolean).join(' • '),status=m.completed?'Match terminé':m.started?'En cours':m.ready?'Prêt à jouer':'À venir',lock=m.passwordProtected?' • mot de passe':'',statusClass=m.started&&!m.completed?' currentStatus':'';return '<a class="matchItem publicMatchLink'+statusClass+'" href="#public/'+encodeURIComponent(m.publicId)+'"><strong>'+esc(status)+'</strong><span><b>'+esc(m.opp?'vs '+m.opp:'Match')+'</b><small>'+esc(meta||'Détails à venir')+esc(lock)+'</small></span></a>'}).join(''):'<div class="matchItem"><strong>⚾</strong><span>Aucun match publié pour le moment.</span></div>',tip=players.length?'<div class="favoriteTip"><strong>💡</strong><span>Clique tes joueurs favoris pour les suivre</span></div>':'',message=teamMessage?'<div class="fanMessage">'+teamMessage+'</div>':'';$('#matchCard').innerHTML='<div><h2 class="matchTitle">'+esc(title)+'</h2></div>'+message+'<h3 class="matchSectionTitle">Joueurs</h3><div class="matchList">'+playerItems+'</div>'+tip+'<h3 class="matchSectionTitle">Matchs publiés</h3><div class="matchList">'+matchItems+'</div>';bindPublicFavoriteClicks(renderPublicTeam);$('#matchDots').innerHTML='';$('#matchPrev').disabled=true;$('#matchNext').disabled=true;let currentBtn=$('#matchCurrent');if(currentBtn)currentBtn.disabled=true}
async function openPublicRoute(id){stopCloudMatchListener();if(cloud.publicIdRoute!==id){spectatorTouched=false;cloud.publicCurrentIndex=null;cloud.publicPromptedIndex=null;cloud.publicFavoriteContext=null;cloud.publicFavoriteKeys=[]}cloud.publicIdRoute=id;cloud.publicTeamRoute=null;if(cloud.unsubPublicTeam){cloud.unsubPublicTeam();cloud.unsubPublicTeam=null}state.route='spectateur';document.body.classList.add('spectatorRoute');$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-spectateur'));$$('.steps').forEach(el=>el.classList.add('hide'));setPublicControlsVisible(true);$('#matchCard').innerHTML='<div><span class="matchPill future">Chargement</span><h2 class="matchTitle">Spectateurs en direct</h2><div class="tiny matchMeta">Connexion au lien public...</div></div>';$('#matchDots').innerHTML='';try{let mod=await cloudModule();if(cloud.unsubPublic){cloud.unsubPublic();cloud.unsubPublic=null}cloud.unsubPublic=await mod.listenPublic(id,async doc=>{if(!doc){renderPublicError('Lien introuvable','Ce partage public n’existe plus.');return}if(doc.passwordProtected){let pass=cloud.publicPassword||sessionStorage.getItem('rallye_cap_public_password_'+id)||'';if(!pass){askPublicPassword(id);return}try{cloud.publicView=await mod.decryptJson(doc.encryptedPayload,pass);sessionStorage.setItem('rallye_cap_public_password_'+id,pass);ensurePublicFavoriteContext(cloud.publicView?.teamPublicId);renderPublicMatch()}catch(e){sessionStorage.removeItem('rallye_cap_public_password_'+id);cloud.publicPassword='';askPublicPassword(id,true)}}else{cloud.publicView=doc.payload;ensurePublicFavoriteContext(cloud.publicView?.teamPublicId);renderPublicMatch()}})}catch(e){renderPublicError('Cloud non configuré',e.message||String(e))}}
function askPublicPassword(id,bad){modal(bad?'Mot de passe invalide':'Mot de passe requis','Entre le mot de passe du lien public.',[{kind:'inputPublicPassword',onClick:pass=>{cloud.publicPassword=pass;sessionStorage.setItem('rallye_cap_public_password_'+id,pass);openPublicRoute(id)}},{label:'Annuler',kind:'modalCancel'}])}
async function openBenchRoute(id){
  stopCloudMatchListener();cloud.publicIdRoute=id;cloud.publicTeamRoute=null;state.route='banc';
  if(cloud.unsubPublicTeam){cloud.unsubPublicTeam();cloud.unsubPublicTeam=null}
  document.title='Banc des jeunes - CoachRally';document.body.classList.remove('spectatorRoute');document.body.classList.add('benchRoute');
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-banc'));$$('.steps').forEach(el=>el.classList.add('hide'));
  if(id==='local'){
    if(!activeMatch()){renderBenchError('Aucun match actif','Prépare ou ouvre un match pour afficher l’aperçu local du banc.');return}
    cloud.publicView=publicProjection();renderYoungBench('local');return
  }
  $('#youngBench').innerHTML='<div class="benchLoading"><span>⚾</span><strong>Connexion au banc…</strong></div>';
  try{
    let mod=await cloudModule();if(cloud.unsubPublic){cloud.unsubPublic();cloud.unsubPublic=null}
    cloud.unsubPublic=await mod.listenPublic(id,async doc=>{
      if(!doc){renderBenchError('Lien introuvable','Ce partage du match n’existe plus.');return}
      if(doc.passwordProtected){
        let pass=cloud.publicPassword||sessionStorage.getItem('rallye_cap_public_password_'+id)||'';
        if(!pass){askBenchPassword(id);return}
        try{cloud.publicView=await mod.decryptJson(doc.encryptedPayload,pass);sessionStorage.setItem('rallye_cap_public_password_'+id,pass);renderYoungBench(navigator.onLine?'connected':'offline')}
        catch(e){sessionStorage.removeItem('rallye_cap_public_password_'+id);cloud.publicPassword='';askBenchPassword(id,true)}
      }else{cloud.publicView=doc.payload||{};renderYoungBench(navigator.onLine?'connected':'offline')}
    })
  }catch(e){renderBenchError('Connexion impossible',e.message||String(e))}
}
function askBenchPassword(id,bad){modal(bad?'Mot de passe invalide':'Mot de passe requis','Entre le mot de passe du lien Banc.',[{kind:'inputPublicPassword',onClick:pass=>{cloud.publicPassword=pass;sessionStorage.setItem('rallye_cap_public_password_'+id,pass);openBenchRoute(id)}},{label:'Annuler',kind:'modalCancel'}])}
function benchPlayerName(row){return '<b>'+esc(row?.name||'—')+'</b>'}
function benchActivePlayerName(row){return '<span class="benchActiveName"><b>'+esc(row?.name||'—')+'</b></span>'}
function benchBatting(rows,compact){return '<div class="benchBatting '+(compact?'compact':'')+'">'+rows.map(row=>'<div class="benchBatter"><strong>'+esc(row.rank)+'</strong>'+benchActivePlayerName(row)+'</div>').join('')+'</div>'}
function benchDefense(rows,compact){let byPosition={};rows.forEach(row=>byPosition[row.position]=row);let positions=[['L1','Lanceur gauche'],['L2','Lanceur droite'],['AC','Arrêt-court'],['1B','Premier but'],['2B','Deuxième but'],['3B','Troisième but']];return '<div class="benchDefense '+(compact?'compact':'')+'">'+positions.map(([code,label])=>{let row=byPosition[code]||{name:'—'},cap=code==='L1'||code==='L2'?' 🧢':'';return '<div class="benchDefender">'+benchActivePlayerName(row)+'<span class="benchDefenseRole"><strong>'+esc(code)+' — '+esc(label)+cap+'</strong></span></div>'}).join('')+'</div>'}
function benchPhase(phase,compact){if(!phase)return'';let body=phase.type==='attaque'?benchBatting(phase.rows,compact):benchDefense(phase.rows,compact),icon=phase.type==='attaque'?'🏏':'🧤';return '<div class="benchPhaseHead"><span><span aria-hidden="true">'+icon+'</span> '+esc(phase.label)+'</span></div>'+body}
function benchMissions(players,compact){if(!players.length)return '<div class="benchMissions '+(compact?'compact':'')+'"><strong>🌟</strong></div>';return '<div class="benchMissions '+(compact?'compact':'')+'">'+players.map(player=>'<div class="benchMission"><span>'+benchPlayerName(player)+'</span><strong aria-label="Mission encouragement">'+esc(player.mission)+'</strong></div>').join('')+'</div>'}
function renderYoungBench(connection){
  let box=$('#youngBench'),model=window.RallyeCapBench.buildModel(cloud.publicView),local=connection==='local',sync=local?'Aperçu local':connection==='offline'?'Hors ligne':'Synchronisé',syncClass=local?'local':connection==='offline'?'offline':'online';
  let header='<header class="benchHeader"><div><strong>'+esc(model.team)+(model.opp?' <span>vs '+esc(model.opp)+'</span>':'')+'</strong></div><small class="'+syncClass+'" aria-label="'+sync+'" title="'+sync+'"><i></i></small></header>';
  if(model.status==='waiting'){box.innerHTML=header+'<main class="benchState"><span>🧢 🏏 🧤</span><h1>Le match commencera bientôt</h1><p>Prépare ton sourire et ton esprit d’équipe!</p></main>';return}
  if(model.status==='final'){box.innerHTML=header+'<main class="benchState final"><span>🏆</span><h1>Bravo l’équipe!</h1><p>Merci pour tes encouragements!</p></main>';return}
  let next=model.next?benchPhase(model.next,true):'<div class="benchLast"><span>🎉</span><strong>Dernière manche</strong><p>Encourage ton équipe!</p></div>';
  box.innerHTML=header+'<main class="benchDashboard"><section class="benchNow"><h1>Maintenant</h1>'+benchPhase(model.current,false)+'</section><aside class="benchNext"><h2>Ensuite</h2>'+next+'</aside></main>';
}
function renderBenchError(title,text){$('#youngBench').innerHTML='<main class="benchState error"><span>⚾</span><h1>'+esc(title)+'</h1><p>'+esc(text||'')+'</p></main>'}
function renderPublicError(title,text){$('#matchCard').innerHTML='<div><span class="matchPill done">Spectateur</span><h2 class="matchTitle">'+esc(title)+'</h2><div class="tiny matchMeta">'+esc(text||'')+'</div></div>';$('#matchDots').innerHTML='';$('#matchPrev').disabled=true;$('#matchNext').disabled=true;let currentBtn=$('#matchCurrent');if(currentBtn)currentBtn.disabled=true}
function publicPhases(){return cloud.publicView?.phases||[]}
function publicSteps(view){let phases=(view?.phases||[]).map(ph=>Object.assign({kind:'phase'},ph));if(!view?.started&&!view?.ready)return[{kind:'program',label:'Programme'}];let steps=[{kind:'program',label:'Programme'}].concat(phases);if(view?.started&&Number(view.currentIndex||0)>=phases.length)steps.push({kind:'final',label:'Merci'});return steps}
function publicCurrentStepIndex(view){let phases=view?.phases||[];if(!view?.started)return 0;let current=Number(view.currentIndex||0);if(current>=phases.length)return phases.length+1;return current+1}
function publicMeta(view){return [view.date?formatDate(view.date):'',view.time||'',view.place||''].filter(Boolean).join(' • ')}
function publicTeamsTitle(view){return [view?.team||'Équipe',view?.opp?'vs '+view.opp:''].filter(Boolean).join(' ')}
function publicFavoriteStorageKey(context){return 'rallye_cap_public_favorite_players:'+(context||'global')}
function loadPublicFavorites(context){try{let raw=localStorage.getItem(publicFavoriteStorageKey(context)),arr=raw?JSON.parse(raw):[];if(!Array.isArray(arr))arr=[];return arr.map(String).filter(Boolean)}catch(e){return[]}}
function ensurePublicFavoriteContext(context){let next=context||'global';if(cloud.publicFavoriteContext!==next){cloud.publicFavoriteContext=next;cloud.publicFavoriteKeys=loadPublicFavorites(next)}}
function savePublicFavorites(){try{localStorage.setItem(publicFavoriteStorageKey(cloud.publicFavoriteContext||'global'),JSON.stringify((cloud.publicFavoriteKeys||[]).filter(Boolean)))}catch(e){}}
function publicPlayerItem(rank,label,playerId,number){let key=String(playerId||''),fav=!!key&&(cloud.publicFavoriteKeys||[]).includes(key),disabled=key?'':' disabled',num=String(number||'').trim();return '<button type="button" class="matchItem playerFavoriteItem '+(fav?'favorite':'')+'" data-public-player="'+escAttr(key)+'"'+disabled+'><strong class="publicRank">'+esc(rank)+'</strong><span class="publicPlayerName">'+(num?'<em class="publicNumber">#'+esc(num)+'</em>':'')+'<b>'+esc(label||'')+'</b></span><em class="favoriteStar" aria-hidden="true">★</em></button>'}
function bindPublicFavoriteClicks(renderFn){$$('[data-public-player]').forEach(el=>el.onclick=()=>{let key=el.dataset.publicPlayer||'',cur=new Set(cloud.publicFavoriteKeys||[]);if(!key)return;if(cur.has(key))cur.delete(key);else cur.add(key);cloud.publicFavoriteKeys=Array.from(cur);savePublicFavorites();(renderFn||renderPublicMatch)()})}
function renderPublicProgram(view){let players=view?.programme?.players||view?.battingOrder||[],visible=view?.started||view?.ready,msg=renderMiniMarkdownHtml(view?.fanMessage||view?.programme?.fanMessage||''),message=msg?'<div class="fanMessage">'+msg+'</div>':'',items=!visible?'<div class="matchItem"><strong>⚾</strong><span>Alignement à venir</span></div>':players.length?players.map(p=>publicPlayerItem(p.rank,p.name||p.label,p.playerId,p.number)).join(''):'<div class="matchItem"><strong>⚾</strong><span>Alignement à venir</span></div>',listTitle=visible&&players.length?'<h3 class="matchSectionTitle">Ordre des frappeurs</h3>':'',tip=visible&&players.length?'<div class="favoriteTip"><strong>💡</strong><span>Clique tes joueurs favoris pour les suivre</span></div>':'';return '<div><h2 class="matchTitle">'+esc(publicTeamsTitle(view))+'</h2><div class="tiny matchMeta publicMetaLine">'+esc(publicMeta(view))+'</div></div>'+message+listTitle+'<div class="matchList">'+items+'</div>'+tip}
function renderPublicFinal(view){return '<div><span class="matchPill done">Match terminé</span><h2 class="matchTitle">Merci, à la prochaine!</h2><div class="tiny matchMeta">'+esc(publicMeta(view))+'</div></div><div class="matchList"><div class="matchItem"><strong>⚾</strong><span>Le match est terminé.</span></div></div>'}
function promptPublicCurrentStep(currentStep,steps){if(cloud.publicPromptedIndex===currentStep)return;cloud.publicPromptedIndex=currentStep;let current=steps[currentStep],text=current?.kind==='final'?'Le match est maintenant terminé. Veux-tu l’afficher?':'C’est maintenant '+String(current?.label||'la demi-manche courante').toLowerCase()+'. Veux-tu l’afficher?';modal('Le match avance',text,[{label:'Rester ici',kind:'secondary',onClick:()=>{cloud.publicUpdateAvailable=false}},{label:'Afficher',kind:'brandBtn',onClick:()=>{spectatorTouched=false;cloud.publicUpdateAvailable=false;setMatchIndex(currentStep)}}])}
function renderPublicMatch(){let view=cloud.publicView,steps=publicSteps(view);if(!view||!steps.length){renderPublicError('Match non prêt','Alignement à venir.');return}let currentStep=publicCurrentStepIndex(view),promptCurrent=false;if(cloud.publicCurrentIndex!==null&&currentStep!==cloud.publicCurrentIndex){let wasFollowing=!spectatorTouched||matchIndex===cloud.publicCurrentIndex;if(wasFollowing){matchIndex=currentStep;cloud.publicUpdateAvailable=false}else{cloud.publicUpdateAvailable=true;promptCurrent=true}}if(!spectatorTouched)matchIndex=currentStep;cloud.publicCurrentIndex=currentStep;if(matchIndex>=steps.length)matchIndex=steps.length-1;if(matchIndex<0)matchIndex=0;let step=steps[matchIndex];if(step.kind==='program'){$('#matchCard').innerHTML=renderPublicProgram(view)}else if(step.kind==='final'){$('#matchCard').innerHTML=renderPublicFinal(view)}else{let ph=step,locked=!!ph.locked,currentShown=view.started&&matchIndex===currentStep,title=ph.type==='attaque'?'🏏 Frappeurs':'🧤 Défenseurs',body=ph.type==='attaque'?renderPublicBatters(ph.inning):renderPublicDefense(ph.inning);$('#matchCard').innerHTML='<div><span class="matchPill '+(locked?'done':currentShown?'current':'future')+'">'+esc(ph.label)+'</span><h2 class="matchTitle publicPhaseTitle">'+esc(title)+'</h2><div class="tiny matchMeta publicMetaLine">'+esc(publicMeta(view))+'</div></div><div class="matchList">'+body+'</div>'}$('#matchDots').innerHTML=steps.map((p,i)=>'<button type="button" class="dot '+(i===matchIndex?'active ':'')+(p.locked?'lockedDot ':'')+(i===currentStep?'currentDot':'')+'" data-match-dot="'+i+'" aria-label="'+escAttr(p.label||('Étape '+(i+1)))+'"></button>').join('');$$('[data-match-dot]').forEach(btn=>btn.onclick=()=>setMatchIndex(Number(btn.dataset.matchDot)||0));bindPublicFavoriteClicks(renderPublicMatch);$('#matchPrev').disabled=matchIndex<=0;$('#matchNext').disabled=matchIndex>=steps.length-1;let currentBtn=$('#matchCurrent');if(currentBtn)currentBtn.disabled=matchIndex===currentStep;if(promptCurrent)promptPublicCurrentStep(currentStep,steps)}
function renderPublicBatters(inning){let rows=cloud.publicView?.batters?.[inning]||[];if(!rows.length)rows=cloud.publicView?.battingOrder||[];if(!rows.length)return '<div class="matchItem"><strong>🏏</strong><span>Ordre variable</span></div>';return rows.map(b=>publicPlayerItem(b.rank,b.name||b.label,b.playerId,b.number)).join('')}
function renderPublicDefense(inning){let rows=cloud.publicView?.defense?.[inning]||[];return rows.map(r=>publicPlayerItem(r.pos??r[0],r.name??r[1],r.playerId,r.number)).join('')}
function modal(title,text,buttons){
  $('#modalOverlay').classList.remove('shareModalOpen');
  $('#modalTitle').textContent=title;let modalText=$('#modalText');modalText.textContent=text||'';modalText.classList.toggle('hide',!text);
  let actions=$('#modalActions');actions.innerHTML='';
  actions.classList.toggle('choiceList',!!(buttons||[]).some(b=>String(b.kind||'').includes('playerChoice')||String(b.kind||'').includes('modalCancel')||String(b.kind||'').includes('input')));
  (buttons||[{label:'OK',kind:'brandBtn'}]).forEach(b=>{
    let inputChoice=(html,selector,submitText,onValue)=>{
      let box=document.createElement('div');box.className='modalInputChoice';box.innerHTML=html+'<button class="btn brandBtn" type="button">'+submitText+'</button>';
      let input=box.querySelector(selector),btn=box.querySelector('button'),submit=()=>{let value=input.value.trim();if(!value){input.focus();return}closeModal();onValue(value)};
      btn.onclick=submit;input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(selector==='textarea'?e.ctrlKey||e.metaKey:true))submit()});
      actions.appendChild(box);setTimeout(()=>input.focus(),0)
    };
    if(b.kind==='inputReplace'){inputChoice('<label><span>Nouveau joueur</span><input id="replacementName" placeholder="ex. Nouveau joueur"></label>','input','Utiliser ce nom',value=>b.onClick&&b.onClick(value));return}
    if(b.kind==='inputTeamName'){inputChoice('<label><span>Nom de l’équipe</span><input id="newTeamNameInput" placeholder="ex. Expos de Montréal"></label>','input','Créer',value=>b.onClick&&b.onClick(value));return}
    if(b.kind==='inputCloudEmail'){
      let box=document.createElement('div');box.className='modalInputChoice';box.innerHTML='<label><span>Courriel</span><input id="cloudEmail" type="email" autocomplete="email" placeholder="ex. coach@example.com"></label><label><span>Mot de passe</span><input id="cloudPassword" type="password" autocomplete="current-password"></label><div class="row"><button class="btn brandBtn" type="button" data-cloud-login>Se connecter</button><button class="btn secondary" type="button" data-cloud-create>Créer le compte</button></div>';
      let email=box.querySelector('#cloudEmail'),password=box.querySelector('#cloudPassword');
      box.querySelector('[data-cloud-login]').onclick=()=>{if(email.value&&password.value){closeModal();signInEmailCloud(email.value,password.value,false)}};
      box.querySelector('[data-cloud-create]').onclick=()=>{if(email.value&&password.value){closeModal();signInEmailCloud(email.value,password.value,true)}};
      actions.appendChild(box);setTimeout(()=>email.focus(),0);return
    }
    if(b.kind==='inputPublicPassword'){inputChoice('<label><span>Mot de passe</span><input id="publicViewPassword" name="spectator-view-code" type="text" inputmode="text" autocomplete="off"></label>','input','Ouvrir',value=>b.onClick&&b.onClick(value));return}
    if(b.kind==='inputAddPlayers'){
      let placeholder=b.withNumbers?'ex. #27 Émile, 12 Julien, Noah':'ex. Émile, Julien, Noah';
      inputChoice('<label><span>Joueurs à ajouter'+(b.withNumbers?' avec ou sans numéro':'')+'</span><textarea id="addPlayersModalNames" placeholder="'+placeholder+'"></textarea></label>','textarea','Continuer',value=>{let names=b.withNumbers?parsePlayerEntries(value):parseNames(value);if(names.length&&b.onClick)b.onClick(names)})
      return
    }
    let btn=document.createElement('button');btn.className='btn '+(b.kind||'secondary');btn.textContent=b.label;if(b.kind==='googleBtn')btn.setAttribute('aria-label','Continuer avec Google');btn.onclick=()=>{closeModal();if(b.onClick)b.onClick()};actions.appendChild(btn)
  });
  $('#modalOverlay').classList.add('show')
}
function closeModal(){$('#modalOverlay').classList.remove('show','shareModalOpen')}
function confirmModal(title,text,onYes){modal(title,text,[{label:'Annuler',kind:'secondary'},{label:'Confirmer',kind:'danger',onClick:onYes}])}
function modalShell(title,text){$('#modalTitle').textContent=title;let modalText=$('#modalText');modalText.textContent=text||'';modalText.classList.toggle('hide',!text);let actions=$('#modalActions');actions.innerHTML='';actions.classList.add('choiceList');$('#modalOverlay').classList.add('show');return actions}
function buttonEl(label,kind,onClick){let btn=document.createElement('button');btn.className='btn '+(kind||'secondary');btn.type='button';btn.textContent=label;btn.onclick=onClick;return btn}
function modalSection(title){let section=document.createElement('div');section.className='modalSection';section.innerHTML='<h4>'+esc(title)+'</h4>';return section}
function describedButtonEl(label,description,onClick){let btn=buttonEl(label,'secondary',onClick);btn.classList.add('describedBtn');let strong=document.createElement('strong');strong.textContent=label;let small=document.createElement('small');small.className='hint';small.textContent=description;btn.textContent='';btn.append(strong,small);return btn}
function cloudLoginButton(text){return buttonEl('Connexion','brandBtn',()=>cloudLoginModal(text))}
function openMatchShareModal(){
  let m=activeMatch();if(!m){modal('Aucun match actif','Prépare ou ouvre un match avant de partager.');return}
  let actions=modalShell('Partager le match',matchHeaderText()||'Choisis une sortie pour ce match.');
  $('#modalOverlay').classList.add('shareModalOpen');
  let spectator=modalSection('Lien Match'),publicUrl=cloudPublicUrl(),publicText=document.createElement('p');
  publicText.className='hint';publicText.textContent='Le match apparaîtra dans le lien d’équipe si vous en avez créé un ou vous pouvez partager le lien vers ce match directement.';
  spectator.appendChild(publicText);
  if(!cloud.user){
    spectator.append(cloudLoginButton('Connecte-toi pour créer le lien Match.'));
  }else{
    let pass=document.createElement('input');pass.id='publicPassword';pass.name='spectator-access-code';pass.type='text';pass.autocomplete='off';pass.placeholder='Mot de passe optionnel';pass.value=cloud.publicPassword||'';pass.disabled=!!cloud.publicId;pass.oninput=()=>{cloud.publicPassword=pass.value;persistCloudRefs();renderShareStep()};
    let label=document.createElement('label');label.innerHTML='<span>Mot de passe optionnel</span>';label.appendChild(pass);spectator.appendChild(label);
    if(cloud.publicId){
      spectator.append(buttonEl('Copier le lien Spectateurs','secondary',()=>copyTextToClipboard(publicUrl,'Lien public non disponible',true)));
      spectator.append(buttonEl('Copier le lien Banc','secondary',()=>copyTextToClipboard(cloudBenchUrl(),'Lien Banc non disponible',true)));
      spectator.append(buttonEl('Retirer','danger',()=>confirmModal('Retirer le lien','Retirer ce lien? Il ne fonctionnera plus.',async()=>{await unpublishPublicMatch();openMatchShareModal()})));
    }else{
      spectator.append(buttonEl('Créer le lien','brandBtn',async()=>{await publishPublicMatch();openMatchShareModal()}));
    }
  }
  actions.appendChild(spectator);
  let manage=modalSection('Gérer en ligne'),manageText=document.createElement('p');
    manageText.className='hint';manageText.textContent='Sert à la gestion de l’alignement et la synchronisation du match pour le coach.';
  manage.appendChild(manageText);
  if(!cloud.user){
    manage.append(cloudLoginButton('Connecte-toi pour gérer la sauvegarde en ligne du match.'));
  }else{
    let toggle=document.createElement('div');toggle.className='segment cloudManageToggle';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Gérer en ligne');
    let yes=buttonEl('Oui',cloud.matchId?'active':'',async()=>{let id=await saveCloudMatch(false);if(id)openMatchShareModal()});
    let no=buttonEl('Non',cloud.matchId?'':'active',()=>{if(!cloud.matchId)return;confirmModal('Retirer du cloud','Retirer la sauvegarde privée en ligne de ce match? La copie locale et le lien spectateur seront conservés.',async()=>{await removePrivateMatchCloud(activeMatchRow());openMatchShareModal()})});
    toggle.append(yes,no);manage.appendChild(toggle);
  }
  actions.appendChild(manage);
  let exports=modalSection('Exports');
  exports.append(describedButtonEl('Programme','Le programme imagé du match',()=>{closeModal();exportParentImage()}));
  exports.append(describedButtonEl('Banc','Un tableau sommaire utilisé au banc par les joueurs et le coach',()=>{closeModal();printCoach()}));
  exports.append(describedButtonEl('Texte','Une version texte imprimable dans un format compact.',()=>{closeModal();showMiniTextPreview()}));
  actions.appendChild(exports);
  let close=buttonEl('Fermer','secondary',closeModal);actions.appendChild(close)
}
async function enablePrivateTeam(){let team=activeTeam();if(!team)return null;if(!cloud.user&&!(await requireCloudAuth('Connecte-toi pour gérer cette équipe en ligne.')))return null;team.cloud={enabled:true};team.updatedAtMs=Date.now();persistStateOnly();let id=await savePrivateTeam(team,true);if(!id){team.cloud={enabled:false};persistStateOnly();return null}renderAll();return id}
async function disablePrivateTeam(){let team=activeTeam();if(!team||!cloud.user)return;let mod=await cloudModule(),teamId=team.id,ids=RallyeCapTeamSync.privateMatchIds(teamId,state.matches,cloud.matches);for(let id of ids)await mod.deleteMatch(id);state.matches.filter(m=>m.teamId===teamId&&m.cloud?.matchId).forEach(m=>{m.cloud.matchId=null});await mod.deleteTeam(teamId);team.cloud={enabled:false};delete cloud.teamPayloads[teamId];stopPrivateTeamListener();if(activeMatch()?.teamId===teamId){cloud.matchId=null;state.cloud=activeMatch().cloud}await refreshCloudMatches(true);persistStateOnly();renderAll()}
function openTeamPublicLinkModal(){
  let team=activeTeam();if(!team){modal('Équipe requise','Crée une équipe avant de publier un lien.');return}
  let ownedId=activeTeamPublicId();if(team.publicId&&!ownedId){team.publicId=null;team.publicSlug='';team.publicPassword='';persistStateOnly()}
  cloud.teamPublicId=ownedId;cloud.teamPublicPassword=team.publicPassword||'';
  let actions=modalShell('Lien d’équipe','Un seul lien à conserver pour les parents et fans. Les matchs partagés seront disponibles sur ce lien.');
  let publicSection=modalSection('Lien public'),existingId=ownedId||'';
  if(!cloud.user)publicSection.append(cloudLoginButton('Connecte-toi pour créer le lien public de l’équipe.'));
  else if(existingId){
    let box=document.createElement('div');box.className='onlineMatch';box.innerHTML='<div><b>#fans/'+esc(existingId)+'</b><span>'+esc(publicTeamUrl(existingId))+'</span></div><div class="onlineMatchActions"></div>';
    let controls=box.querySelector('.onlineMatchActions');controls.append(buttonEl('Copier','secondary',()=>copyTextToClipboard(publicTeamUrl(existingId),'Lien d’équipe non disponible',true)));controls.append(buttonEl('Retirer','danger',()=>confirmModal('Retirer le lien d’équipe','Retirer ce lien permanent? Les liens de match déjà créés resteront actifs.',async()=>{await unpublishPublicTeam();openTeamPublicLinkModal()})));publicSection.appendChild(box)
  }else{
    let slug=document.createElement('input');slug.id='teamPublicModalSlug';slug.placeholder='ex. expos-rallye-cap';slug.autocomplete='off';slug.value=team.publicSlug||'';slug.oninput=()=>{slug.value=normalizeTeamPublicIdDraft(slug.value)};
    let slugLabel=document.createElement('label');slugLabel.innerHTML='<span>Identifiant public</span>';slugLabel.appendChild(slug);let slugHint=document.createElement('small');slugHint.className='hint';slugHint.textContent='3 à 40 caractères: lettres, chiffres et tirets. Les autres séparateurs deviennent des tirets.';slugLabel.appendChild(slugHint);publicSection.appendChild(slugLabel);
    let pass=document.createElement('input');pass.id='teamPublicModalPassword';pass.name='team-spectator-access-code';pass.type='text';pass.autocomplete='off';pass.placeholder='ex. Youppi!';pass.value=team.publicPassword||'';
    let passLabel=document.createElement('label');passLabel.innerHTML='<span>Mot de passe optionnel</span>';passLabel.appendChild(pass);publicSection.appendChild(passLabel);
    let error=document.createElement('p');error.className='alert bad hide';error.setAttribute('role','alert');publicSection.appendChild(error);let showError=text=>{error.textContent=text;error.classList.remove('hide')};
    let create=buttonEl('Créer le lien','brandBtn',async()=>{error.classList.add('hide');let id=await savePublicTeam(false,showError);if(id)openTeamPublicLinkModal()});create.id='publishTeamPublicBtn';publicSection.appendChild(create)
  }
  let message=document.createElement('textarea');message.id='teamFanMessage';message.maxLength=300;message.placeholder='ex. Merci de nous encourager!';message.value=team.fanMessage||'';
  let messageLabel=document.createElement('label');messageLabel.innerHTML='<span>Message aux fans</span>';messageLabel.appendChild(message);let messageHint=document.createElement('small');messageHint.className='hint';messageHint.textContent='Affiché sur la page de l’équipe. Markdown simple: **gras**, *italique*, retours de ligne et listes avec "-".';messageLabel.appendChild(messageHint);let messagePreview=document.createElement('div');messagePreview.className='fanMessagePreview';let refreshMessage=()=>{let html=renderMiniMarkdownHtml(message.value);messagePreview.innerHTML=html?'<strong>Aperçu</strong>'+html:'';messagePreview.classList.toggle('hide',!html)};message.oninput=()=>{team.fanMessage=cleanFanMessage(message.value);if(message.value!==team.fanMessage)message.value=team.fanMessage;team.updatedAtMs=Date.now();persistStateOnly();schedulePrivateTeamSave();syncPublicTeamIfActive();refreshMessage()};refreshMessage();publicSection.append(messageLabel,messagePreview);
  actions.appendChild(publicSection);
  let manage=modalSection('Gérer en ligne');
  if(!cloud.user)manage.append(cloudLoginButton('Connecte-toi pour gérer cette équipe en ligne.'));
  else{let enabled=team.cloud?.enabled===true,toggle=document.createElement('div');toggle.className='segment cloudManageToggle';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Gérer l’équipe en ligne');let yes=buttonEl('Oui',enabled?'active':'',async()=>{if(enabled)return;let id=await enablePrivateTeam();if(id)openTeamPublicLinkModal()});let no=buttonEl('Non',enabled?'':'active',()=>{if(!enabled)return;confirmModal('Retirer l’équipe du cloud','Retirer l’équipe et tous ses matchs de la gestion privée en ligne? Les copies locales et les liens spectateurs seront conservés.',async()=>{await disablePrivateTeam();openTeamPublicLinkModal()})});toggle.append(yes,no);manage.appendChild(toggle)}
  actions.append(manage,buttonEl('Fermer','secondary',closeModal));
}
function closeMainMenu(){let nav=$('#nav'),hamb=$('#hamb');if(nav)nav.classList.remove('open');if(hamb)hamb.setAttribute('aria-expanded','false')}
function toggleMainMenu(){let nav=$('#nav'),hamb=$('#hamb');if(!nav)return;let open=!nav.classList.contains('open');nav.classList.toggle('open',open);if(hamb)hamb.setAttribute('aria-expanded',open?'true':'false')}
function populateTimeOptions(){let hour=$('#timeHour'),minute=$('#timeMinute');if(!hour||!minute||hour.options.length||minute.options.length)return;hour.appendChild(new Option('—',''));for(let h=0;h<24;h++){let v=String(h).padStart(2,'0');hour.appendChild(new Option(v,v))}for(let m=0;m<60;m+=5){let v=String(m).padStart(2,'0');minute.appendChild(new Option(v,v))}}
function splitTimeValue(value){let m=String(value||'').match(/^(\d{2}):(\d{2})$/);return m?{hour:m[1],minute:m[2]}:{hour:'',minute:'00'}}
function ensureTimeOption(value){let parts=splitTimeValue(value),minute=$('#timeMinute');if(parts.minute&&minute&&!Array.from(minute.options).some(o=>o.value===parts.minute))minute.appendChild(new Option(parts.minute,parts.minute));return parts}
function invalidateReady(){let m=activeMatch();if(m?.status==='ready'&&!state.started)m.status='draft'}
function markDirty(){optimizeDirty=true;invalidateReady()}
function markPlayerDirty(){optimizeDirty=true;lineupAutoDirty=true;invalidateReady()}
function phaseKey(inning,half){return inning+':'+half}
function isInningLocked(i){return state.locks?.innings?.[i]===true}
function isHalfLocked(i,half){return isInningLocked(i)||state.locks?.halves?.[phaseKey(i,half)]===true}
function inningLockState(i){let a=isHalfLocked(i,'debut'),b=isHalfLocked(i,'fin');return a&&b?'full':a||b?'partial':'open'}
function isMatchStarted(){return state.started===true}
function isMatchReady(){return activeMatch()?.status==='ready'&&!isMatchStarted()}
function isMatchInProgress(){return activeMatch()?.status==='active'}
function isReadOnlyMatch(){return activeMatch()?.status==='archived'}
function isLineupReadOnly(){return isReadOnlyMatch()||(state.route==='alignement'&&isMatchStarted())||(state.route==='jouer'&&!isMatchStarted())}
function snapshotBattingOrder(i,half){if(isBattingHalf(half))state.battingOrders[phaseKey(i,half)]=active().map(p=>p.id)}
function clearBattingSnapshot(i,half){delete state.battingOrders[phaseKey(i,half)]}
function halfSequence(){let out=[];for(let i=0;i<state.innings;i++){out.push({inning:i,half:'debut'});out.push({inning:i,half:'fin'})}return out}
function halfName(p){return halfLabel(p.half).toLowerCase()+' de la manche '+(p.inning+1)}
function setHalfLock(i,half,locked){let other=half==='debut'?'fin':'debut';if(isInningLocked(i)){delete state.locks.innings[i];state.locks.halves[phaseKey(i,other)]=true}if(locked){state.locks.halves[phaseKey(i,half)]=true;snapshotBattingOrder(i,half)}else{delete state.locks.halves[phaseKey(i,half)];clearBattingSnapshot(i,half)}}
function resetMatch(target){state.started=false;state.locks={innings:{},halves:{}};state.battingOrders={};matchIndex=0;optimizeDirty=true;if(target){state.route=normalizeRoute(String(target).replace('#',''));location.hash='#'+state.route}save();renderAll()}
function startReadiness(){ensureSchedule();return RallyeCapRules.startReadiness(state.schedule,active().map(p=>p.id))}
function markReadyToPlay(){
  if(isReadOnlyMatch()||isMatchStarted())return;
  let readiness=startReadiness();
  if(!readiness.ok){modal('Alignement non prêt',readiness.text);return}
  let warnings=analyze().validations.filter(v=>!v.ok);
  let commit=()=>{let m=activeMatch();if(!m)return;m.status='ready';save();location.hash='#jouer';renderAll()};
  if(warnings.length){confirmModal('Prêt malgré les avertissements?',warnings.map(v=>v.text).join(' ')+' Tu pourras revenir corriger l’alignement avant de commencer.',commit);return}
  commit()
}
function requestStartPlay(){if(isReadOnlyMatch()||state.route!=='jouer')return;if(!isMatchReady()){modal('Alignement non prêt','Retourne dans Alignement et utilise « Prêt à jouer » avant de commencer.');return}confirmModal('Commencer le match','Le match sera débuté. Les étapes de préparation deviendront non modifiables.',beginPlay)}
function beginPlay(){if(isReadOnlyMatch()||state.route!=='jouer'||!isMatchReady())return;state.started=true;let m=activeMatch();if(m)m.status='active';save();renderAll()}
function currentPlayIndex(){let seq=halfSequence(),idx=seq.findIndex(p=>!isHalfLocked(p.inning,p.half));return idx<0?seq.length:idx}
function currentPlayPhase(){return halfSequence()[currentPlayIndex()]}
function isCurrentPlayHalf(i,half){let ph=currentPlayPhase();return isMatchStarted()&&ph&&ph.inning===i&&ph.half===half}
function canChangePlayersDuringMatch(){let idx=currentPlayIndex();return isMatchStarted()&&idx<halfSequence().length}
function advancePlay(){if(isReadOnlyMatch()||state.route!=='jouer')return;if(!isMatchStarted()){requestStartPlay();return}let ph=currentPlayPhase();if(!ph){promptFinishMatch();return}setHalfLock(ph.inning,ph.half,true);let seq=halfSequence();matchIndex=Math.min(currentPlayIndex(),seq.length-1);coachMatchIndex=Math.min(currentPlayIndex(),seq.length-1);save();renderAll();if(currentPlayIndex()>=seq.length)promptFinishMatch()}
function player(id){return state.players.find(p=>p.id===id)}
function playerNumber(pl){let n=cleanNumber(pl?.number);return n?'#'+n:''}
function playerLabel(pl){let n=playerNumber(pl);return n?n+' '+pl.name:pl.name}
function playerBadgeHtml(pl){let n=playerNumber(pl);return n?'<span class="numBadge">'+esc(n)+'</span>':''}
function active(){let ids=new Set(state.players.filter(p=>p.on).map(p=>p.id));let arr=state.order.filter(id=>ids.has(id)).map(player).filter(Boolean);state.players.filter(p=>p.on&&!state.order.includes(p.id)).forEach(p=>arr.push(p));return arr.slice(0,MAX)}
function historicalIds(){let ids=new Set();state.schedule.forEach((inn,i)=>{if(isHalfLocked(i,defenseHalf()))Object.keys(inn.pos||{}).forEach(id=>ids.add(id))});Object.entries(state.battingOrders||{}).forEach(([k,order])=>{let m=k.match(/^(\d+):(debut|fin)$/);if(m&&isHalfLocked(+m[1],m[2]))(order||[]).forEach(id=>ids.add(id))});return ids}
function tablePlayers(){let hist=historicalIds();if(!isMatchStarted())return active();let activeIds=new Set(state.players.filter(p=>p.on).map(p=>p.id)),seen=new Set(),rows=[];state.order.forEach(id=>{let p=player(id);if(p&&(activeIds.has(id)||hist.has(id))&&!seen.has(id)){rows.push(p);seen.add(id)}});state.players.forEach(p=>{if((activeIds.has(p.id)||hist.has(p.id))&&!seen.has(p.id)){rows.push(p);seen.add(p.id)}});return rows.slice(0,MAX+12)}
function mountLineupWorkspace(){let workspace=$('#lineupWorkspace'),mount=state.route==='jouer'?$('#playFullMount'):$('#alignLineupMount');if(workspace&&mount&&workspace.parentElement!==mount)mount.appendChild(workspace)}
function route(name){let raw=name||location.hash.replace('#','')||state.route||'accueil';if(raw.startsWith('public/')){document.body.classList.remove('benchRoute','simplePlayRoute');document.title='Spectateurs en direct - CoachRally';openPublicRoute(raw.slice(7));return}if(raw.startsWith('banc/')){document.body.classList.remove('simplePlayRoute');openBenchRoute(raw.slice(5));return}if(raw.startsWith('fans/')){document.body.classList.remove('benchRoute','simplePlayRoute');openFansRoute(raw.slice(5));return}let r=normalizeRoute(raw);if(['match','joueurs','alignement','jouer'].includes(r)&&!activeMatch()){r='accueil';raw=r;if(location.hash)history.replaceState(null,'','#'+r)}if(['match','joueurs','alignement','jouer'].includes(r)&&cloud.user&&cloud.matchId&&!cloud.unsubMatch)listenCloudMatch(cloud.matchId);document.title=routeTitle(r);cloud.publicView=null;cloud.publicIdRoute=null;cloud.publicTeamView=null;cloud.publicTeamRoute=null;let previous=state.route;if(r==='jouer'&&previous!==r){playView='complete';coachMatchIndex=Math.min(currentPlayIndex(),Math.max(0,halfSequence().length-1))}state.route=r;let autoOptimized=maybeAutoOptimizeLineup(r);save();if(raw!==r&&location.hash)history.replaceState(null,'','#'+r);document.body.classList.remove('spectatorRoute','benchRoute','simplePlayRoute');mountLineupWorkspace();$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+r));$$('[data-nav],[data-step]').forEach(a=>a.classList.toggle('active',(a.dataset.nav||a.dataset.step)===r));$$('.steps').forEach(el=>el.classList.toggle('hide',r==='accueil'||r==='matchs'||r==='a-propos'));closeMainMenu();if(r!==previous)window.scrollTo({top:0,left:0,behavior:'auto'});if(autoOptimized){renderMini()}if(r==='alignement'){renderAlign();renderOptimizeButton()}if(r==='jouer'){renderAlign();renderOptimizeButton();renderPlayGateway();renderCoachMatch();renderPlayView()}if(r!==previous)resetLineupScrollOnEntry(r);if(r==='matchs'&&cloud.user)refreshCloudMatches(true);renderCloudUi()}
function updateFromInputs(){if(isReadOnlyMatch())return;let fanMessage=$('#fanMessage');if(fanMessage){state.fanMessage=cleanFanMessage(fanMessage.value);if(fanMessage.value!==state.fanMessage)fanMessage.value=state.fanMessage}if(isMatchStarted()){save();renderFanMessagePreview();return}state.opp=$('#opp').value;state.date=$('#date').value;let hour=$('#timeHour')?.value||'',minute=$('#timeMinute')?.value||'00';state.time=hour?hour+':'+minute:'';state.place=$('#place').value;let fixed=$('#fixed');if(fixed)state.fixed=fixed.checked;let inn=$('#innings'),next=Math.min(MAX_INN,Math.max(MIN_INN,parseInt(inn?.value||state.innings,10)||MIN_INN));if(next!==state.innings){state.innings=next;state.schedule=state.schedule.slice(0,state.innings);while(state.schedule.length<state.innings)state.schedule.push({pos:{}});Object.keys(state.locks.halves||{}).forEach(k=>{let i=parseInt(k,10);if(i>=state.innings)delete state.locks.halves[k]});Object.keys(state.battingOrders||{}).forEach(k=>{let i=parseInt(k,10);if(i>=state.innings)delete state.battingOrders[k]});lineupAutoDirty=true}markDirty();save();}
function isBattingHalf(half){return(state.side==='visiteur'&&half==='debut')||(state.side==='locale'&&half==='fin')}
function defenseHalf(){return state.side==='visiteur'?'fin':'debut'}
function halfLabel(half){return half==='debut'?'Début':'Fin'}
function halfIcon(half){return isBattingHalf(half)?'🏏':'🧤'}
function batters(inning){let a=active(),all=new Map(state.players.map(p=>[p.id,p]));if(!a.length||!state.fixed)return[];let half=state.side==='visiteur'?'debut':'fin',snap=state.battingOrders?.[phaseKey(inning,half)],ids=Array.isArray(snap)?snap.filter(id=>all.has(id)):a.map(p=>p.id);if(!Array.isArray(snap))a.forEach(p=>{if(!ids.includes(p.id))ids.push(p.id)});let start=(inning*6)%ids.length,out=[];for(let j=0;j<Math.min(6,ids.length);j++){let idx=(start+j)%ids.length,p=all.get(ids[idx]);if(p)out.push({id:p.id,rank:j+1,name:p.name,number:p.number||'',label:playerLabel(p),global:idx+1})}return out}
function batterCounts(){let counts={};active().forEach(p=>counts[p.id]=0);if(state.fixed){for(let i=0;i<state.innings;i++)batters(i).forEach(b=>counts[b.id]++)}return counts}
function emptyStats(){return RallyeCapRules.emptyStats()}
function collectStats(){return RallyeCapRules.collectStats(state.schedule,active().map(p=>p.id),batterCounts(),state.fixed)}
function lineupEngineOptions(){return{playerIds:active().map(p=>p.id),innings:state.innings,fixed:state.fixed,batterIdsByInning:Array.from({length:state.innings},(_,i)=>batters(i).map(b=>b.id)),rules:RallyeCapRules}}
function optimizeLineup(){invalidateReady();state.battingOrders={};state.schedule=RallyeCapLineupEngine.generateSchedule(lineupEngineOptions());optimizeDirty=false;lineupAutoDirty=false;analysis=null}
function maybeAutoOptimizeLineup(routeName){let count=active().length;if(routeName==='alignement'&&!isMatchStarted()&&lineupAutoDirty&&count>=MIN&&count<=MAX){optimizeLineup();return true}return false}
function generateAll(){if(isReadOnlyMatch())return;if(isMatchStarted()){modal('Match débuté','Optimiser est désactivé quand le match est débuté. Ajuste les manches restantes manuellement.');return}let a=active();if(a.length<MIN||a.length>MAX){modal('Alignement impossible','Il faut entre 6 et 12 joueurs actifs.');return}optimizeLineup();save();renderAll()}
function shuffleArray(arr){let out=arr.slice();for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1)),tmp=out[i];out[i]=out[j];out[j]=tmp}return out}
function shuffleBattingOrder(){if(isMatchStarted()||isReadOnlyMatch())return;let a=active();if(a.length<MIN||a.length>MAX){modal('Alignement impossible','Il faut entre 6 et 12 joueurs actifs.');return}confirmModal('Mélanger l’ordre','L’ordre de frappe sera mélangé de façon aléatoire, puis l’alignement sera optimisé automatiquement pour respecter les règles et maximiser l’équité. Continuer?',()=>{let activeIds=a.map(p=>p.id),activeSet=new Set(activeIds),shuffled=shuffleArray(activeIds),inactive=state.order.filter(id=>!activeSet.has(id)&&player(id));state.order=shuffled.concat(inactive);state.players.forEach(p=>{if(!state.order.includes(p.id))state.order.push(p.id)});optimizeLineup();save();renderAll()})}
function appendInning(){if(isReadOnlyMatch())return;if(state.innings>=MAX_INN){modal('Maximum atteint','Le maximum est de 9 manches.');return}state.innings++;state.schedule.push(generateInning(state.innings-1,state.schedule));markDirty();save();renderAll()}
function removeInning(){if(isReadOnlyMatch())return;if(state.innings<=MIN_INN){modal('Minimum atteint','Il faut conserver au moins 4 manches.');return}state.innings--;state.schedule.pop();markDirty();save();renderAll()}
function generateInning(i,prior){return RallyeCapLineupEngine.generateInning(Object.assign(lineupEngineOptions(),{inning:i,priorSchedule:prior}))}
function missingPositions(i){let vals=new Set(Object.values(state.schedule[i]?.pos||{}));return POSITIONS.filter(p=>!vals.has(p))}
function benchCandidates(i){let pos=state.schedule[i]?.pos||{};return active().filter(p=>!pos[p.id])}
function assignMissingPositionFromBench(id,i){if(isReadOnlyMatch()||isHalfLocked(i,defenseHalf()))return false;let miss=missingPositions(i);if(!miss.length)return false;let pos=state.schedule[i].pos;if(pos[id])return false;pos[id]=miss[0];markDirty();save();renderAll();return true}
function scheduleCompleteForActive(){let ids=new Set(active().map(p=>p.id)),needed=Math.min(6,ids.size);if(ids.size<MIN||ids.size>MAX||state.schedule.length<state.innings)return false;return state.schedule.slice(0,state.innings).every(inn=>{let assigned=Object.entries(inn.pos||{}).filter(([id,po])=>ids.has(id)&&POSITIONS.includes(po));return assigned.length===needed&&new Set(assigned.map(([,po])=>po)).size===assigned.length})}
function savedLineupNeedsAutoOptimize(){return !isMatchStarted()&&!scheduleCompleteForActive()}
function futureDefenseIssues(){if(!isMatchStarted())return[];let ids=new Set(active().map(p=>p.id));return state.schedule.map((inn,i)=>{if(isHalfLocked(i,defenseHalf()))return null;let assigned=Object.entries(inn.pos||{}).filter(([id,po])=>ids.has(id)&&POSITIONS.includes(po));let missing=missingPositions(i);if(assigned.length>=Math.min(6,ids.size)&&!missing.length)return null;return{inning:i,assigned:assigned.length,missing,bench:benchCandidates(i)}}).filter(Boolean)}
function fillFutureMissingPositions(){if(isReadOnlyMatch())return;let changed=false,blocked=[];futureDefenseIssues().forEach(issue=>{let pos=state.schedule[issue.inning].pos,bench=benchCandidates(issue.inning);issue.missing.forEach(po=>{let p=bench.shift();if(!p){blocked.push(issue.inning);return}pos[p.id]=po;changed=true})});if(!changed){modal('Aucune position remplie','Aucun joueur au banc n’est disponible pour remplir automatiquement les positions manquantes.');return}markDirty();save();renderAll();if(blocked.length)modal('Correction partielle','Certaines positions restent à corriger manuellement parce qu’il n’y avait pas assez de joueurs au banc.')}
function ensureSchedule(){let a=active(),ids=a.map(p=>p.id);state.schedule=state.schedule.slice(0,state.innings);while(state.schedule.length<state.innings)state.schedule.push({pos:{}});state.schedule.forEach((inn,i)=>{if(isHalfLocked(i,defenseHalf()))return;let cleaned=RallyeCapRules.cleanPositions(inn.pos,ids);inn.pos=cleaned;let count=Object.keys(cleaned).length;if(!isMatchStarted()&&a.length>=MIN&&(count!==6||new Set(Object.values(cleaned)).size!==count)){state.schedule[i]=generateInning(i,state.schedule.slice(0,i))}})}
function analyze(){ensureSchedule();problems=new Map();let vals=[],sugs=[],ids=active().map(p=>p.id);let st=collectStats(),summary=RallyeCapRules.scheduleRuleSummary(state.schedule,ids);let mark=(id,i,msg)=>{let k=id+':'+i;if(!problems.has(k))problems.set(k,[]);problems.get(k).push(msg)};let pname=id=>player(id)?.name||'Joueur';
  let defenseOk=true;state.schedule.forEach((inn,i)=>{let locked=isHalfLocked(i,defenseHalf()),assigned=Object.entries(inn.pos||{}).filter(([id])=>locked||ids.includes(id)),c=assigned.length;if(c!==Math.min(6,ids.length)){defenseOk=false;ids.forEach(id=>mark(id,i,'La manche n’a pas exactement 6 défenseurs'));if(!locked)makeMissingDefenseSuggestions(i).forEach(s=>sugs.push(s))}});vals.push({ok:defenseOk,text:defenseOk?'Chaque manche a exactement 6 défenseurs.':'Une manche n’a pas exactement 6 défenseurs.'});
  summary.bench.forEach(x=>{mark(x.id,x.i-1,'Banc deux manches de suite');mark(x.id,x.i,'Banc deux manches de suite')});vals.push({ok:!summary.bench.length,text:!summary.bench.length?'Aucun joueur au banc deux manches consécutives.':'Un joueur est au banc deux manches consécutives.'});summary.bench.slice(0,5).forEach(x=>sugs.push(makeBenchSuggestion(x.id,x.i)));
  summary.firstBase.forEach(x=>x.ins.forEach(i=>mark(x.id,i,'Premier but plus d’une fois')));vals.push({ok:!summary.firstBase.length,text:!summary.firstBase.length?'Chaque joueur est 1B au maximum une fois.':'Un joueur joue 1B plus d’une fois.'});if(state.innings>ids.length)vals.push({ok:false,warn:true,text:'Premier but unique mathématiquement impossible: '+state.innings+' manches pour '+ids.length+' joueurs.'});summary.firstBase.slice(0,5).forEach(x=>sugs.push(makeFirstBaseSuggestion(x.id,x.ins)));
  summary.pitch.forEach(x=>{mark(x.id,x.i-1,'Lanceur deux manches de suite');mark(x.id,x.i,'Lanceur deux manches de suite')});vals.push({ok:!summary.pitch.length,text:!summary.pitch.length?'Aucun joueur n’est lanceur deux manches consécutives.':'Un joueur est lanceur deux manches consécutives.'});summary.pitch.slice(0,5).forEach(x=>sugs.push(makePitchSuggestion(x.id,x.i)));
  let f=fairness(st);if(state.fixed)vals.push({ok:f.abGap<=1,text:f.abGap<=1?'Présences au bâton équilibrées (écart ≤ 1).':'Présences au bâton moins équilibrées (écart '+f.abGap+').'});vals.push({ok:f.totalGap<=1||ids.length===6,warn:f.totalGap>1&&ids.length!==6,text:(f.totalGap<=1||ids.length===6)?'Temps de jeu équilibré.':'Temps de jeu à surveiller (écart '+f.totalGap+').'});
  sugs=sugs.filter(Boolean);if(!sugs.length)sugs.push({level:'ok',title:'Aucun problème majeur détecté',text:'Les règles sont respectées. Tu peux imprimer ou exporter.',action:null});analysis={validations:vals,suggestions:sugs,stats:st,fair:f,rulesOk:vals.filter(v=>!v.warn).every(v=>v.ok)};return analysis}
function fairness(st){return RallyeCapRules.fairness(st,state.fixed)}
function makeFirstBaseSuggestion(id,ins){let inning=ins.find(i=>!isHalfLocked(i,defenseHalf())&&state.schedule[i]?.pos?.[id]==='1B');if(inning===undefined)return null;let target=active().map(p=>p.id).find(other=>other!==id&&state.schedule[inning].pos[other]&&state.schedule[inning].pos[other]!=='1B'&&!hasPlayed(other,'1B',inning));return{level:'bad',inning,title:player(id).name+' joue 1B plus d’une fois',text:target?'Échanger '+player(id).name+' (1B) avec '+player(target).name+' ('+state.schedule[inning].pos[target]+') à la manche '+(inning+1)+'.':'Aucune correction simple trouvée automatiquement.',action:target?{type:'swap',inning,id,target}:null}}
function makePitchSuggestion(id,inning){if(isHalfLocked(inning,defenseHalf()))return null;let target=active().map(p=>p.id).find(other=>other!==id&&state.schedule[inning].pos[other]&&!PITCH.has(state.schedule[inning].pos[other])&&!wasPitcher(other,inning-1)&&!willBePitcher(other,inning+1));return{level:'bad',inning,title:player(id).name+' est lanceur deux manches de suite',text:target?'Échanger '+player(id).name+' ('+state.schedule[inning].pos[id]+') avec '+player(target).name+' ('+state.schedule[inning].pos[target]+') à la manche '+(inning+1)+'.':'Aucune correction simple trouvée automatiquement.',action:target?{type:'swap',inning,id,target}:null}}
function makeBenchSuggestion(id,inning){if(isHalfLocked(inning,defenseHalf()))return null;let target=active().map(p=>p.id).find(other=>state.schedule[inning].pos[other]&&!wouldBenchBreak(other,inning));return{level:'bad',inning,title:player(id).name+' est au banc deux manches de suite',text:target?'Donner la position de '+player(target).name+' à '+player(id).name+' à la manche '+(inning+1)+', et mettre '+player(target).name+' au banc.':'Aucune correction simple trouvée automatiquement.',action:target?{type:'benchswap',inning,id,target}:null}}
function makeMissingDefenseSuggestions(inning){if(isHalfLocked(inning,defenseHalf()))return[];let miss=missingPositions(inning),bench=benchCandidates(inning);return miss.slice(0,2).map((po,idx)=>{let p=bench[idx]||bench[0];return{level:'bad',inning,title:'Position '+po+' non assignée à la manche '+(inning+1),text:p?'Assigner '+p.name+' à '+po+'. Tu peux aussi cliquer une cellule BANC dans cette manche.':'Aucun joueur au banc disponible pour remplir '+po+'.',action:p?{type:'fillpos',inning,id:p.id,pos:po}:null}})}
function hasPlayed(id,pos,except){return state.schedule.some((inn,i)=>i!==except&&inn.pos[id]===pos)}
function wasPitcher(id,i){return i>=0&&PITCH.has(state.schedule[i]?.pos[id])}
function willBePitcher(id,i){return i<state.schedule.length&&PITCH.has(state.schedule[i]?.pos[id])}
function wouldBenchBreak(id,i){return (i>0&&!state.schedule[i-1].pos[id])||(i<state.schedule.length-1&&!state.schedule[i+1].pos[id])}
function applySuggestion(action){if(!action||isReadOnlyMatch())return;if(isHalfLocked(action.inning,defenseHalf())){modal('Demi-manche jouée','Cette demi-manche est déjà jouée et ne peut plus être modifiée.');return}if(action.type==='swap'){let pos=state.schedule[action.inning].pos,p1=pos[action.id],p2=pos[action.target];pos[action.id]=p2;pos[action.target]=p1}else if(action.type==='benchswap'){let pos=state.schedule[action.inning].pos;pos[action.id]=pos[action.target];delete pos[action.target]}else if(action.type==='fillpos'){let pos=state.schedule[action.inning].pos;if(!pos[action.id]&&missingPositions(action.inning).includes(action.pos))pos[action.id]=action.pos}markDirty();save();renderAll()}
function renderAll(){reconcileActiveMatch();analysis=null;renderInputs();renderHome();renderTeam();renderPlayers();renderAlign();renderMatch();renderCoachMatch();renderPlayGateway();renderMini();renderHeaderStatus();renderMatchTables();renderOptimizeButton();route()}
function renderInputs(){
  syncActiveTeamAliases();
  let hasTeam=!!activeTeam(),teamTitle=$('#teamHomeTitle');
  if(teamTitle&&document.activeElement!==teamTitle)teamTitle.value=teamProfileName()||'';
  let teamPlayerCount=$('#teamPlayerCount');if(teamPlayerCount)teamPlayerCount.textContent=state.roster.length+' joueur'+(state.roster.length>1?'s':'');
  let teamCard=$('#teamHomeCard');if(teamCard)teamCard.classList.toggle('hide',!hasTeam);
  let teamSlug=$('#teamPublicSlug');if(teamSlug){if(document.activeElement!==teamSlug)teamSlug.value=state.teamProfile.publicSlug||'';teamSlug.disabled=!!cloud.teamPublicId;teamSlug.title=cloud.teamPublicId?'Retire le lien permanent avant de changer l’identifiant public.':''}
  let teamSlugUrl=$('#teamPublicSlugUrl');if(teamSlugUrl)teamSlugUrl.textContent=(state.teamProfile.publicSlug||cloud.teamPublicId)?'#fans/'+(state.teamProfile.publicSlug||cloud.teamPublicId):'#fans/expos-rallye-cap';
  let matchTeam=$('#matchTeamName');if(matchTeam)matchTeam.textContent=state.team||teamProfileName()||'Équipe à définir';
  let opp=$('#opp');if(opp)opp.value=state.opp;
  let date=$('#date');if(date)date.value=state.date;
  let time=ensureTimeOption(state.time),timeHour=$('#timeHour'),timeMinute=$('#timeMinute');if(timeHour)timeHour.value=time.hour;if(timeMinute)timeMinute.value=time.minute;
  let place=$('#place');if(place)place.value=state.place;
  let fanMessage=$('#fanMessage');if(fanMessage)fanMessage.value=state.fanMessage||'';
  renderFanMessagePreview();
  let innings=$('#innings');if(innings)innings.value=state.innings;
  let prepLocked=isMatchStarted()||activeMatch()?.status==='archived',archiveLocked=activeMatch()?.status==='archived';
  ['opp','date','timeHour','timeMinute','place','innings'].forEach(id=>{let el=$('#'+id);if(el)el.disabled=prepLocked});
  if(fanMessage)fanMessage.disabled=archiveLocked;
  let teamLocked=!!(activeMatch()&&isMatchStarted());
  if(teamTitle)teamTitle.disabled=teamLocked||!hasTeam;
  let fixed=$('#fixed');if(fixed){fixed.checked=state.fixed;fixed.disabled=prepLocked}
  let teamLink=$('.teamFieldLink');if(teamLink){teamLink.classList.toggle('lockedFormField',prepLocked);teamLink.setAttribute('aria-disabled',prepLocked?'true':'false')}
  let add=$('#addTeamNames');if(add)add.disabled=teamLocked||!hasTeam;
  let teamPublicLink=$('#teamPublicLinkBtn');if(teamPublicLink)teamPublicLink.disabled=!hasTeam;
  let addFromMatch=$('#addPlayerToTeamFromMatchBtn');if(addFromMatch){addFromMatch.disabled=!activeMatch()||isMatchStarted()||isReadOnlyMatch();addFromMatch.title=addFromMatch.disabled?'Disponible seulement avant le début du match.':'Ajouter au bassin permanent et au match courant.'}
  let deleteTeam=$('#deleteTeamBtn');if(deleteTeam){deleteTeam.disabled=!hasTeam;deleteTeam.title=hasTeam?'Supprimer l’équipe':'Aucune équipe à supprimer'}
  let listNew=$('#newMatchFromListBtn');if(listNew){listNew.classList.toggle('hide',!!workflowMatch()||!hasTeamSetup());listNew.disabled=!hasTeamSetup()}
  let swap=$('#swapSidesBtn');if(swap)swap.disabled=prepLocked;
  let teamSide=$('#teamSideLabel'),oppSide=$('#oppSideLabel');if(teamSide)teamSide.textContent=state.side==='locale'?'Local':'Visiteur';if(oppSide)oppSide.textContent=state.side==='locale'?'Visiteur':'Local'
}
function teamProfileName(){return String(activeTeam()?.name||state.team||'').trim()}
function hasTeamName(){return !!teamProfileName()}
function hasTeamSetup(){return hasTeamName()&&state.roster.length>0}
function hasMatchInfo(){return hasActiveMatch()}
function workflowMatch(){let m=activeMatch();return m&&m.status!=='archived'?m:null}
function homeMatchTitle(){let m=activeMatch();if(!m)return'Préparer un match';if(m.status==='completed')return'Match terminé';if(m.status==='active'){let ph=currentPlayPhase();return ph?'En cours - '+matchPhases()[currentPlayIndex()].label:'Match terminé'}if(m.status==='ready')return'Prêt à jouer';return'Match en préparation'}
function renderHome(){
  let box=$('#homeCard');
  if(!box)return;
  if(!activeTeam()){
    box.innerHTML='<div><h2>Créer une équipe</h2><p class="hint">Commence par ton équipe. Tu pourras ensuite ajouter les joueurs, préparer un match et générer l’alignement.</p></div><div class="homeActions"><button class="btn brandBtn" id="homeNewTeam" type="button">Créer une équipe</button><button class="btn secondary" id="homeExampleTeam" type="button">Créer une équipe exemple</button></div>';
    let btn=$('#homeNewTeam');if(btn)btn.onclick=promptNewTeam;
    let example=$('#homeExampleTeam');if(example)example.onclick=()=>modal('Créer une équipe exemple','Créer une équipe exemple inspirée des Expos de 1994?',[{label:'Annuler',kind:'secondary'},{label:'Confirmer',kind:'brandBtn',onClick:loadExampleTeam}]);
    return
  }
  if(!hasTeamName()){
    box.innerHTML='<div><h2>Nommer l’équipe</h2><p class="hint">Donne un nom à l’équipe active avant de préparer un match.</p></div><div class="homeActions"><button class="btn brandBtn" id="homeFocusTeamName" type="button">Nommer l’équipe</button></div>';
    let btn=$('#homeFocusTeamName');if(btn)btn.onclick=()=>$('#teamHomeTitle')?.focus();
    return
  }
  if(!state.roster.length){
    box.innerHTML='<div><h2>Compléter l’équipe</h2><p class="hint">'+esc(teamProfileName())+' • ajoute les joueurs dans la section de l’équipe.</p></div>';
    return
  }
  let m=workflowMatch(),teamName=teamProfileName();
  if(!m){
    box.innerHTML='<div><h2>Préparer un match</h2><p class="hint">'+esc(teamName)+' • '+state.roster.length+' joueur'+(state.roster.length>1?'s':'')+' enregistré'+(state.roster.length>1?'s':'')+'</p></div><div class="homeActions"><button class="btn brandBtn" id="homeNewMatch" type="button">Préparer un match</button></div>';
    let btn=$('#homeNewMatch');if(btn)btn.onclick=newMatchFromTeam;
    return
  }
  let present=state.players.filter(p=>p.on!==false).length,absent=state.players.length-present,playHint=m.status==='completed'?'Match terminé':isMatchStarted()?(currentPlayPhase()?matchPhases()[currentPlayIndex()].label:'Match terminé'):m.status==='ready'?'Prêt à commencer':'En attente de l’alignement';
  box.innerHTML='<div class="spaced"><div><h2>'+homeMatchTitle()+'</h2><p class="hint">'+esc(teamName)+' • '+present+' joueur'+(present>1?'s':'')+' présent'+(present>1?'s':'')+'</p></div><div class="row noPrint teamTopActions"><button class="icon soft" id="homeMatchShareBtn" type="button" title="Partager le match" aria-label="Partager le match">🔗</button><button class="icon soft dangerIcon" id="homeMatchDeleteBtn" type="button" title="Supprimer le match" aria-label="Supprimer le match">🗑</button></div></div><div class="homeSummary workflowSummary"><a href="#match"><span class="label">Informations</span><b>'+esc(state.opp||'Adversaire à définir')+'</b><small>'+esc([state.date?formatDate(state.date):'',state.time||'',state.place||''].filter(Boolean).join(' • ')||'Date, heure et endroit à définir')+'</small></a><a href="#joueurs"><span class="label">Joueurs</span><b>'+present+' présent'+(present>1?'s':'')+'</b><small>'+absent+' absent'+(absent>1?'s':'')+'</small></a><a href="#alignement"><span class="label">Alignement</span><b>Vérifier et ajuster</b><small>Préparer l’alignement</small></a><a href="#jouer"><span class="label">Jouer</span><b>Gérer la partie</b><small>'+esc(playHint)+'</small></a></div>';
  let share=$('#homeMatchShareBtn');if(share)share.onclick=openMatchShareModal;
  let del=$('#homeMatchDeleteBtn');if(del)del.onclick=deleteCurrentMatchPrompt;
}
function rosterPlayer(id){return state.roster.find(p=>p.id===id)}
function addRosterPlayers(entries){let t=ensureActiveTeam();let existing=new Set(state.roster.map(p=>p.name.toLowerCase()));entries.forEach(entry=>{let name=typeof entry==='string'?entry:entry.name,number=typeof entry==='string'?'':cleanNumber(entry.number),key=name.toLowerCase();if(existing.has(key))return;existing.add(key);state.roster.push({id:uid(),name,number,on:true})});t.updatedAtMs=Date.now();state.team=t.name;save();syncPublicTeamIfActive();renderAll()}
function promptAddRosterPlayers(){if(isMatchInProgress())return;modal('Ajouter des joueurs','Entre un ou plusieurs noms, avec numéro optionnel.',[{kind:'inputAddPlayers',withNumbers:true,onClick:entries=>addRosterPlayers(entries)},{label:'Annuler',kind:'modalCancel'}])}
function addRosterPlayersToDraftMatch(entries){if(!activeMatch()||isMatchStarted()||isReadOnlyMatch())return;let t=activeTeam(),rosterByName=new Map(state.roster.map(p=>[p.name.toLowerCase(),p])),matchByName=new Set(state.players.map(p=>p.name.toLowerCase())),present=active().length,added=0;entries.forEach(entry=>{let name=typeof entry==='string'?entry:entry.name,number=typeof entry==='string'?'':cleanNumber(entry.number),key=name.toLowerCase(),rp=rosterByName.get(key);if(!rp){rp={id:uid(),name,number,on:true};state.roster.push(rp);rosterByName.set(key,rp)}else if(number&&!rp.number)rp.number=number;if(matchByName.has(key))return;let on=present<MAX;if(on)present++;state.players.push({id:rp.id,name:rp.name,number:rp.number||number||'',on});if(!state.order.includes(rp.id))state.order.push(rp.id);matchByName.add(key);added++});if(t)t.updatedAtMs=Date.now();state.team=state.teamProfile.name;if(added)markPlayerDirty();save();syncPublicTeamIfActive();renderAll()}
function promptAddPlayerToTeamFromMatch(){if(!activeMatch()||isMatchStarted()||isReadOnlyMatch())return;modal('Ajouter un joueur à l’équipe','Entre un ou plusieurs noms, avec numéro optionnel. Ils seront ajoutés à l’équipe et au match courant.',[{kind:'inputAddPlayers',withNumbers:true,onClick:entries=>addRosterPlayersToDraftMatch(entries)},{label:'Annuler',kind:'modalCancel'}])}
function renderTeam(){let w=$('#teamPlayers');if(!w)return;let roster=state.roster,t=activeTeam();state.team=t?.name||state.team;let locked=isMatchInProgress();if(!t){w.innerHTML='<div class="empty">Crée une équipe pour commencer.</div>';return}if(!roster.length){w.innerHTML='<div class="empty">Aucun joueur dans le bassin. Ajoute des noms ci-dessous ou crée une équipe exemple.</div>';return}w.innerHTML=(locked?'<div class="alert warn teamLockedNote"><span class="mark">!</span><div>Le match est en cours. Termine ou archive le match avant de modifier l’équipe permanente.</div></div>':'')+roster.map(p=>'<div class="pill teamPlayerPill"><input class="pnumInput" data-team-number="'+p.id+'" value="'+escAttr(p.number||'')+'" inputmode="numeric" maxlength="2" placeholder="#" aria-label="Numéro du joueur" '+(locked?'disabled':'')+'><input class="pnameInput" data-team-rename="'+p.id+'" value="'+escAttr(p.name)+'" aria-label="Nom du joueur" '+(locked?'disabled':'')+'><button class="icon soft" data-team-delete="'+p.id+'" title="Supprimer" '+(locked?'disabled':'')+'>×</button></div>').join('');$$('[data-team-number]').forEach(i=>i.onchange=()=>{if(locked)return;let pl=rosterPlayer(i.dataset.teamNumber);if(pl){pl.number=cleanNumber(i.value);t.updatedAtMs=Date.now();save();syncPublicTeamIfActive();renderAll()}});$$('[data-team-rename]').forEach(i=>i.onchange=()=>{if(locked)return;let pl=rosterPlayer(i.dataset.teamRename),name=String(i.value||'').trim();if(!pl||!name)return renderTeam();let dup=state.roster.find(p=>p.id!==pl.id&&p.name.toLowerCase()===name.toLowerCase());if(dup){modal('Joueur déjà présent',name+' existe déjà dans la liste.');renderTeam();return}pl.name=name;t.updatedAtMs=Date.now();save();syncPublicTeamIfActive();renderAll()});$$('[data-team-delete]').forEach(b=>b.onclick=()=>{if(locked)return;let pl=rosterPlayer(b.dataset.teamDelete);if(pl)confirmModal('Supprimer un joueur','Supprimer '+pl.name+' du bassin de joueurs? Les matchs existants ne seront pas modifiés.',()=>{t.roster=t.roster.filter(x=>x.id!==pl.id);syncActiveTeamAliases();t.updatedAtMs=Date.now();save();syncPublicTeamIfActive();renderAll()})})}
function currentMatchStatus(){if(!isMatchStarted())return'Match non débuté';let ph=matchPhases().find(p=>!isHalfLocked(p.inning,p.half));return ph?'Match débuté à '+ph.label:'Match terminé'}
function headerStatusText(){if(!activeTeam())return'Aucune équipe active';if(!hasTeamName())return'Équipe sans nom';let m=activeMatch(),team='Équipe: '+teamProfileName();if(!m)return team+' • Aucun match prévu';let status=m.status==='completed'?'Match terminé':m.status==='active'?(currentPlayPhase()?'En cours - '+matchPhases()[currentPlayIndex()].label:'Match terminé'):m.status==='ready'?'Prêt à jouer':'En préparation';return team+' • '+status}
function renderHeaderStatus(){let el=$('#topMatchStatus');if(el)el.textContent=headerStatusText()}
function switchTeam(id){if(!state.teams.some(t=>t.id===id)||id===state.activeTeamId)return;captureActiveMatch();state.activeTeamId=id;state.activeMatchId=null;syncActiveTeamAliases();cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';cloud.teamPublicId=state.teamProfile.publicId||null;cloud.teamPublicPassword=state.teamProfile.publicPassword||'';exposeMatch(null);if(activeTeam()?.cloud?.enabled&&cloud.user)listenPrivateTeam(id);else stopPrivateTeamListener();save();location.hash='#accueil';renderAll()}
function createTeam(name){captureActiveMatch();let t=blankTeam();t.name=String(name||'').trim().slice(0,80);state.teams.push(t);state.activeTeamId=t.id;state.activeMatchId=null;syncActiveTeamAliases();cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';cloud.teamPublicId=null;cloud.teamPublicPassword='';exposeMatch(null);save();location.hash='#accueil';renderAll()}
function promptNewTeam(){modal('Nouvelle équipe','Entre le nom de la nouvelle équipe.',[{kind:'inputTeamName',onClick:createTeam},{label:'Annuler',kind:'modalCancel'}])}
function renameActiveTeam(name){let t=activeTeam(),next=String(name||'').trim().slice(0,80);if(!t)return;if(!next){modal('Nom requis','Le nom de l’équipe ne peut pas être vide.');renderInputs();return}t.name=next;state.team=next;t.updatedAtMs=Date.now();save();syncPublicTeamIfActive();renderAll()}
function promptChangeTeam(){let buttons=state.teams.map(t=>({label:(t.id===state.activeTeamId?'✓ ':'')+(t.name||'Équipe sans nom'),kind:'playerChoice',onClick:()=>switchTeam(t.id)}));buttons.push({label:'Créer une équipe',kind:'secondary',onClick:promptNewTeam},{label:'Annuler',kind:'modalCancel'});modal('Changer d’équipe',state.teams.length?'Choisis l’équipe active ou crée une nouvelle équipe.':'Aucune équipe existe encore. Crée une équipe pour commencer.',buttons)}
async function deleteActiveTeamCloud(rows,team){
  try{
    for(let row of rows)if(row.local?.cloud?.matchId||row.local?.cloud?.publicId||row.cloud)await removeMatchCloud(row);
    if(team?.cloud?.enabled&&cloud.user){let mod=await cloudModule();await mod.deleteTeam(team.id)}
    if(team?.publicId||cloud.teamPublicId)await unpublishPublicTeam();
  }catch(e){
    modal('Nettoyage en ligne incomplet',e.message||String(e));
  }
}
function deleteActiveTeam(){let t=activeTeam();if(!t)return;let teamId=t.id,rows=combinedMatchRows('all').filter(r=>r.match?.teamId===teamId);confirmModal('Supprimer l’équipe','L’équipe, les joueurs, matchs locaux, archives, données en ligne seront supprimés. Continuer?',async()=>{await deleteActiveTeamCloud(rows,t);state.matches=state.matches.filter(m=>m.teamId!==teamId);if(Array.isArray(state.archives))state.archives=state.archives.filter(a=>(a.match||a).teamId!==teamId);state.teams=state.teams.filter(x=>x.id!==teamId);if(state.activeMatchId&&!state.matches.some(m=>m.id===state.activeMatchId)){state.activeMatchId=null;exposeMatch(null)}state.activeTeamId=state.teams[0]?.id||null;syncActiveTeamAliases();cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';cloud.teamPublicId=state.teamProfile.publicId||null;cloud.teamPublicPassword=state.teamProfile.publicPassword||'';save();location.hash='#accueil';renderAll()})}
function setMetricButton(id,count,href){let btn=$('#'+id);if(!btn)return;btn.disabled=!count;if(count&&href)btn.dataset.href=href;else delete btn.dataset.href}
function renderMini(){let a=active().length,teamMatches=combinedMatchRows('all');let team=$('#teamMetric'),teamName=$('#miniTeamName');if(teamName)teamName.textContent=activeTeam()?(teamProfileName()||'Équipe sans nom'):'Aucune équipe';if(team)team.disabled=false;let players=$('#miniPlayers');if(players)players.textContent=state.roster.length;let matches=$('#miniMatches');if(matches)matches.textContent=teamMatches.length;setMetricButton('matchesMetric',teamMatches.length,'#matchs');let activeTag=$('#activeCountTag');if(activeTag){let ok=a>=MIN&&a<=MAX;activeTag.textContent=a+' présent'+(a>1?'s':'')+' · '+(ok?'OK':'6 à 12 requis');activeTag.classList.toggle('okTag',ok);activeTag.classList.toggle('warnTag',!ok)}}
function archiveMeta(a){let m=a.match||a;return [m.date?formatDate(m.date):'',m.time||'',m.place||'',(a.innings? a.innings+' manche'+(a.innings>1?'s':''):'')].filter(Boolean).join(' • ')}
function archiveById(id){return(state.archives||[]).find(a=>a.id===id)}
function renderArchives(){let list=$('#archivesList'),detailCard=$('#archiveDetailCard'),detail=$('#archiveDetail');if(!list||!detailCard||!detail)return;let archives=state.archives||[];if(!archives.length){list.innerHTML='<div class="empty">Aucun match archivé pour le moment.</div>';detailCard.classList.add('hide');detail.innerHTML='';return}if(selectedArchiveId&&!archiveById(selectedArchiveId))selectedArchiveId=null;list.innerHTML=archives.map(a=>'<div class="archiveRow"><button class="archiveMain" data-archive-open="'+a.id+'" type="button"><b>'+esc(archiveTitle(a))+'</b><span>'+esc(archiveMeta(a))+'</span>'+(a.schemaVersion===0?'<em>Archive sommaire</em>':'<em>Lecture seule</em>')+'</button><button class="btn secondary" data-archive-open="'+a.id+'" type="button">Consulter</button><button class="btn danger" data-archive-delete="'+a.id+'" type="button">Supprimer</button></div>').join('');$$('[data-archive-open]').forEach(b=>b.onclick=()=>{selectedArchiveId=b.dataset.archiveOpen;renderArchives()});$$('[data-archive-delete]').forEach(b=>b.onclick=()=>{let a=archiveById(b.dataset.archiveDelete);if(!a)return;confirmModal('Supprimer l’archive','Supprimer '+archiveTitle(a)+'? Cette action ne modifie pas l’équipe actuelle.',()=>{state.archives=state.archives.filter(x=>x.id!==a.id);if(selectedArchiveId===a.id)selectedArchiveId=null;save();renderAll()})});let selected=archiveById(selectedArchiveId)||archives[0];selectedArchiveId=selected.id;detailCard.classList.remove('hide');if(selected.schemaVersion===0){detail.innerHTML='<div class="spaced"><div><h3>'+esc(archiveTitle(selected))+'</h3><p class="hint">'+esc(archiveMeta(selected))+'</p></div><span class="tag">Archive sommaire</span></div><p class="hint">Cette ancienne archive contient seulement un résumé. Les exports complets ne peuvent pas être régénérés.</p><div class="players">'+(selected.players||[]).map(p=>'<div class="pill"><b>'+esc(p.name)+'</b></div>').join('')+'</div>';return}let table=withArchiveState(selected,()=>lineupHtmlTable(false))||'';detail.innerHTML='<div class="spaced"><div><h3>'+esc(archiveTitle(selected))+'</h3><p class="hint">'+esc(archiveMeta(selected))+'</p></div></div><div class="row noPrint archiveActions"><button class="btn secondary" data-archive-banc="'+selected.id+'">Imprimer le banc</button><button class="btn secondary" data-archive-programme="'+selected.id+'">Générer le programme</button><button class="btn secondary" data-archive-texte="'+selected.id+'">Copier texte</button></div><div class="tableWrap archiveTable">'+table+'</div>';let banc=$('[data-archive-banc]'),programme=$('[data-archive-programme]'),texte=$('[data-archive-texte]');if(banc)banc.onclick=()=>withArchiveState(selected,printCoach);if(programme)programme.onclick=()=>withArchiveState(selected,exportParentImage);if(texte)texte.onclick=()=>{let t=withArchiveState(selected,miniPrinterText);navigator.clipboard?.writeText(t).then(()=>modal('Texte copié','Le texte de l’archive est copié.')).catch(()=>fallbackCopy(t))}}
function renderOptimizeButton(){let btn=$('#regenBtn'),shuffle=$('#shuffleOrderBtn'),ready=$('#readyToPlayBtn'),count=active().length,invalid=count<MIN||count>MAX,started=isMatchStarted(),readonly=isReadOnlyMatch(),complete=scheduleCompleteForActive();if(btn){btn.disabled=started||readonly||invalid||(!optimizeDirty&&complete);btn.classList.toggle('hide',state.route!=='alignement'||started||readonly)}if(shuffle){shuffle.disabled=started||readonly||invalid;shuffle.classList.toggle('hide',state.route!=='alignement'||started||readonly)}if(ready){ready.disabled=started||readonly||invalid;ready.classList.toggle('hide',state.route!=='alignement'||started||readonly)}}
function renderLineupControls(){let prepare=$('#prepareActions'),play=$('#playActions'),inPlay=state.route==='jouer';if(prepare)prepare.classList.toggle('hide',inPlay||isMatchStarted()||isReadOnlyMatch());if(play)play.classList.toggle('hide',!inPlay||!isMatchStarted()||isReadOnlyMatch())}
function renderPlayWarnings(){let box=$('#playWarnings');if(!box)return;if(isLineupReadOnly()){box.classList.add('hide');box.innerHTML='';return}let issues=futureDefenseIssues();box.classList.toggle('hide',!issues.length);if(!issues.length){box.innerHTML='';return}let details=issues.map(x=>'manche '+(x.inning+1)+' ('+(x.missing.length?x.missing.join(', '):'défense incomplète')+')').join(', '),canFill=issues.some(x=>x.missing.length&&x.bench.length);box.innerHTML='<div class="suggestion warn"><div><b>⚠ Positions défensives à compléter</b><div class="hint">À corriger: '+esc(details)+'. Clique une cellule BANC en jaune dans le tableau ou remplis automatiquement les positions possibles.</div></div>'+(canFill?'<button class="btn secondary" id="playFillMissing">Remplir les positions possibles</button>':'')+'</div>';let btn=$('#playFillMissing');if(btn)btn.onclick=fillFutureMissingPositions}
function scrollLineupToCurrentHalf(){let root=$('#lineup');if(!root||state.route!=='jouer'||!isMatchStarted())return;requestAnimationFrame(()=>{let th=root.querySelector('th.currentHalf'),fixed=root.querySelector('th[data-clear-selection]');if(!th||!fixed)return;let targetLeft=fixed.getBoundingClientRect().right+8,currentLeft=th.getBoundingClientRect().left;root.scrollLeft=Math.max(0,root.scrollLeft+currentLeft-targetLeft)})}
function resetLineupScrollOnEntry(routeName){if(!['alignement','jouer'].includes(routeName))return;let root=$('#lineup');if(!root)return;requestAnimationFrame(()=>{if(routeName==='jouer'&&isMatchStarted()){scrollLineupToCurrentHalf();return}root.scrollLeft=0})}
function renderProgressControls(){let advance=$('#advanceHalfBtn'),change=$('#lineupChangeBtn');if(!advance||!change)return;if(isReadOnlyMatch()){advance.textContent='Archive';advance.disabled=true;change.disabled=true;return}let ph=currentPlayPhase(),label=ph?matchPhases()[currentPlayIndex()]?.label:'Match terminé';if(!isMatchStarted()){advance.textContent='Commencer';advance.disabled=false;change.disabled=true;return}if(ph){advance.textContent='Terminer '+label.toLowerCase();advance.disabled=false;change.disabled=false;return}advance.textContent='Terminer le match';advance.disabled=false;change.disabled=true}
function renderPlayers(){let w=$('#players'),locked=isMatchStarted()||isReadOnlyMatch();if(!activeMatch()){w.innerHTML='<div class="empty">Aucun match actif. Prépare un match depuis l’accueil pour choisir les présences.</div>';return}if(!state.players.length){w.innerHTML='<div class="empty">Aucun joueur dans ce match. Retourne à l’accueil, puis crée un nouveau match.</div>';return}let ordered=state.players.filter(p=>p.on).concat(state.players.filter(p=>!p.on)),cards=ordered.map(p=>'<button class="pill playerToggle '+(p.on?'activeCard':'off')+'" data-toggle="'+p.id+'" type="button" aria-pressed="'+(p.on?'true':'false')+'" '+(locked?'disabled':'')+'><span class="playerNameLine">'+playerBadgeHtml(p)+'<span class="pname">'+esc(p.name)+'</span></span></button>').join('');w.innerHTML='<div class="playerBucket singlePlayerBucket"><div class="players singlePlayerList">'+cards+'</div></div>';$$('[data-toggle]').forEach(b=>b.onclick=()=>{if(locked)return;let id=b.dataset.toggle,pl=player(id),top=b.getBoundingClientRect().top,scrollY=window.scrollY;if(!pl)return;togglePlayerAvailability(pl);requestAnimationFrame(()=>{let moved=$('[data-toggle="'+id+'"]');if(!moved)return;let delta=moved.getBoundingClientRect().top-top;window.scrollTo({top:scrollY+delta,left:0,behavior:'auto'});moved.focus({preventScroll:true})})})}
function renamePlayer(pl,name){name=String(name||'').trim();if(!name){modal('Nom requis','Le nom du joueur ne peut pas être vide.');renderPlayers();return}let dup=state.players.find(p=>p.id!==pl.id&&p.name.toLowerCase()===name.toLowerCase());if(dup){modal('Joueur déjà présent',name+' existe déjà dans la liste.');renderPlayers();return}pl.name=name;markDirty();save();renderAll()}
function addPlayerRecord(name,on){let pl={id:uid(),name,on:on!==false};state.players.push(pl);state.order.push(pl.id);return pl}
function parseNames(raw){return String(raw||'').replace(/\\n/g,'\n').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean)}
function parsePlayerEntries(raw){return parseNames(raw).map(item=>{let text=item,number='',m=text.match(/^#?(\d{1,2})\s+(.+)$/)||text.match(/^(.+?)\s+#?(\d{1,2})$/);if(m){if(/^\d/.test(m[1])){number=cleanNumber(m[1]);text=m[2]}else{number=cleanNumber(m[2]);text=m[1]}}return{name:text.trim(),number}}).filter(p=>p.name)}
function addPlayers(names){let existing=new Set(state.players.map(p=>p.name.toLowerCase()));let list=names.filter(n=>!existing.has(n.toLowerCase())&&existing.add(n.toLowerCase()));if(!isMatchStarted()){let count=active().length;list.forEach(n=>{let on=count<MAX;if(on)count++;addPlayerRecord(n,on)});if(list.length)markPlayerDirty();save();renderAll();return}let skipped=[],added=0;list.forEach(n=>{if(active().length>=MAX){skipped.push(n);return}addPlayerRecord(n,true);added++});if(added)markDirty();save();renderAll();if(skipped.length)modal('Maximum atteint','Il y a déjà 12 joueurs actifs. Les joueurs suivants n’ont pas été ajoutés: '+skipped.join(', ')+'. Utilise Remplacer si nécessaire.')}
function replaceWithNewPlayerName(pl,name){name=String(name||'').trim();if(!name)return;if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){modal('Joueur déjà présent',name+' existe déjà dans la liste.');return}confirmModal('Remplacer '+pl.name,'Remplacer '+pl.name+' par '+name+'? '+(isMatchStarted()?'Les demi-manches barrées garderont l’historique de '+pl.name+'.':'Le nouveau joueur gardera sa place dans l’ordre et ses assignations.'),()=>{let np=addPlayerRecord(name,true);replacePlayerForUnlocked(pl.id,np.id);pl.on=false;markDirty();save();renderAll()})}
function promptReplacePlayer(pl){let inactive=state.players.filter(p=>!p.on&&p.id!==pl.id),buttons=inactive.map(r=>({label:playerChoiceLabel(r),kind:'playerChoice',onClick:()=>replaceWithExistingPlayer(pl,r)}));buttons.push({kind:'inputReplace',onClick:name=>replaceWithNewPlayerName(pl,name)},{label:'Annuler',kind:'modalCancel'});modal('Remplacer '+pl.name,inactive.length?'Choisis un joueur inactif ou entre un nouveau nom.':'Entre un nouveau nom pour le joueur remplaçant.',buttons)}
function playerChoiceLabel(pl){return pl.name+(pl.on?'':' · inactif')}
function chooseActivePlayer(title,text,onPick){let players=active();if(!players.length){modal('Aucun joueur actif','Il n’y a aucun joueur actif à sélectionner.');return}let buttons=players.map(pl=>({label:playerChoiceLabel(pl),kind:'playerChoice',onClick:()=>onPick(pl)}));buttons.push({label:'Annuler',kind:'modalCancel'});modal(title,text,buttons)}
function lockBeforeHalfIndex(targetIdx){let seq=halfSequence();seq.slice(0,targetIdx).forEach(p=>{if(!isHalfLocked(p.inning,p.half))setHalfLock(p.inning,p.half,true)});state.started=true;matchIndex=Math.min(targetIdx,Math.max(0,seq.length-1))}
function chooseEffectiveHalf(title,onReady){let seq=halfSequence(),current=currentPlayIndex();if(!isMatchStarted()){modal('Match non commencé','Commence le match avant d’appliquer un changement de joueurs en cours de match.');return}if(current>=seq.length){modal('Match terminé','Toutes les demi-manches sont déjà jouées.');return}let phases=matchPhases();let buttons=seq.slice(current).map((ph,offset)=>{let idx=current+offset,label=phases[idx]?.label||halfName(ph);return{label:label+(idx===current?' (courante)':''),kind:idx===current?'playerChoice currentChoice':'playerChoice',onClick:()=>{let apply=()=>{lockBeforeHalfIndex(idx);save();renderAll();onReady()};if(idx>current){confirmModal('Avancer la progression','Les demi-manches avant '+label.toLowerCase()+' seront considérées jouées. Continuer?',apply);return}apply()}}});buttons.push({label:'Annuler',kind:'modalCancel'});modal(title,'Choisis la demi-manche à partir de laquelle appliquer le changement.',buttons)}
function promptLineupPlayerChange(){if(isReadOnlyMatch())return;if(!isMatchStarted()){modal('Match non commencé','Commence le match avant d’utiliser les changements de joueurs en cours de match.');return}if(currentPlayIndex()>=halfSequence().length){modal('Match terminé','Aucun changement futur n’est possible parce que le match est terminé.');return}modal('Changement de joueurs','Quel type de changement veux-tu faire?',[
  {label:'Retirer un joueur',kind:'playerChoice',onClick:()=>chooseEffectiveHalf('Retirer à partir de...',promptRemoveDuringMatch)},
  {label:'Remplacer un joueur',kind:'playerChoice',onClick:()=>chooseEffectiveHalf('Remplacer à partir de...',promptReplaceDuringMatch)},
  {label:'Ajouter un joueur',kind:'playerChoice',onClick:()=>chooseEffectiveHalf('Ajouter à partir de...',promptAddDuringMatch)},
  {label:'Annuler',kind:'modalCancel'}
])}
function promptAddDuringMatch(){if(!canChangePlayersDuringMatch()){modal('Changement non disponible','Aucun changement futur n’est possible pour ce match.');return}if(active().length>=MAX){modal('Maximum atteint','Il y a déjà 12 joueurs actifs. Utilise Remplacer si tu dois faire entrer un autre joueur.');return}modal('Ajouter des joueurs','Entre un ou plusieurs noms. Ils seront ajoutés au bas de l’ordre et leurs assignations défensives resteront manuelles.',[{kind:'inputAddPlayers',onClick:names=>addPlayers(names)},{label:'Annuler',kind:'modalCancel'}])}
function promptRemoveDuringMatch(){if(!canChangePlayersDuringMatch()){modal('Changement non disponible','Complète d’abord une demi-manche. Les changements de joueurs s’appliquent seulement aux demi-manches futures.');return}chooseActivePlayer('Retirer un joueur','Choisis le joueur à retirer des demi-manches futures.',pl=>togglePlayerAvailability(pl))}
function promptReplaceDuringMatch(){if(!canChangePlayersDuringMatch()){modal('Changement non disponible','Complète d’abord une demi-manche. Les changements de joueurs s’appliquent seulement aux demi-manches futures.');return}chooseActivePlayer('Remplacer un joueur','Choisis le joueur remplacé pour les demi-manches futures.',pl=>chooseReplacementSource(pl))}
function chooseReplacementSource(pl){promptReplacePlayer(pl)}
function replaceWithExistingPlayer(oldPl,newPl){confirmModal('Remplacer '+oldPl.name,isMatchStarted()?'Remplacer '+oldPl.name+' par '+newPl.name+' pour les demi-manches futures?':'Remplacer '+oldPl.name+' par '+newPl.name+' et lui donner sa place dans l’alignement?',()=>{newPl.on=true;replacePlayerForUnlocked(oldPl.id,newPl.id);oldPl.on=false;markDirty();save();renderAll()})}
function replacePlayerForUnlocked(oldId,newId){let out=[],inserted=false;state.order.forEach(id=>{if(id===newId)return;out.push(id);if(id===oldId){out.push(newId);inserted=true}});if(!inserted)out.push(newId);if(!isMatchStarted())out=out.filter(id=>id!==oldId);state.order=out;state.schedule.forEach((inn,i)=>{if(isHalfLocked(i,defenseHalf()))return;if(inn.pos&&inn.pos[oldId]){inn.pos[newId]=inn.pos[oldId];delete inn.pos[oldId]}})}
function clearPlayerFromUnlocked(id){state.schedule.forEach((inn,i)=>{if(!isHalfLocked(i,defenseHalf())&&inn.pos)delete inn.pos[id]})}
function togglePlayerAvailability(pl){
  if(!isMatchStarted()){
    if(!pl.on&&active().length>=MAX){modal('Maximum atteint','Il peut y avoir au maximum 12 joueurs présents. Désactive un joueur avant d’activer '+pl.name+'.');return}
    pl.on=!pl.on;markPlayerDirty();save();renderAll();return
  }
  if(!pl.on){
    if(active().length>=MAX){modal('Maximum atteint','Il peut y avoir au maximum 12 joueurs actifs. Utilise Remplacer si tu dois faire entrer '+pl.name+'.');return}
    confirmModal('Activer '+pl.name,'Ce joueur deviendra disponible pour les manches non barrées. Les assignations restent manuelles.',()=>{pl.on=true;markDirty();save();renderAll()});return
  }
  let act=active();if(act.length<=MIN){let inactive=state.players.filter(p=>!p.on);if(!inactive.length){modal('Remplacement requis','Il reste seulement 6 joueurs actifs. Ajoute ou active un remplaçant avant de retirer '+pl.name+'.');return}let buttons=inactive.map(r=>({label:r.name,kind:'secondary',onClick:()=>{r.on=true;replacePlayerForUnlocked(pl.id,r.id);pl.on=false;markDirty();save();renderAll()}}));buttons.unshift({label:'Annuler',kind:'secondary'});modal('Remplacer '+pl.name,'Il reste seulement 6 joueurs actifs. Choisis un joueur inactif pour le remplacer dans les manches non barrées.',buttons);return}confirmModal('Retirer '+pl.name,'Les manches barrées ne seront pas modifiées. Les assignations futures de ce joueur seront retirées et devront être corrigées manuellement.',()=>{clearPlayerFromUnlocked(pl.id);pl.on=false;markDirty();save();renderAll()})}
function renderAlign(){if(!activeMatch()){if($('#validations'))$('#validations').innerHTML='<div class="alert warn"><span class="mark">!</span><div>Crée ou ouvre un match avant de préparer un alignement.</div></div>';if($('#lineup'))$('#lineup').innerHTML='<div class="empty">Aucun match actif.</div>';if($('#scores'))$('#scores').innerHTML='';if($('#suggestions'))$('#suggestions').innerHTML='';let card=$('#suggestionsCard');if(card)card.classList.add('hide');if($('#stats'))$('#stats').innerHTML='';if($('#legend'))$('#legend').innerHTML='';return}let inPlay=state.route==='jouer',title=$('#lineupWorkspaceTitle'),hint=$('#lineupWorkspaceHint');if(title)title.textContent=inPlay?'Vue complète':'3. Alignement';if(hint)hint.textContent=inPlay?'Suis la progression et fais un changement si nécessaire.':'Prépare un alignement équitable et vérifie les règles avant de jouer.';renderProgressControls();renderLineupControls();let readonlyText=isReadOnlyMatch()?'Archive en lecture seule.':state.route==='alignement'&&isMatchStarted()?'Le match est commencé. Cet alignement est maintenant en lecture seule.':state.route==='jouer'&&!isMatchStarted()?'Le tableau restera en lecture seule jusqu’au début du match.':'';let readonlyAlert=readonlyText?'<div class="alert warn"><span class="mark">⚠</span><div>'+esc(readonlyText)+'</div></div>':'';let a=active();if(a.length<MIN||a.length>MAX){$('#validations').innerHTML=readonlyAlert+'<div class="alert bad"><span class="mark">✖</span><div>Active entre '+MIN+' et '+MAX+' joueurs.</div></div>';$('#lineup').innerHTML='<div class="empty">Pas encore prêt.</div>';$('#scores').innerHTML='';$('#suggestions').innerHTML='';let card=$('#suggestionsCard');if(card)card.classList.add('hide');$('#stats').innerHTML='';$('#legend').innerHTML='';renderPlayWarnings();return}let an=analyze();$('#validations').innerHTML=readonlyAlert+an.validations.map(v=>'<div class="alert '+(v.ok?'ok':v.warn?'warn':'bad')+'"><span class="mark">'+(v.ok?'✔':v.warn?'⚠':'✖')+'</span><div>'+esc(v.text)+'</div></div>').join('');let f=an.fair;let scoreRows=state.fixed?[['Présences au bâton',f.abScore,'Écart max: '+f.abGap],['Temps de jeu',f.totalScore,'Écart max: '+f.totalGap],['Variété des positions',f.posScore,'Écart max: '+f.posGap],['Indice global',f.overall,f.overall>=92?'Excellent':f.overall>=80?'Bon':'À améliorer']]:[['Temps de jeu',f.totalScore,'Écart max: '+f.totalGap],['Variété des positions',f.posScore,'Écart max: '+f.posGap],['Indice global',f.overall,f.overall>=92?'Excellent':f.overall>=80?'Bon':'À améliorer']];$('#scores').innerHTML=scoreRows.map(x=>'<div class="score"><span class="label">'+esc(x[0])+'</span><strong>'+x[1]+'%</strong><div class="hint">'+esc(x[2])+'</div></div>').join('');renderPlayWarnings();renderTable();scrollLineupToCurrentHalf();renderSuggestions(an.suggestions);renderStats(an.stats);renderLegend()}
function renderTable(target){
  let root=$(target||'#lineup'),orderRows=active(),rankById=new Map(orderRows.map((p,i)=>[p.id,i+1])),a=tablePlayers(),rankMaps=[],halves=['debut','fin'];
  let halfSelected=(i,half)=>selectedCol===i&&selectedHalf===half;
  for(let i=0;i<state.innings;i++)rankMaps.push(state.fixed?new Map(batters(i).map(b=>[b.id,b.rank])):new Map());
  let h='<table class="lineupTable"><thead><tr><th rowspan="2" data-clear-selection title="Désélectionner">Ordre</th>';
  for(let i=0;i<state.innings;i++){
    let lock=inningLockState(i);
    h+='<th colspan="2" data-inning-head="'+i+'" class="'+(lock!=='open'?'lockedHead':'')+'">Manche '+(i+1);
    if(i===state.innings-1)h+='<div class="inningTools"><button class="icon soft" data-remove-inning title="Retirer une manche" aria-label="Retirer une manche" '+(state.innings<=MIN_INN||isLineupReadOnly()?'disabled':'')+'>−</button><button class="icon soft" data-add-inning title="Ajouter une manche" aria-label="Ajouter une manche" '+(state.innings>=MAX_INN||isLineupReadOnly()?'disabled':'')+'>+</button></div>';
    h+='</th>';
  }
  h+='</tr><tr>';
  for(let i=0;i<state.innings;i++)halves.forEach(half=>{
    let locked=isHalfLocked(i,half);
    h+='<th data-head="'+i+'" data-half="'+half+'" class="halfHead '+(halfSelected(i,half)?'colSelected ':'')+(isCurrentPlayHalf(i,half)?'currentHalf ':'')+(locked?'lockedHead':'')+'"><span title="'+halfLabel(half)+'">'+halfIcon(half)+'</span></th>';
  });
  h+='</tr></thead><tbody>';
  a.forEach(pl=>{
    let inactive=!pl.on,rowSel=selectedRow===pl.id;
    h+='<tr data-tr="'+pl.id+'" class="'+(rowSel?'rowSelected':'')+'"><td class="playerCell '+(isMatchStarted()||isLineupReadOnly()?' lockedCell':'')+(inactive?' inactiveRow':'')+'" draggable="'+(!isMatchStarted()&&!isLineupReadOnly())+'" data-row="'+pl.id+'"><div class="pin"><span class="rank">'+(rankById.get(pl.id)||'')+'</span><span class="playerNameLine">'+playerBadgeHtml(pl)+'<b>'+esc(pl.name)+'</b></span></div></td>';
    for(let i=0;i<state.innings;i++)halves.forEach(half=>{
      let batting=isBattingHalf(half),locked=isHalfLocked(i,half),selected=halfSelected(i,half),r=rankMaps[i].get(pl.id);
      if(batting){
        let lab=state.fixed&&r?'#'+r:'—';
        h+='<td class="'+(selected?'colSelected ':'')+(isCurrentPlayHalf(i,half)?'currentHalf ':'')+(locked?'lockedCol':'')+'"><span class="cell battingCell '+(locked?'lockedCell':'')+'" title="'+escAttr(locked?'Demi-manche barrée':pl.name)+'" data-batting="'+pl.id+'" data-inning="'+i+'" data-half="'+half+'">'+esc(lab)+'</span></td>';
        return;
      }
      let assigned=state.schedule[i]?.pos[pl.id],po=assigned||'B',bad=problems.get(pl.id+':'+i),missing=!assigned&&!inactive&&!locked&&missingPositions(i).length,lab=inactive&&!assigned?'—':po==='B'?'BANC':po;
      let hi=(highlightPos&&(highlightPos===po||(highlightPos==='L'&&PITCH.has(po))))?'posHighlight':'';
      let attrs=inactive&&!assigned?'':' data-cell="'+pl.id+'" data-inning="'+i+'" data-half="'+half+'" data-pos="'+po+'"';
      h+='<td class="'+(selected?'colSelected ':'')+(isCurrentPlayHalf(i,half)?'currentHalf ':'')+(locked?'lockedCol':'')+'"><span class="cell '+(po==='B'?'bench ':'')+(bad?'problem ':'')+(missing?'missingBench ':'')+hi+(locked||isLineupReadOnly()||inactive&&!assigned?' lockedCell':'')+'" draggable="'+(!locked&&!inactive&&!isLineupReadOnly())+'" title="'+escAttr(locked?'Demi-manche barrée':missing?'Cliquer pour assigner une position manquante':bad?bad.join(' · '):pl.name)+'"'+attrs+'>'+esc(lab)+'</span></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  root.innerHTML=h;
  requestAnimationFrame(()=>{let hint=$('#lineupScrollHint'),mobile=window.matchMedia('(max-width: 920px)').matches,overflowing=root.scrollWidth>root.clientWidth;hint?.classList.toggle('show',mobile&&overflowing&&!lineupScrollHintDismissed)});
  dndRows(root);dndCells(root);
  root.querySelectorAll('[data-clear-selection]').forEach(th=>th.onclick=()=>{selectedRow=null;selectedCol=null;selectedHalf=null;renderTable(target)});
  root.querySelectorAll('[data-head][data-half]').forEach(th=>th.onclick=e=>{selectedCol=+th.dataset.head;selectedHalf=th.dataset.half;selectedRow=null;renderTable(target)});
  root.querySelectorAll('[data-add-inning]').forEach(b=>b.onclick=e=>{e.stopPropagation();appendInning()});
  root.querySelectorAll('[data-remove-inning]').forEach(b=>b.onclick=e=>{e.stopPropagation();removeInning()});
  root.querySelectorAll('.playerCell').forEach(td=>td.onclick=()=>{selectedRow=td.dataset.row;selectedCol=null;selectedHalf=null;renderTable(target)});
  root.querySelectorAll('.cell').forEach(c=>c.onclick=()=>{
    let i=+c.dataset.inning,half=c.dataset.half;
    if(!isLineupReadOnly()&&c.dataset.cell&&!isBattingHalf(half)&&c.dataset.pos==='B'&&missingPositions(i).length){if(assignMissingPositionFromBench(c.dataset.cell,i))return}
    selectedRow=c.dataset.cell||c.dataset.batting;selectedCol=i;selectedHalf=half;renderTable(target);
  });
}
function dndRows(root){root.querySelectorAll('[data-row]').forEach(el=>{el.ondragstart=e=>{if(isMatchStarted()||isLineupReadOnly()){e.preventDefault();return}dragRow=el.dataset.row;dragCell=null;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'};el.ondragend=()=>{el.classList.remove('dragging');dragRow=null};el.ondragover=e=>{if(!isMatchStarted()&&!isLineupReadOnly())e.preventDefault()};el.ondrop=e=>{e.preventDefault();if(isMatchStarted()||isLineupReadOnly())return;let target=el.dataset.row;if(dragRow&&target&&dragRow!==target){let arr=state.order,from=arr.indexOf(dragRow),to=arr.indexOf(target);if(from>=0&&to>=0){let m=arr.splice(from,1)[0];arr.splice(to,0,m);markDirty();save();renderAll()}}}})}
function dndCells(root){root.querySelectorAll('.cell[data-cell]').forEach(el=>{el.ondragstart=e=>{let i=+el.dataset.inning,half=el.dataset.half;if(isLineupReadOnly()||isHalfLocked(i,half)){e.preventDefault();return}dragCell={id:el.dataset.cell,i,half};dragRow=null;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'};el.ondragend=()=>{el.classList.remove('dragging');root.querySelectorAll('.cell').forEach(c=>c.classList.remove('over'));dragCell=null};el.ondragover=e=>{let i=+el.dataset.inning,half=el.dataset.half;if(dragCell&&!isLineupReadOnly()&&i===dragCell.i&&half===dragCell.half&&!isHalfLocked(i,half)){e.preventDefault();el.classList.add('over')}};el.ondragleave=()=>el.classList.remove('over');el.ondrop=e=>{e.preventDefault();el.classList.remove('over');if(!dragCell||isLineupReadOnly())return;let id2=el.dataset.cell,i=+el.dataset.inning,half=el.dataset.half;if(isHalfLocked(i,half)||i!==dragCell.i||half!==dragCell.half||id2===dragCell.id)return;let pos=state.schedule[i].pos,p1=pos[dragCell.id],p2=pos[id2];if(p1)pos[id2]=p1;else delete pos[id2];if(p2)pos[dragCell.id]=p2;else delete pos[dragCell.id];markDirty();save();renderAll()}})}
function renderLegend(){let items=[['1B','Premier but'],['2B','Deuxième but'],['3B','Troisième but'],['AC','Arrêt-court'],['L','Lanceurs 🧢'],['B','Banc']];if(state.fixed)items.push(['#','Rang de frappe dans la manche']);$('#legend').innerHTML=items.map(([k,v])=>'<button class="tag clickable '+(highlightPos===k?'active':'')+'" data-legend="'+k+'"><b>'+esc(k)+'</b> = '+esc(v)+'</button>').join('');$$('[data-legend]').forEach(b=>b.onclick=()=>{highlightPos=highlightPos===b.dataset.legend?null:b.dataset.legend;renderTable();renderLegend()})}
function renderSuggestions(sugs){let readonly=isLineupReadOnly(),visible=sugs.some(s=>!readonly&&(s.action||s.level!=='ok'));let card=$('#suggestionsCard');if(card)card.classList.toggle('hide',!visible);if(!visible){$('#suggestions').innerHTML='';return}$('#suggestions').innerHTML=sugs.map((s,i)=>'<div class="suggestion"><div><b>'+(s.level==='bad'?'❌':s.level==='warn'?'⚠':'✔')+' '+esc(s.title)+'</b><div class="hint">'+esc(s.text)+'</div></div>'+(!readonly&&s.action?'<button class="btn secondary" data-apply="'+i+'">Appliquer</button>':'')+'</div>').join('');$$('[data-apply]').forEach(b=>b.onclick=()=>applySuggestion(analysis.suggestions[+b.dataset.apply].action))}
function renderStats(st){if(!state.fixed&&['ab','total'].includes(statSort.key))statSort={key:'order',dir:1};let rows=active().map((pl,i)=>({id:pl.id,name:pl.name,order:i+1,...(st[pl.id]||emptyStats())}));let key=statSort.key,dir=statSort.dir;rows.sort((a,b)=>{let va=key==='name'?a.name.toLowerCase():a[key],vb=key==='name'?b.name.toLowerCase():b[key];if(key==='order')return (a.order-b.order)*dir;if(va<vb)return -1*dir;if(va>vb)return 1*dir;return a.order-b.order});let headers=state.fixed?[['order','Ordre'],['name','Joueur'],['ab','AB'],['def','Déf.'],['total','Total'],['bench','Banc'],['one','1B'],['two','2B'],['three','3B'],['ac','AC'],['pitch','L']]:[['order','Ordre'],['name','Joueur'],['def','Déf.'],['bench','Banc'],['one','1B'],['two','2B'],['three','3B'],['ac','AC'],['pitch','L']];let h='<table class="statSort"><thead><tr>'+headers.map(x=>'<th><button data-sort="'+x[0]+'">'+x[1]+(statSort.key===x[0]?(statSort.dir>0?' ▲':' ▼'):'')+'</button></th>').join('')+'</tr></thead><tbody>';rows.forEach(r=>{h+='<tr><td>'+r.order+'</td><td style="text-align:left"><b>'+esc(r.name)+'</b></td>';if(state.fixed)h+='<td>'+r.ab+'</td>';h+='<td>'+r.def+'</td>';if(state.fixed)h+='<td>'+r.total+'</td>';h+='<td>'+r.bench+'</td><td>'+(r.pos['1B']||0)+'</td><td>'+(r.pos['2B']||0)+'</td><td>'+(r.pos['3B']||0)+'</td><td>'+(r.pos['AC']||0)+'</td><td>'+((r.pos['L1']||0)+(r.pos['L2']||0))+'</td></tr>'});$('#stats').innerHTML=h+'</tbody></table>';$$('[data-sort]').forEach(b=>b.onclick=()=>{let k=b.dataset.sort;if(statSort.key===k)statSort.dir*=-1;else{statSort.key=k;statSort.dir=1}renderStats(analysis.stats)})}
function pname(id){let p=id?player(id):null;return p?playerLabel(p):'—'}
function matchPhases(){let phases=[];for(let i=0;i<state.innings;i++){['debut','fin'].forEach(half=>{let batting=(state.side==='visiteur'&&half==='debut')||(state.side==='locale'&&half==='fin');phases.push({inning:i,half,label:(half==='debut'?'Début':'Fin')+' de '+ordinal(i+1),type:batting?'attaque':'defense'})})}return phases}
function ordinal(n){return n===1?'1re':n+'e'}
function renderMatch(){let phases=matchPhases();if(state.route==='spectateur'&&!spectatorTouched)matchIndex=Math.min(currentPlayIndex(),Math.max(0,phases.length-1));if(matchIndex>=phases.length)matchIndex=phases.length-1;if(matchIndex<0)matchIndex=0;let ph=phases[matchIndex]||{label:'—',type:'attaque',inning:0,half:'debut'},current=currentPlayIndex(),locked=isHalfLocked(ph.inning,ph.half),currentShown=isMatchStarted()&&current<phases.length&&matchIndex===current,status=locked?'Terminée':currentShown?'En cours':'',title=ph.type==='attaque'?'Ordre des frappeurs':'Positions défensives',body=ph.type==='attaque'?renderMatchBatters(ph.inning):renderMatchDefense(ph.inning),pill=[ph.label,ph.type==='attaque'?'Attaque':'Défense',status].filter(Boolean).join(' • ');$('#matchCard').innerHTML='<div><span class="matchPill '+(locked?'done':currentShown?'current':'future')+'">'+esc(pill)+'</span><h2 class="matchTitle">'+esc(title)+'</h2><div class="tiny matchMeta">'+esc(matchHeaderText())+'</div></div><div class="matchList">'+body+'</div>';
  $('#matchDots').innerHTML=phases.map((p,i)=>'<span class="dot '+(i===matchIndex?'active ':'')+(isHalfLocked(p.inning,p.half)?'lockedDot ':'')+(isMatchStarted()&&i===current?'currentDot':'')+'"></span>').join('');$('#matchPrev').disabled=matchIndex<=0;$('#matchNext').disabled=matchIndex>=phases.length-1;let currentBtn=$('#matchCurrent');if(currentBtn)currentBtn.disabled=!isMatchStarted()||current>=phases.length}
function renderMatchBatters(inning){let bs=state.fixed?batters(inning):active().map((p,i)=>({rank:i+1,label:playerLabel(p),name:p.name}));if(!bs.length)return '<div class="matchItem"><strong>Attaque</strong><span>Ordre variable</span></div>';return bs.map(b=>'<div class="matchItem"><strong>'+b.rank+'</strong><span>'+esc(b.label||b.name)+'</span></div>').join('')}
function renderMatchDefense(inning){return defenseItems(inning).map(r=>'<div class="matchItem"><strong>'+esc(r[0])+'</strong><span>'+esc(r[1])+'</span></div>').join('')}
function coachHalfCard(ph,stateClass){
  if(!ph)return '<div class="coachHalfCard"><h3>Match terminé</h3><p class="hint">Toutes les demi-manches sont complétées.</p></div>';
  let title=ph.type==='attaque'?'🏏 À l’attaque':'🧤 En défensive',body=ph.type==='attaque'?renderMatchBatters(ph.inning):renderMatchDefense(ph.inning);
  return '<div class="coachHalfCard '+stateClass+'"><div class="coachHalfLabel">'+esc(ph.label)+'</div><h3>'+title+'</h3><div class="matchList">'+body+'</div></div>';
}
function coachBenchPlayers(ph){
  if(!ph)return[];
  let playingIds=ph.type==='defense'
    ?new Set(Object.keys(state.schedule[ph.inning]?.pos||{}))
    :new Set((state.fixed?batters(ph.inning):active()).map(p=>p.id));
  return active().filter(p=>!playingIds.has(p.id))
}
function coachFutureEquityIssues(){
  if(!isMatchStarted()||currentPlayIndex()>=halfSequence().length||active().length<MIN)return[];
  analyze();let out=new Set();
  problems.forEach((messages,key)=>{let inning=Number(String(key).split(':')[1]);if(!Number.isFinite(inning)||isHalfLocked(inning,defenseHalf()))return;(messages||[]).forEach(msg=>out.add(msg))});
  futureDefenseIssues().forEach(issue=>out.add('Positions défensives incomplètes à la manche '+(issue.inning+1)));
  return Array.from(out);
}
function setCoachMatchIndex(index){let phases=matchPhases();coachMatchIndex=Math.min(Math.max(0,index),Math.max(0,phases.length-1));renderCoachMatch()}
function showCoachCurrentHalf(){setCoachMatchIndex(currentPlayIndex())}
function coachFutureSuggestions(){if(!isMatchStarted()||currentPlayIndex()>=halfSequence().length||active().length<MIN)return[];return analyze().suggestions.filter(s=>s.level!=='ok'&&Number.isInteger(s.inning)&&!isHalfLocked(s.inning,defenseHalf()))}
function confirmCoachSuggestion(suggestion){if(!suggestion||!Number.isInteger(suggestion.inning))return;if(isHalfLocked(suggestion.inning,defenseHalf())){modal('Demi-manche jouée','Cette suggestion n’est plus applicable parce que la demi-manche est déjà jouée.');return}let text=suggestion.text+' Cette modification touchera la manche '+(suggestion.inning+1)+' et sera reflétée dans la vue publique si le match est partagé.';modal('Appliquer cette suggestion?',text,[{label:'Annuler',kind:'secondary'},{label:'Appliquer',kind:'brandBtn',onClick:()=>applySuggestion(suggestion.action)}])}
function setPlayView(view){playView=view==='simple'?'simple':'complete';renderPlayView();if(playView==='simple')renderCoachMatch();else{renderAlign();renderOptimizeButton()}}
function renderPlayView(){let full=$('#playFullMount'),simple=$('#playSimpleMount');if(!full||!simple)return;full.classList.toggle('hide',playView!=='complete');simple.classList.toggle('hide',playView!=='simple');document.body.classList.toggle('simplePlayRoute',state.route==='jouer'&&playView==='simple');$$('[data-play-view]').forEach(b=>{let active=b.dataset.playView===playView;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')})}
function renderPlayGateway(){let card=$('#playGateway');if(!card)return;let m=activeMatch(),ready=isMatchReady(),started=isMatchStarted(),published=!!m?.cloud?.publicId,status=$('#playReadyStatus'),text=$('#playGatewayText'),start=$('#startMatchBtn');card.classList.toggle('hide',started||m?.status==='completed'||m?.status==='archived');if(status){status.textContent=ready?'Prêt à jouer':'En préparation';status.classList.toggle('okTag',ready)}if(text)text.textContent=ready?'Tu peux commencer le match.'+(published?'':' Le match n’est pas partagé, active-le dans la section Partager si tu veux.'):'L’alignement doit être prêt avant de commencer le match.';if(start)start.disabled=!ready}
function renderCoachMatch(){
  let currentRoot=$('#coachCurrentHalf');if(!currentRoot)return;
  if(!activeMatch()){currentRoot.innerHTML='<div class="empty">Aucun match actif.</div>';return}
  let phases=matchPhases(),idx=currentPlayIndex(),current=phases[idx],started=isMatchStarted(),done=started&&idx>=phases.length;
  coachMatchIndex=Math.min(Math.max(0,coachMatchIndex),Math.max(0,phases.length-1));let shown=phases[coachMatchIndex],showingCurrent=!done&&coachMatchIndex===idx;
  $('#coachMatchStatus').textContent=!started?(isMatchReady()?'Prêt à commencer':'Alignement à préparer'):done?'Match terminé':'Manche en cours • '+current.label;
  $('#coachMatchStatus').className='matchPill coachCurrentPill '+(done?'done':started?'current':'future');
  currentRoot.innerHTML=coachHalfCard(shown,showingCurrent?'coachShownCurrent':coachMatchIndex<idx?'coachShownPast':'coachShownFuture');
  $('#coachMatchDots').innerHTML=phases.map((ph,i)=>'<button type="button" class="dot '+(i===coachMatchIndex?'active ':'')+(i<idx?'lockedDot ':'')+(i===idx?'currentDot':'')+'" data-coach-half="'+i+'" aria-label="'+escAttr(ph.label)+'"></button>').join('');
  $$('[data-coach-half]').forEach(button=>button.onclick=()=>setCoachMatchIndex(Number(button.dataset.coachHalf)));
  let advance=$('#coachAdvanceBtn'),change=$('#coachChangeBtn');
  advance.textContent=!started?'Commencer le match':current?'Terminer '+current.label.toLowerCase():'Terminer le match';advance.disabled=isReadOnlyMatch()||!showingCurrent||!started&&!isMatchReady();
  change.disabled=!started||done||isReadOnlyMatch()||!showingCurrent;
  let suggestions=coachFutureSuggestions(),issues=coachFutureEquityIssues(),warning=$('#coachEquityWarning');
  warning.innerHTML=issues.length?'<div class="coachEquityAlert"><div><b>⚠ Équité à vérifier</b><p>'+issues.length+' problème'+(issues.length>1?'s':'')+' dans les demi-manches restantes.</p></div>'+(!suggestions.length?'<a class="btn secondary" href="#alignement">Voir dans l’alignement</a>':'')+'</div>':'';
  let suggestionsBox=$('#coachSuggestions'),suggestionsSummary=$('#coachSuggestionsSummary'),suggestionsList=$('#coachSuggestionList');
  suggestionsBox.classList.toggle('hide',!suggestions.length);suggestionsSummary.textContent='Suggestions ('+suggestions.length+')';
  suggestionsList.innerHTML=suggestions.map((s,i)=>'<div class="coachSuggestion"><div><b>'+esc(s.title)+'</b><p>'+esc(s.text)+'</p></div>'+(s.action?'<button class="btn secondary" type="button" data-coach-suggestion="'+i+'">Appliquer</button>':'<a class="btn secondary" href="#alignement">Voir dans l’alignement</a>')+'</div>').join('');
  $$('[data-coach-suggestion]').forEach(button=>button.onclick=()=>confirmCoachSuggestion(suggestions[Number(button.dataset.coachSuggestion)]));
  let bench=coachBenchPlayers(shown),summary=$('#coachInactiveSummary'),list=$('#coachInactiveList');
  summary.textContent='Joueurs au banc ('+bench.length+')';list.innerHTML=bench.length?bench.map(p=>'<div class="coachInactivePlayer">'+playerBadgeHtml(p)+'<b>'+esc(p.name)+'</b></div>').join(''):'<div class="hint">Aucun joueur au banc.</div>';
}
function matchHeaderText(){let t=state.team||'Équipe';let o=state.opp?' vs '+state.opp:'';let d=state.date?' • '+formatDate(state.date):'';let tm=state.time?' • '+state.time:'';let p=state.place?' • '+state.place:'';return t+o+d+tm+p}
function formatDate(d){try{let out=new Date(d+'T12:00:00').toLocaleDateString('fr-CA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return out?out.charAt(0).toUpperCase()+out.slice(1):out}catch(e){return d}}
function setMatchIndex(i){spectatorTouched=true;let items=cloud.publicView?publicSteps(cloud.publicView):matchPhases();matchIndex=Math.min(Math.max(0,i),Math.max(0,items.length-1));if(cloud.publicView&&matchIndex===publicCurrentStepIndex(cloud.publicView))cloud.publicUpdateAvailable=false;cloud.publicView?renderPublicMatch():renderMatch()}
function defenseItems(inning){let inn=state.schedule[inning]||{pos:{}};let rev={};Object.entries(inn.pos||{}).forEach(([id,po])=>rev[po]=id);return[['L1 🧢',pname(rev.L1)||'—',rev.L1||''],['L2 🧢',pname(rev.L2)||'—',rev.L2||''],['1B',pname(rev['1B']),rev['1B']||''],['2B',pname(rev['2B']),rev['2B']||''],['3B',pname(rev['3B']),rev['3B']||''],['AC',pname(rev['AC']),rev['AC']||'']]}
function svgWrapWords(text,max){let words=String(text||'—').split(/\s+/).filter(Boolean),lines=[],line='';words.forEach(w=>{if(!line){line=w;return}if((line+' '+w).length<=max)line+=' '+w;else{lines.push(line);line=w}});if(line)lines.push(line);return lines.length?lines:['—']}
function parentFileSlug(text){let s=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return s||'equipe'}
function parentFileBase(){let parts=[state.date||'match',parentFileSlug(state.team||'equipe')];if(state.opp)parts.push(parentFileSlug(state.opp));return parts.join('_')}
function exportShareUrl(){let teamId=activeTeamPublicId(),matchId=activeMatch()?.cloud?.publicId||cloud.publicId;if(teamId)return'https://coachrally.app/#fans/'+encodeURIComponent(teamId);if(matchId)return'https://coachrally.app/#public/'+encodeURIComponent(matchId);return'https://coachrally.app/'}
function makeQr(value){if(typeof qrcode!=='function')return null;let qr=qrcode(0,'M');qr.addData(value,'Byte');qr.make();return qr}
function qrSvgGroup(value,x,y,size){let qr=makeQr(value);if(!qr)return'';let count=qr.getModuleCount(),quiet=4,total=count+quiet*2,cell=size/total,out=['<g aria-label="Code QR vers '+xml(value)+'"><rect x="'+x+'" y="'+y+'" width="'+size+'" height="'+size+'" rx="8" fill="#fff"/>'];for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))out.push('<rect x="'+(x+(col+quiet)*cell)+'" y="'+(y+(row+quiet)*cell)+'" width="'+(cell+.08)+'" height="'+(cell+.08)+'" fill="#162033"/>');out.push('</g>');return out.join('')}
function qrImgTag(value,size=92){let qr=makeQr(value);return qr?'<img src="'+qr.createDataURL(3,12)+'" width="'+size+'" height="'+size+'" alt="Code QR vers '+escAttr(value)+'">':''}
function parentProgramSvg(){
  let a=active(),width=1200,y=0,s=[];
  let fanLines=miniMarkdownLines(state.fanMessage);
  let fanHeight=fanLines.length?fanLines.length*30+38:0;
  let generalOrderHeight=state.fixed?0:Math.ceil(a.length/2)*36+86;
  let inningHeight=state.fixed?242:210;
  let height=Math.max(1200,306+fanHeight+generalOrderHeight+state.innings*inningHeight+190);
  let add=t=>s.push(t);
  let text=(x,y,txt,size=28,weight=700,fill='#162033')=>add('<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-family="Arial, Helvetica, sans-serif" font-weight="'+weight+'" fill="'+fill+'">'+xml(txt)+'</text>');
  let textRight=(x,y,txt,size=28,weight=700,fill='#162033')=>add('<text x="'+x+'" y="'+y+'" text-anchor="end" font-size="'+size+'" font-family="Arial, Helvetica, sans-serif" font-weight="'+weight+'" fill="'+fill+'">'+xml(txt)+'</text>');
  let fittedText=(x,y,txt,maxWidth,size=19,minSize=13,weight=700,fill='#162033')=>{txt=String(txt||'—');let estimated=Math.max(1,txt.length*.56),fitted=Math.max(minSize,Math.min(size,maxWidth/estimated)),estimatedWidth=estimated*fitted,fit=estimatedWidth>maxWidth?' textLength="'+maxWidth+'" lengthAdjust="spacingAndGlyphs"':'';add('<text x="'+x+'" y="'+y+'" font-size="'+fitted.toFixed(1)+'" font-family="Arial, Helvetica, sans-serif" font-weight="'+weight+'" fill="'+fill+'"'+fit+'>'+xml(txt)+'</text>')};
  let wrapped=(x,y,txt,size,max,weight=700,fill='#162033')=>{let lines=svgWrapWords(txt,max).slice(0,2);lines.forEach((line,i)=>text(x,y+i*(size+4),line,size,weight,fill));return y+lines.length*(size+4)};
  let listGrid=(items,top,opts={})=>{
    let cols=3,colW=290,rowH=34,startX=190,labelW=42,small=opts.small||false;
    items.forEach((it,j)=>{
      let col=j%cols,row=Math.floor(j/cols),x=startX+col*colW,yy=top+row*rowH;
      text(x,yy,it.label,small?18:19,900,'#0f7a4b');
      fittedText(x+labelW,yy,it.name,colW-labelW-12,small?18:19,13,700);
    });
  };
  let battingItems=i=>batters(i).map((b,j)=>({label:(j+1)+'.',name:b.label||b.name}));
  let defenseGrid=i=>{
    let items=defenseItems(i);
    return[
      {label:'L1',name:items[0][1]+' 🧢'},
      {label:'L2',name:items[1][1]+' 🧢'},
      {label:'AC',name:items[5][1]},
      {label:'1B',name:items[2][1]},
      {label:'2B',name:items[3][1]},
      {label:'3B',name:items[4][1]}
    ];
  };
  let renderAttack=(inning,half,top)=>{
    if(state.fixed)listGrid(battingItems(inning),top+8);
  };
  let renderDefense=(inning,half,top)=>{
    listGrid(defenseGrid(inning),top+8);
  };
  let renderHalf=(inning,half,top)=>{
    let attack=isBattingHalf(half),icon=attack?'🏏':'🧤',rowH=attack&&!state.fixed?48:80;
    add('<rect x="100" y="'+(top-24)+'" width="1000" height="'+rowH+'" rx="18" fill="'+(attack?'#e8f6ef':'#f1f6fb')+'" stroke="#dbe5ef"/>');
    text(130,top+18,icon,30,900,attack?'#0f7a4b':'#24537a');
    add('<line x1="176" y1="'+(top-10)+'" x2="176" y2="'+(top+rowH-34)+'" stroke="#dbe5ef" stroke-width="2"/>');
    if(attack)renderAttack(inning,half,top);else renderDefense(inning,half,top);
    return top+rowH+10;
  };
  add('<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><rect width="100%" height="100%" fill="#f7fbff"/><rect x="40" y="24" width="1120" height="'+(height-64)+'" rx="42" fill="#ffffff" stroke="#dbe5ef"/>');
  add('<rect x="40" y="24" width="1120" height="226" rx="42" fill="#0f7a4b"/>');
  text(90,98,'⚾ Programme de match',32,900,'#dfffea');
  wrapped(90,168,state.team||'Équipe',54,22,900,'#ffffff');
  text(90,224,(state.opp?'vs '+state.opp:'')+(state.side==='locale'?' • Locale':' • Visiteur'),28,800,'#dfffea');
  textRight(1110,88,state.date?formatDate(state.date):'',24,800,'#ffffff');
  textRight(1110,120,state.time||'',20,800,'#ffffff');
  textRight(1110,150,state.place||'',20,700,'#dfffea');
  y=306;
  if(fanLines.length){
    add('<rect x="90" y="'+(y-28)+'" width="1020" height="'+(fanHeight-10)+'" rx="20" fill="#f8fafc" stroke="#dbe5ef"/>');
    fanLines.forEach((line,i)=>wrapped(120,y+i*30,line,20,88,700,'#162033'));
    y+=fanHeight+18;
  }
  if(!state.fixed){
    text(90,y,'Ordre des frappeurs',32,900);y+=46;
    add('<rect x="90" y="'+(y-30)+'" width="1020" height="'+(Math.ceil(a.length/2)*36+18)+'" rx="22" fill="#f8fafc" stroke="#dbe5ef"/>');
    a.forEach((p,i)=>{let col=i%2,row=Math.floor(i/2),x=120+col*500,yy=y+row*36;text(x,yy,(i+1)+'.',20,900,'#0f7a4b');fittedText(x+48,yy,playerLabel(p),410,20,14,700)});
    y+=Math.ceil(a.length/2)*36+50;
  }
  for(let i=0;i<state.innings;i++){
    text(90,y,'Manche '+(i+1),30,900);y+=44;
    y=renderHalf(i,'debut',y);
    y=renderHalf(i,'fin',y);
    y+=18;
  }
  add(qrSvgGroup(exportShareUrl(),1000,height-164,112));
  text(90,height-88,'⚾ CoachRally • coachrally.app',22,900,'#0f7a4b');
  text(90,height-50,'Légende: L1/L2 = Lanceurs 🧢 • AC = Arrêt-court • 1B/2B/3B = buts',20,700,'#617086');
  add('</svg>');
  return s.join('')
}
function exportParentImage(){let svg=parentProgramSvg(),base=parentFileBase();let img=new Image();let url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);img.onload=function(){let canvas=document.createElement('canvas');canvas.width=img.width*2;canvas.height=img.height*2;let ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob)downloadBlob(base+'.png',blob);else downloadFile(base+'.svg',svg,'image/svg+xml')},'image/png',0.96)};img.onerror=()=>downloadFile(base+'.svg',svg,'image/svg+xml');img.src=url}
function xml(s){return String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function printCoach(){let a=active(),meta=[state.date?formatDate(state.date):'',state.time||'',state.place||''].filter(Boolean).join(' • '),rankMaps=[],cheers=['👏','🎉','🎵'];for(let i=0;i<state.innings;i++)rankMaps.push(state.fixed?new Map(batters(i).map((b,j)=>[b.id,j+1])):new Map());let html='<html><head><title>Banc</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#111}button{margin-bottom:16px}h1{margin:0 0 4px;font-size:24px}p{margin:0 0 16px;color:#444}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #111;padding:6px;text-align:center;vertical-align:middle}th:first-child,td:first-child{text-align:left;white-space:nowrap}thead th{background:#f1f5f9}.bat{width:34px}.def{width:56px}.legend{margin-top:10px;font-size:12px;color:#444}.exportBrand{margin-top:16px;padding-top:12px;border-top:1px solid #ccd6df;display:flex;align-items:center;justify-content:space-between;gap:16px}.exportBrandText{margin:0;color:#0f7a4b;font-size:13px;font-weight:700}.exportBrand img{display:block}@media print{button{display:none}body{padding:0}table{font-size:11px}th,td{padding:5px}}</style></head><body><button onclick="print()">Imprimer / Enregistrer en PDF</button><h1>'+esc(state.team||'Équipe')+(state.opp?' vs '+esc(state.opp):'')+'</h1><p>'+esc(meta)+'</p><table><thead><tr><th rowspan="2">Joueur</th>';for(let i=0;i<state.innings;i++)html+='<th colspan="2">Manche '+(i+1)+'</th>';html+='</tr><tr>';for(let i=0;i<state.innings;i++)html+='<th class="bat">🏏</th><th class="def">🧤</th>';html+='</tr></thead><tbody>';a.forEach((pl,pi)=>{html+='<tr><td><b>'+esc(playerLabel(pl))+'</b></td>';for(let i=0;i<state.innings;i++){let cheer=cheers[(pi+i)%cheers.length],po=state.schedule[i]?.pos[pl.id]||'BANC',rank=state.fixed?(rankMaps[i].get(pl.id)||cheer):'',def=po==='BANC'?cheer:esc(po)+(po==='L1'||po==='L2'?' 🧢':'');html+='<td>'+esc(rank)+'</td><td>'+def+'</td>'}html+='</tr>'});html+='</tbody></table><p class="legend">🏏 = rang de frappe ou mission d’encouragement. 🧤 = position défensive. Missions: 👏 Applaudi, 🎉 Encourage, 🎵 Chante.</p><div class="exportBrand"><p class="exportBrandText">⚾ CoachRally<br><span>coachrally.app</span></p>'+qrImgTag(exportShareUrl())+'</div></body></html>';openPrint(html)}
function lineupHtmlTable(inlineStyles){let a=active(),rankMaps=[];for(let i=0;i<state.innings;i++)rankMaps.push(state.fixed?new Map(batters(i).map(b=>[b.id,b.rank])):new Map());let h='<table'+(inlineStyles?' style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"':'')+'><thead><tr><th>Ordre</th>';for(let i=0;i<state.innings;i++)h+='<th>Manche '+(i+1)+'</th>';h+='</tr></thead><tbody>';a.forEach((pl,ri)=>{h+='<tr><td>'+(ri+1)+'. '+esc(playerLabel(pl))+'</td>';for(let i=0;i<state.innings;i++){let po=state.schedule[i]?.pos[pl.id]||'BANC',r=rankMaps[i].get(pl.id);h+='<td>'+esc((po==='B'?'BANC':po)+(r?' (#'+r+')':''))+'</td>'}h+='</tr>'});return h+'</tbody></table>'}
function fallbackCopy(text){navigator.clipboard?.writeText(text).then(()=>modal('Copié','Texte copié.')).catch(()=>modal('Copie impossible','Ton navigateur bloque le presse-papiers.'))}
function exportText(){return miniPrinterText()}
function miniPrinterText(){let a=active(),lines=[];lines.push((state.team||'Équipe')+(state.side==='locale'?' (LOC)':' (VIS)'));if(state.opp)lines.push('vs '+state.opp+(state.side==='locale'?' (VIS)':' (LOC)'));if(state.date)lines.push(formatDate(state.date));if(state.time)lines.push(state.time);if(state.place)lines.push(state.place);if(!state.fixed){lines.push('');lines.push('ORDRE');a.forEach((p,i)=>lines.push((i+1)+'. '+playerLabel(p)))}matchPhases().forEach(ph=>{lines.push('');lines.push(ph.label.toUpperCase()+' - '+(ph.type==='attaque'?'ATTAQUE':'DEFENSE'));if(ph.type==='attaque'){if(state.fixed)batters(ph.inning).forEach((b,j)=>lines.push((j+1)+'. '+(b.label||b.name)))}else{let inn=state.schedule[ph.inning]||{pos:{}};let rev={};Object.entries(inn.pos||{}).forEach(([id,po])=>rev[po]=id);['L1','L2','AC','1B','2B','3B'].forEach(po=>lines.push(po+': '+pname(rev[po])+(po==='L1'||po==='L2'?' 🧢':'')));let bench=a.filter(p=>!inn.pos[p.id]).map(playerLabel);lines.push('Banc: '+(bench.length?bench.join(', '):'-'))}});lines.push('');lines.push('⚾ CoachRally • coachrally.app');lines.push(exportShareUrl());return lines.join('\n')}
function renderFanMessagePreview(){let box=$('#fanMessagePreview');if(!box)return;let html=renderMiniMarkdownHtml(state.fanMessage||'');box.classList.toggle('hide',!html);box.innerHTML=html?'<strong>Aperçu</strong>'+html:''}
function showMiniTextPreview(){let actions=modalShell('Texte du match','Ajuste le texte au besoin avant de le copier.');let box=document.createElement('div');box.className='textPreviewBox';box.innerHTML='<textarea id="textPreview" aria-label="Aperçu texte à copier"></textarea><div class="row"><button class="btn brandBtn" id="copyTextPreviewBtn" type="button">Copier le texte</button><button class="btn secondary" type="button" data-close-text>Fermer</button></div>';actions.appendChild(box);let area=$('#textPreview');area.value=miniPrinterText();$('#copyTextPreviewBtn').onclick=copyMiniText;$('[data-close-text]').onclick=closeModal;setTimeout(()=>area.focus(),0)}
function copyMiniText(){let area=$('#textPreview'),text=area?area.value:miniPrinterText();navigator.clipboard?.writeText(text).then(()=>modal('Texte copié','Le format texte est prêt à coller dans Funny Print ou une autre application.')).catch(()=>fallbackCopy(text))}
function openPrint(html){let w=window.open('','_blank');if(!w){modal('Fenêtre bloquée','Autorise les fenêtres surgissantes pour ouvrir la page prête à imprimer.');return}w.document.open();w.document.write(html);w.document.close()}
function downloadFile(name,content,type){downloadBlob(name,new Blob([content],{type:type||'text/plain'}))}
function downloadBlob(name,blob){let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function exampleNames(){return[{name:'Marquis Grissom',number:'9'},{name:'Cliff Floyd',number:'30'},{name:'Moisés Alou',number:'18'},{name:'Larry Walker',number:'33'},{name:'Wil Cordero',number:'12'},{name:'Darrin Fletcher',number:'24'},{name:'Mike Lansing',number:'3'},{name:'Sean Berry',number:'5'},{name:'Pedro Martinez',number:'45'},{name:'Ken Hill',number:'44'}]}
function loadExampleTeam(){state=defaults();let t=blankTeam();t.name='Expos de Montréal';t.roster=exampleNames().map(p=>({id:uid(),name:p.name,number:p.number,on:true}));state.teams=[t];state.activeTeamId=t.id;state.route='accueil';syncActiveTeamAliases();state.team=t.name;save();location.hash='#accueil';renderAll()}
function createMatchSnapshot(){
  let ids=new Set(state.players.map(p=>p.id));
  return normalizeArchive({id:uid(),schemaVersion:1,type:'match',completedAt:new Date().toISOString(),match:{team:state.team,opp:state.opp,date:state.date,time:state.time,place:state.place,fanMessage:cleanFanMessage(state.fanMessage),side:state.side},fixed:state.fixed,innings:state.innings,players:state.players.map(p=>({id:p.id,name:p.name,number:p.number||'',on:p.on!==false})),order:state.order.filter(id=>ids.has(id)),schedule:state.schedule.slice(0,state.innings).map(inn=>({pos:Object.assign({},inn.pos||{})})),battingOrders:JSON.parse(JSON.stringify(state.battingOrders||{})),locks:JSON.parse(JSON.stringify(state.locks||{innings:{},halves:{}}))})
}
function archiveToReadonlyState(archive){
  if(!archive||archive.schemaVersion!==1)return null;
  return Object.assign(defaults(),{team:archive.match.team,opp:archive.match.opp,date:archive.match.date,time:archive.match.time,place:archive.match.place,fanMessage:cleanFanMessage(archive.match.fanMessage),side:archive.match.side,fixed:archive.fixed,innings:archive.innings,players:archive.players.map(p=>({id:p.id,name:p.name,number:p.number||'',on:p.on!==false})),order:archive.order.slice(),schedule:archive.schedule.map(inn=>({pos:Object.assign({},inn.pos||{})})),battingOrders:JSON.parse(JSON.stringify(archive.battingOrders||{})),locks:JSON.parse(JSON.stringify(archive.locks||{innings:{},halves:{}})),started:true,route:'archives'})
}
function withArchiveState(archive,fn){let saved=state;let readonly=archiveToReadonlyState(archive);if(!readonly)return null;state=readonly;try{return fn()}finally{state=saved}}
function archiveTitle(a){return (a.date?formatDate(a.date):a.match?.date?formatDate(a.match.date):'Date inconnue')+' • '+(a.match?.team||a.team||'Équipe')+(a.match?.opp||a.opp?' vs '+(a.match?.opp||a.opp):'')}
function archiveCurrentMatch(){let m=activeMatch();if(m){m.status='archived';m.started=true;state.started=true;save()}}
async function closeCurrentMatch(archive){let m=activeMatch();if(m){m.status=archive?'archived':'completed';m.started=true;captureActiveMatch();if(m.cloud?.publicId)await savePublicMatch(true).catch(()=>{});if(archive&&m.cloud?.matchId)await saveLocalMatchCloud(m).catch(()=>{});if(cloud.teamPublicId&&m.cloud?.publicId)await savePublicTeam(true).catch(()=>{})}state.activeMatchId=null;cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';exposeMatch(null);optimizeDirty=true;lineupAutoDirty=false;addPlayersExpanded=false;save();location.hash='#accueil';renderAll()}
function promptFinishMatch(){modal('Match terminé','Que veux-tu faire avec ce match? L’équipe et les joueurs resteront en mémoire dans les deux cas.',[{label:'Archiver et retourner à l’accueil',kind:'brandBtn',onClick:()=>closeCurrentMatch(true)},{label:'Terminer sans archiver',kind:'secondary',onClick:()=>closeCurrentMatch(false)}])}
function createNewMatchFromTeam(){captureActiveMatch();let t=activeTeam(),roster=normalizePlayers(state.roster),team=String(t?.name||state.team||'').trim();if(!team||!roster.length){modal('Équipe requise','Définis le nom de l’équipe et ajoute les joueurs avant de préparer un match.');location.hash='#accueil';return}let players=roster.map((p,i)=>({id:p.id,name:p.name,number:p.number||'',on:i<MAX})),m=normalizeMatch({teamId:t.id,team,players,order:players.map(p=>p.id),date:'',time:'',place:'',opp:''},roster);state.matches.unshift(m);state.activeMatchId=m.id;exposeMatch(m);cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';optimizeDirty=true;lineupAutoDirty=true;addPlayersExpanded=false;save();location.hash='#match';renderAll()}
function newMatchFromTeam(){createNewMatchFromTeam()}
function resetAll(){let publicIds=state.matches.map(m=>m.cloud?.publicId).filter(Boolean),matchIds=state.matches.map(m=>m.cloud?.matchId).filter(Boolean),privateTeamIds=state.teams.filter(t=>t.cloud?.enabled).map(t=>t.id),teamPublicIds=state.teams.map(t=>t.publicId).filter(Boolean),mod=cloud.module,user=cloud.user;if(cloud.unsubMatch){cloud.unsubMatch();cloud.unsubMatch=null}stopPrivateTeamListener();if(cloud.unsubPublic){cloud.unsubPublic();cloud.unsubPublic=null}if(cloud.unsubPublicTeam){cloud.unsubPublicTeam();cloud.unsubPublicTeam=null}cloud.matchId=null;cloud.publicId=null;cloud.publicPassword='';cloud.teamPublicId=null;cloud.teamPublicPassword='';cloud.publicView=null;cloud.publicIdRoute=null;cloud.publicTeamView=null;cloud.publicTeamRoute=null;localStorage.removeItem(KEY);state=defaults();optimizeDirty=true;lineupAutoDirty=false;addPlayersExpanded=false;location.hash='#accueil';renderAll();if(user&&mod){publicIds.forEach(id=>mod.deletePublic(id).catch(()=>{}));matchIds.forEach(id=>mod.deleteMatch(id).catch(()=>{}));privateTeamIds.forEach(id=>mod.deleteTeam(id).catch(()=>{}));teamPublicIds.forEach(id=>mod.deletePublicTeam(id).catch(()=>{}))}}
function bind(){
  window.addEventListener('hashchange',()=>route());
  window.addEventListener('online',()=>{if(state.route==='banc'&&cloud.publicView)renderYoungBench(cloud.publicIdRoute==='local'?'local':'connected')});
  window.addEventListener('offline',()=>{if(state.route==='banc'&&cloud.publicView)renderYoungBench(cloud.publicIdRoute==='local'?'local':'offline')});
  $$('[data-nav],[data-step]').forEach(a=>a.addEventListener('click',()=>{let target=a.dataset.nav||a.dataset.step;if(target===state.route)setTimeout(()=>window.scrollTo({top:0,left:0,behavior:'auto'}),0)}));
  ['opp','date','timeHour','timeMinute','place','fanMessage','innings','fixed'].forEach(id=>{let el=$('#'+id);if(el)el.addEventListener('input',()=>{updateFromInputs();renderAll()})});
  let teamMetric=$('#teamMetric');if(teamMetric)teamMetric.onclick=promptChangeTeam;let changeTeam=$('#changeTeamBtn');if(changeTeam)changeTeam.onclick=promptChangeTeam;
  let deleteTeam=$('#deleteTeamBtn');if(deleteTeam)deleteTeam.onclick=deleteActiveTeam;
  let teamPublicLink=$('#teamPublicLinkBtn');if(teamPublicLink)teamPublicLink.onclick=openTeamPublicLinkModal;
  let teamTitle=$('#teamHomeTitle');if(teamTitle)teamTitle.addEventListener('change',()=>{if(isMatchInProgress())return;renameActiveTeam(teamTitle.value)});
  let teamPublicSlug=$('#teamPublicSlug');if(teamPublicSlug){teamPublicSlug.addEventListener('input',()=>{let t=activeTeam();if(!t||cloud.teamPublicId)return;t.publicSlug=normalizeTeamPublicIdDraft(teamPublicSlug.value);teamPublicSlug.value=t.publicSlug;persistStateOnly();renderInputs()})}
  let addTeam=$('#addTeamNames');if(addTeam)addTeam.onclick=promptAddRosterPlayers;
  let addFromMatch=$('#addPlayerToTeamFromMatchBtn');if(addFromMatch)addFromMatch.onclick=promptAddPlayerToTeamFromMatch;
  let newMatchFromList=$('#newMatchFromListBtn');if(newMatchFromList)newMatchFromList.onclick=newMatchFromTeam;
  ['matchesMetric'].forEach(id=>{let metric=$('#'+id);if(metric)metric.onclick=()=>{if(metric.dataset.href)location.hash=metric.dataset.href}});
  let swap=$('#swapSidesBtn');if(swap)swap.onclick=()=>{if(isMatchStarted())return;state.side=state.side==='locale'?'visiteur':'locale';markDirty();save();renderAll()};
  $('#regenBtn').onclick=generateAll;
  let shuffle=$('#shuffleOrderBtn');if(shuffle)shuffle.onclick=shuffleBattingOrder;
  let ready=$('#readyToPlayBtn');if(ready)ready.onclick=markReadyToPlay;
  $$('[data-play-view]').forEach(b=>b.onclick=()=>setPlayView(b.dataset.playView));
  let startMatch=$('#startMatchBtn');if(startMatch)startMatch.onclick=requestStartPlay;
  let advance=$('#advanceHalfBtn'),change=$('#lineupChangeBtn');if(advance)advance.onclick=advancePlay;if(change)change.onclick=promptLineupPlayerChange;
  let coachAdvance=$('#coachAdvanceBtn'),coachChange=$('#coachChangeBtn');if(coachAdvance)coachAdvance.onclick=advancePlay;if(coachChange)coachChange.onclick=promptLineupPlayerChange;
  let coachStatus=$('#coachMatchStatus');if(coachStatus)coachStatus.onclick=showCoachCurrentHalf;
  let shareStep=$('#shareStepBtn');if(shareStep)shareStep.onclick=openMatchShareModal;
  let lineup=$('#lineup');if(lineup){let start=()=>{lineupScrollInteracting=true};lineup.addEventListener('touchstart',start,{passive:true});lineup.addEventListener('pointerdown',start);lineup.addEventListener('scroll',()=>{if(!lineupScrollInteracting||lineupScrollHintDismissed)return;lineupScrollHintDismissed=true;$('#lineupScrollHint')?.classList.remove('show')},{passive:true});window.addEventListener('pointerup',()=>{lineupScrollInteracting=false})}
  let contact=$('#contactFrancois');if(contact){let address=['francois','coachrally.app'].join('@');contact.href='mailto:'+address;contact.setAttribute('aria-label','Écrire à François par courriel')}
  let copyText=$('#copyTextBtn');if(copyText)copyText.onclick=showMiniTextPreview;let copyTextPreview=$('#copyTextPreviewBtn');if(copyTextPreview)copyTextPreview.onclick=copyMiniText;let printBtn=$('#printCoachBtn');if(printBtn)printBtn.onclick=printCoach;let parentBtn=$('#parentImageBtn');if(parentBtn)parentBtn.onclick=exportParentImage;
  let publishTeam=$('#publishTeamPublicBtn');if(publishTeam)publishTeam.onclick=publishPublicTeam;
  let copyTeam=$('#copyTeamPublicLinkBtn');if(copyTeam)copyTeam.onclick=()=>copyTextToClipboard(cloudTeamUrl(),'Lien d’équipe non disponible',true);
  let unpublishTeam=$('#unpublishTeamPublicBtn');if(unpublishTeam)unpublishTeam.onclick=()=>confirmModal('Retirer le lien d’équipe','Retirer ce lien permanent? Les liens de match déjà créés resteront actifs.',unpublishPublicTeam);
  let teamPublicPassword=$('#teamPublicPassword');if(teamPublicPassword)teamPublicPassword.oninput=()=>{let t=activeTeam();if(!t)return;cloud.teamPublicPassword=teamPublicPassword.value;t.publicPassword=teamPublicPassword.value;persistStateOnly();renderCloudUi()};
  let publish=$('#publishPublicBtn');if(publish)publish.onclick=publishPublicMatch;
  let copyPublic=$('#copyPublicLinkBtn');if(copyPublic)copyPublic.onclick=()=>copyTextToClipboard(cloudPublicUrl(),'Lien public non disponible',true);
  let unpublish=$('#unpublishPublicBtn');if(unpublish)unpublish.onclick=()=>confirmModal('Retirer le lien','Retirer ce lien? Il ne fonctionnera plus.',unpublishPublicMatch);
  let publicPassword=$('#publicPassword');if(publicPassword)publicPassword.oninput=()=>{cloud.publicPassword=publicPassword.value;persistCloudRefs();renderCloudUi()};
  $('#matchPrev').onclick=()=>setMatchIndex(matchIndex-1);let currentMatchBtn=$('#matchCurrent');if(currentMatchBtn)currentMatchBtn.onclick=()=>{spectatorTouched=false;cloud.publicUpdateAvailable=false;setMatchIndex(cloud.publicView?publicCurrentStepIndex(cloud.publicView):currentPlayIndex())};$('#matchNext').onclick=()=>setMatchIndex(matchIndex+1);
  $('#hamb').onclick=e=>{e.stopPropagation();toggleMainMenu()};
  document.addEventListener('click',e=>{let nav=$('#nav'),hamb=$('#hamb');if(nav&&hamb&&!nav.contains(e.target)&&!hamb.contains(e.target))closeMainMenu()});
  $('#resetBtn').onclick=()=>confirmModal('Réinitialiser','Toutes tes équipes, joueurs et matchs seront supprimés pour toujours. Continuer?',resetAll);
  document.addEventListener('keydown',e=>{if(state.route==='spectateur'){if(e.key==='ArrowRight')setMatchIndex(matchIndex+1);if(e.key==='ArrowLeft')setMatchIndex(matchIndex-1)}});
  $('#matchCard').addEventListener('touchstart',e=>{touchStartX=e.touches[0].clientX},{passive:true});
  $('#matchCard').addEventListener('touchend',e=>{let dx=e.changedTouches[0].clientX-touchStartX;if(Math.abs(dx)>45)setMatchIndex(matchIndex+(dx<0?1:-1))},{passive:true});
  let coachHalf=$('#coachCurrentHalf');if(coachHalf){coachHalf.addEventListener('touchstart',e=>{coachTouchStartX=e.touches[0].clientX},{passive:true});coachHalf.addEventListener('touchend',e=>{let dx=e.changedTouches[0].clientX-coachTouchStartX;if(Math.abs(dx)>45)setCoachMatchIndex(coachMatchIndex+(dx<0?1:-1))},{passive:true})}
  $('#modalOverlay').addEventListener('click',e=>{if(e.target.id==='modalOverlay')closeModal()});
}
initCloudFromState();lineupAutoDirty=savedLineupNeedsAutoOptimize();populateTimeOptions();bind();ensureSchedule();renderAll();startCloud();if(!location.hash)location.hash='#accueil';
})();
