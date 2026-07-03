const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/load-browser-module');
const engine = load(['rules.js', 'lineup-engine.js'], 'RallyeCapLineupEngine');

const playerIds = Array.from({length: 10}, (_, index) => `p${index + 1}`);
const batterIdsByInning = Array.from({length: 4}, (_, inning) =>
  Array.from({length: 6}, (_, offset) => playerIds[(inning * 6 + offset) % playerIds.length])
);

test('génère toutes les manches avec six positions uniques', () => {
  const schedule = engine.generateSchedule({playerIds, innings: 4, fixed: true, batterIdsByInning});
  assert.equal(schedule.length, 4);
  schedule.forEach(inning => {
    assert.equal(Object.keys(inning.pos).length, 6);
    assert.deepEqual(new Set(Object.values(inning.pos)), new Set(['1B','2B','3B','AC','L1','L2']));
  });
});

test('évite deux bancs et deux présences comme lanceur consécutifs', () => {
  const schedule = engine.generateSchedule({playerIds, innings: 4, fixed: true, batterIdsByInning});
  for(let index=1;index<schedule.length;index++){
    const previous=schedule[index-1].pos,current=schedule[index].pos;
    assert.equal(playerIds.some(id=>!previous[id]&&!current[id]),false);
    assert.equal(playerIds.some(id=>['L1','L2'].includes(previous[id])&&['L1','L2'].includes(current[id])),false);
  }
});

test('génère une manche supplémentaire à partir de l’historique fourni', () => {
  const prior = engine.generateSchedule({playerIds, innings: 3, fixed: true, batterIdsByInning});
  const inning = engine.generateInning({playerIds, inning: 3, priorSchedule: prior, fixed: true, batterIdsByInning});
  assert.equal(Object.keys(inning.pos).length, 6);
  assert.deepEqual(new Set(Object.values(inning.pos)), new Set(['1B','2B','3B','AC','L1','L2']));
});
