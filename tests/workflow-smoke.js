const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);

assert.strictEqual(new Set(ids).size, ids.length, 'Les IDs HTML doivent être uniques.');
assert.match(html, /href="#jouer" data-step="jouer"/);
assert.match(html, /id="readyToPlayBtn"/);
assert.match(html, /id="startMatchBtn"/);
assert.match(html, /<script src="lineup-engine\.js"><\/script>/);
assert.match(html, /id="timeHour"/);
assert.match(html, /id="timeMinute"/);
assert.doesNotMatch(html, /id="publishFromPlayBtn"|id="backToAlignBtn"|id="coachMatchMeta"/);
assert.doesNotMatch(html + app, /match-en-cours/);
assert.match(app, /\['draft','ready','active','completed','archived'\]/);
assert.match(app, /state\.route!==['"]jouer['"]/);
assert.match(app, /publicStage:ready\?'ready'/);
assert.match(app, /visible=state\.started===true\|\|ready/);
assert.match(app, /fanMessage:'Merci de nous encourager!'/);
assert.match(app, /state\.time=hour\?hour\+'\:'\+minute:''/);

const context = {window: {}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('rules.js', 'utf8'), context);
const rules = context.window.RallyeCapRules;
const players = ['1', '2', '3', '4', '5', '6'];
const schedule = [{pos: {1: '1B', 2: '2B', 3: '3B', 4: 'AC', 5: 'L1', 6: 'L2'}}];
assert.strictEqual(rules.startReadiness(schedule, players).ok, true);

const benchContext = {window: {}};
vm.createContext(benchContext);
vm.runInContext(fs.readFileSync('bench-view.js', 'utf8'), benchContext);
assert.strictEqual(benchContext.window.RallyeCapBench.buildModel({ready: true, started: false}).status, 'waiting');

assert.match(app, /🧢 🏏 🧤/);
assert.doesNotMatch(app, /<small>'\+esc\(code\)/);
assert.match(styles, /\.simplePlayRoute \.steps,\.simplePlayRoute \.playGateway\{display:none\}/);
assert.match(styles, /\.benchNow \.benchBatter/);
assert.match(styles, /\.benchNext \.benchBatter/);

console.log('Workflow smoke tests: OK');
