const test = require('node:test');
const assert = require('node:assert/strict');
const batting = require('../batting-order.js');

function inning(order, rotation, pending = rotation.pending, rotateSix = true) {
  return batting.buildInning({ order, rotationOrder: rotation.order, nextId: rotation.nextId, pending, rotateSix });
}

test('décale le premier frappeur à chaque manche avec exactement six joueurs', () => {
  const order = ['1', '2', '3', '4', '5', '6'];
  const first = inning(order, { nextId: '1', pending: [] });
  const second = inning(order, first);
  assert.deepEqual(first.ids, order);
  assert.deepEqual(second.ids, ['2', '3', '4', '5', '6', '1']);
});

test('conserve le comportement actuel à six joueurs lorsque la rotation est désactivée', () => {
  const order = ['1', '2', '3', '4', '5', '6'];
  const first = inning(order, { nextId: '1', pending: [] }, [], false);
  const second = inning(order, first, [], false);
  assert.deepEqual(first.ids, order);
  assert.deepEqual(second.ids, order);
});

test('donne la priorité au joueur ajouté puis reprend au prochain frappeur attendu', () => {
  const six = ['1', '2', '3', '4', '5', '6'];
  const first = inning(six, { nextId: '1', pending: [] });
  const second = inning([...six, '7'], first, ['7']);
  const third = inning([...six, '7'], second);
  assert.deepEqual(second.ids, ['7', '2', '3', '4', '5', '6']);
  assert.deepEqual(third.ids, ['1', '7', '2', '3', '4', '5']);
});

test('place plusieurs joueurs ajoutés dans leur ordre d’ajout sans doublon', () => {
  const result = inning(['1', '2', '3', '4', '5', '6', '7', '8'], { nextId: '2', pending: ['7', '8'] });
  assert.deepEqual(result.ids, ['7', '8', '2', '3', '4', '5']);
  assert.equal(new Set(result.ids).size, result.ids.length);
});

test('saute le prochain frappeur lorsqu’il est retiré', () => {
  const order = ['1', '2', '3', '4', '5', '6', '7'];
  const rotation = batting.removePlayer({ nextId: '7', pending: [] }, '7', order);
  const result = inning(order.filter(id => id !== '7'), rotation);
  assert.equal(result.ids[0], '1');
});

test('retire un joueur ajouté de la priorité avant sa première manche', () => {
  const order = ['1', '2', '3', '4', '5', '6', '7'];
  const rotation = batting.removePlayer({ nextId: '2', pending: ['7'] }, '7', order);
  const result = inning(order.filter(id => id !== '7'), rotation);
  assert.deepEqual(rotation.pending, []);
  assert.equal(result.ids[0], '2');
});

test('préserve la continuité lors du retour de sept à six joueurs', () => {
  const order = ['1', '2', '3', '4', '5', '6', '7'];
  const first = inning(order, { nextId: '1', pending: [] });
  const rotation = batting.removePlayer(first, '7', order);
  const second = inning(order.filter(id => id !== '7'), rotation);
  assert.equal(first.nextId, '7');
  assert.equal(second.ids[0], '1');
});
