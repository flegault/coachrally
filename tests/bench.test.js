const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/load-browser-module');
const bench = load('bench-view.js', 'RallyeCapBench');

const players = Array.from({length:8}, (_,i) => ({playerId:'p'+(i+1),name:'Joueur '+(i+1),number:String(i+1)}));
const defense = ['L1','L2','AC','1B','2B','3B'].map((pos,i) => ({...players[i],pos:pos+(pos[0]==='L'?' 🧢':'')}));
const playing = {team:'Équipe',started:true,currentIndex:0,phases:[{inning:0,type:'defense'},{inning:0,type:'attaque'}],programme:{players},defense:{0:defense},batters:{0:players.slice(1,7).map((p,i)=>({...p,rank:i+1}))}};

test('construit les états attente, jeu et fin', () => {
  assert.equal(bench.buildModel({started:false}).status, 'waiting');
  assert.equal(bench.buildModel(playing).status, 'playing');
  assert.equal(bench.buildModel({...playing,currentIndex:2}).status, 'final');
});
test('sépare le banc courant du suivant', () => {
  const model = bench.buildModel(playing);
  assert.equal(model.currentBench.length, 2);
  assert.equal(model.nextBench.length, 2);
  assert.equal(model.currentBench[0].playerId, 'p7');
  assert.equal(model.nextBench[0].playerId, 'p1');
});
test('normalise les positions et stabilise les missions', () => {
  assert.equal(bench.positionCode('L1 🧢'), 'L1');
  assert.equal(bench.missionFor('p7',2,0), bench.missionFor('p7',2,0));
});
