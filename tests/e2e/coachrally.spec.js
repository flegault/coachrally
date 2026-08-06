const { test, expect } = require('@playwright/test');

async function createExampleMatch(page) {
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.getByRole('button', { name: 'Préparer un match' }).click();
  await page.locator('#opp').fill('Aigles de Québec');
  await page.locator('[data-step="joueurs"]').click();
  await page.locator('#toAlign').click();
}

async function startExampleMatch(page) {
  await createExampleMatch(page);
  await page.locator('#readyToPlayBtn').click();
  const warning = page.getByRole('button', { name: 'Confirmer' });
  if (await warning.isVisible()) await warning.click();
  await page.locator('#startMatchBtn').click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
}

async function createMatchWithPlayerCount(page, count) {
  await createExampleMatch(page);
  await page.locator('[data-step="joueurs"]').click();
  const active = page.locator('[data-toggle][aria-pressed="true"]');
  while (await active.count() > count) await active.last().click();
  await page.locator('#toAlign').click();
}

async function startPreparedMatch(page) {
  await page.goto('/#alignement');
  await page.locator('#readyToPlayBtn').click();
  const warning = page.getByRole('button', { name: 'Confirmer' });
  if (await warning.isVisible()) await warning.click();
  await page.locator('#startMatchBtn').click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
}

async function storedMatch(page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rallye_cap_qc_v5'));
    return state.matches.find(match => match.id === state.activeMatchId);
  });
}

async function storedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('rallye_cap_qc_v5')));
}

async function mockFirebase(page, publicPayload = null) {
  await page.addInitScript(payload => { window.__TEST_PUBLIC_PAYLOAD__ = payload; }, publicPayload);
  await page.route('**/firebase-sync.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      export async function onAuth(callback) { await callback({ uid: 'test-coach' }); return () => {}; }
      export async function listTeams() { return []; }
      export async function listMatches() { return []; }
      export async function listPublicTeams() { return []; }
      export async function listenTeam() { return () => {}; }
      export async function listenMatch() { return () => {}; }
      export async function listenPublic(id, callback) { await callback({ payload: window.__TEST_PUBLIC_PAYLOAD__ }); return () => {}; }
      export async function listenPublicTeam(id, callback) { await callback({ payload: window.__TEST_PUBLIC_PAYLOAD__ }); return () => {}; }
      export async function publishPublic(id, matchId, payload) { window.__PUBLISHED_PAYLOAD__ = payload; return id || 'match-public-test'; }
      export async function saveMatch(id) { return id || 'match-cloud-test'; }
      export async function publishPublicTeam(id) { return id || 'team-public-test'; }
      export async function saveTeam(id) { return id; }
      export async function deletePublic() {}
      export async function deletePublicTeam() {}
      export async function deleteMatch() {}
      export async function deleteTeam() {}
    `
  }));
}

test('charge l’accueil en UTF-8 sans erreur et conserve les données', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#accueil');
  await expect(page.getByRole('heading', { name: /alignement facile et clair/ })).toBeVisible();
  await expect(page.locator('a[href="#a-propos"]')).toHaveText('À propos');

  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.locator('#teamHomeTitle')).toHaveValue('Expos de Montréal');
  await expect(page.locator('#teamPlayerCount')).toContainText('10 joueurs');
  await page.reload();
  await expect(page.locator('#teamHomeTitle')).toHaveValue('Expos de Montréal');
  expect(errors).toEqual([]);
});

test('crée réellement une équipe et ajoute ses joueurs', async ({ page }) => {
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe', exact: true }).click();
  await page.locator('#newTeamNameInput').fill('Étoiles de Québec');
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter des joueurs' }).click();
  await page.locator('#addPlayersModalNames').fill('Émile, Léa, Noah, Zoé, Félix, Anaïs');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('#teamPlayerCount')).toContainText('6 joueurs');
  await expect(page.locator('[data-team-rename]')).toHaveCount(6);
});

test('synchronise un nouveau joueur absent avec le match puis l’intègre à l’alignement', async ({ page }) => {
  await createExampleMatch(page);
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Ajouter des joueurs' }).click();
  await page.locator('#addPlayersModalNames').fill('#42 Raphaël Test');
  await page.getByRole('button', { name: 'Continuer' }).click();

  const afterAdd = await storedState(page);
  const rosterPlayer = afterAdd.teams.find(team => team.id === afterAdd.activeTeamId).roster.find(player => player.name === 'Raphaël Test');
  let match = afterAdd.matches.find(item => item.id === afterAdd.activeMatchId);
  let matchPlayer = match.players.find(player => player.id === rosterPlayer.id);
  expect(matchPlayer).toMatchObject({ name: 'Raphaël Test', number: '42', on: false });
  expect(match.order.at(-1)).toBe(rosterPlayer.id);
  expect(match.schedule.every(inning => !inning.pos[rosterPlayer.id])).toBe(true);

  await page.locator(`[data-team-rename="${rosterPlayer.id}"]`).fill('Raphaël Tremblay');
  await page.locator(`[data-team-rename="${rosterPlayer.id}"]`).press('Tab');
  await page.locator(`[data-team-number="${rosterPlayer.id}"]`).fill('27');
  await page.locator(`[data-team-number="${rosterPlayer.id}"]`).press('Tab');
  match = await storedMatch(page);
  matchPlayer = match.players.find(player => player.id === rosterPlayer.id);
  expect(matchPlayer).toMatchObject({ name: 'Raphaël Tremblay', number: '27', on: false });

  await page.goto('/#joueurs');
  const playerToggle = page.locator(`[data-toggle="${rosterPlayer.id}"]`);
  await expect(playerToggle).toHaveAttribute('aria-pressed', 'false');
  await playerToggle.click();
  await expect(playerToggle).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#toAlign').click();

  match = await storedMatch(page);
  matchPlayer = match.players.find(player => player.id === rosterPlayer.id);
  expect(matchPlayer.on).toBe(true);
  expect(match.order).toContain(rosterPlayer.id);
  expect(match.schedule).toHaveLength(match.innings);
  expect(match.schedule.every(inning => Object.keys(inning.pos).length === 6)).toBe(true);
  expect(match.schedule.some(inning => inning.pos[rosterPlayer.id])).toBe(true);
  await expect(page.locator(`[data-row="${rosterPlayer.id}"]`)).toContainText('Raphaël Tremblay');
  await expect(page.locator(`[data-row="${rosterPlayer.id}"]`)).toContainText('#27');
});

test('prépare, démarre et fait progresser un match', async ({ page }) => {
  await createExampleMatch(page);
  await page.goto('/#match');
  await page.locator('#opp').fill('Aigles de Québec');
  await page.locator('#date').fill('2026-07-04');
  await page.locator('#place').fill('Parc central');
  await page.locator('[data-step="joueurs"]').click();
  await expect(page.locator('#activeCountTag')).toContainText('10 présents');
  await page.locator('#toAlign').click();
  await expect(page.locator('#readyToPlayBtn')).toBeEnabled();
  await page.locator('#readyToPlayBtn').click();
  const warning = page.getByRole('button', { name: 'Confirmer' });
  if (await warning.isVisible()) await warning.click();
  await expect(page).toHaveURL(/#jouer$/);
  await page.locator('#startMatchBtn').click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.locator('#topMatchStatus')).toContainText('En cours');
  await page.locator('#advanceHalfBtn').click();
  await expect(page.locator('#advanceHalfBtn')).toContainText('Terminer fin de 1re');
  await page.goto('/#alignement');
  await expect(page.locator('#validations')).toContainText('lecture seule');
  await expect(page.locator('#regenBtn')).toBeHidden();
  await page.reload();
  await expect(page.locator('#topMatchStatus')).toContainText('En cours');
});

test('compte présents les joueurs sans champ on explicite', async ({ page }) => {
  await createExampleMatch(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rallye_cap_qc_v5'));
    const match = state.matches.find(item => item.id === state.activeMatchId);
    match.players.forEach(player => { delete player.on; });
    localStorage.setItem('rallye_cap_qc_v5', JSON.stringify(state));
  });
  await page.goto('/#joueurs');
  await expect(page.locator('#activeCountTag')).toContainText('10 présents');
  await expect(page.locator('[data-toggle][aria-pressed="true"]')).toHaveCount(10);
});

test('génère un alignement qui respecte les invariants obligatoires', async ({ page }) => {
  await createExampleMatch(page);
  const match = await storedMatch(page);
  const positions = ['1B', '2B', '3B', 'AC', 'L1', 'L2'];
  const playerIds = match.players.filter(player => player.on).map(player => player.id);
  const firstBaseCounts = new Map();

  expect(match.schedule).toHaveLength(match.innings);
  for (const [index, inning] of match.schedule.entries()) {
    const assignments = Object.entries(inning.pos);
    expect(assignments).toHaveLength(6);
    expect(new Set(assignments.map(([, position]) => position))).toEqual(new Set(positions));
    expect(assignments.every(([id]) => playerIds.includes(id))).toBe(true);

    const bench = playerIds.filter(id => !inning.pos[id]);
    const pitchers = playerIds.filter(id => ['L1', 'L2'].includes(inning.pos[id]));
    if (index > 0) {
      const previous = match.schedule[index - 1];
      expect(bench.some(id => !previous.pos[id])).toBe(false);
      expect(pitchers.some(id => ['L1', 'L2'].includes(previous.pos[id]))).toBe(false);
    }
    assignments.filter(([, position]) => position === '1B').forEach(([id]) => firstBaseCounts.set(id, (firstBaseCounts.get(id) || 0) + 1));
  }
  expect([...firstBaseCounts.values()].every(count => count <= 1)).toBe(true);
});

test('active par défaut la rotation à six joueurs et verrouille le toggle au début du match', async ({ page }) => {
  await createMatchWithPlayerCount(page, 6);
  await page.goto('/#match');
  await expect(page.locator('#rotateSixBatting')).toBeChecked();
  await expect(page.locator('#rotateSixBattingField')).not.toHaveClass(/inactive/);
  await page.locator('#fixed').locator('..').click();
  await expect(page.locator('#rotateSixBatting')).toBeDisabled();
  await expect(page.locator('#rotateSixBattingField')).toHaveClass(/inactive/);
  await page.locator('#fixed').locator('..').click();
  await expect(page.locator('#rotateSixBatting')).toBeEnabled();

  const layout = await page.evaluate(() => {
    const place = document.querySelector('#place').closest('label').getBoundingClientRect();
    const innings = document.querySelector('#innings').closest('label').getBoundingClientRect();
    const fixed = document.querySelector('#fixed').closest('.fixedField').getBoundingClientRect();
    const rotate = document.querySelector('#rotateSixBatting').closest('.fixedField').getBoundingClientRect();
    const descriptions = [...document.querySelectorAll('.matchSwitch .tiny')];
    return {
      wide: innerWidth > 920,
      placeTop: Math.round(place.top),
      inningsTop: Math.round(innings.top),
      fixedTop: Math.round(fixed.top),
      rotateTop: Math.round(rotate.top),
      descriptionsFit: descriptions.every(node => node.scrollWidth <= node.clientWidth + 1),
      whiteSpaces: descriptions.map(node => getComputedStyle(node).whiteSpace)
    };
  });
  expect(layout.descriptionsFit).toBe(true);
  expect(layout.whiteSpaces.every(value => value === 'normal')).toBe(true);
  if (layout.wide) {
    expect(layout.inningsTop).toBe(layout.placeTop);
    expect(layout.rotateTop).toBe(layout.fixedTop);
  } else {
    expect(layout.inningsTop).toBeGreaterThan(layout.placeTop);
    expect(layout.rotateTop).toBeGreaterThan(layout.fixedTop);
  }

  await startPreparedMatch(page);
  await page.goto('/#match');
  await expect(page.locator('#rotateSixBatting')).toBeDisabled();
  await page.goto('/#jouer');

  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();

  const match = await storedMatch(page);
  const first = match.battingOrders['0:debut'];
  const second = match.battingOrders['1:debut'];
  expect(first).toHaveLength(6);
  expect(second).toEqual(first.slice(1).concat(first[0]));
});

test('présente les avertissements corrigeables en liste avec la question séparée', async ({ page }) => {
  await createExampleMatch(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rallye_cap_qc_v5'));
    const match = state.matches.find(item => item.id === state.activeMatchId);
    const firstBase0 = Object.keys(match.schedule[0].pos).find(id => match.schedule[0].pos[id] === '1B');
    const firstBase1 = Object.keys(match.schedule[1].pos).find(id => match.schedule[1].pos[id] === '1B');
    const oldPosition = match.schedule[1].pos[firstBase0];
    match.schedule[1].pos[firstBase0] = '1B';
    match.schedule[1].pos[firstBase1] = oldPosition;
    localStorage.setItem('rallye_cap_qc_v5', JSON.stringify(state));
  });
  await page.reload();
  await page.locator('#readyToPlayBtn').click();

  await expect(page.locator('#modalTitle')).toHaveText('Avertissements à vérifier');
  await expect(page.locator('#modalText li').first()).toHaveText('Un joueur joue 1B plus d’une fois.');
  await expect(page.locator('#modalText > p')).toHaveText('Veux-tu tout de même commencer le match?');
});

test('ne bloque pas le départ pour une répétition au premier but mathématiquement nécessaire', async ({ page }) => {
  await createMatchWithPlayerCount(page, 6);
  await page.locator('[data-add-inning]').click();
  await page.locator('[data-add-inning]').click();
  await page.locator('[data-add-inning]').click();
  await expect(page.locator('#validations')).toContainText('une répétition est nécessaire avec 7 manches et 6 joueurs');
  await expect(page.locator('#validations')).not.toContainText('Un joueur joue 1B plus d’une fois.');
  await page.locator('#readyToPlayBtn').click();
  await expect(page).toHaveURL(/#jouer$/);
  await expect(page.locator('#modalTitle')).not.toHaveText('Avertissements à vérifier');
});

test('conserve le même premier frappeur à six lorsque la rotation est désactivée', async ({ page }) => {
  await createMatchWithPlayerCount(page, 6);
  await page.goto('/#match');
  await page.locator('#rotateSixBatting').locator('..').click();
  await expect(page.locator('#rotateSixBatting')).not.toBeChecked();
  await page.goto('/#alignement');
  await startPreparedMatch(page);

  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();

  const match = await storedMatch(page);
  expect(match.battingOrders['1:debut']).toEqual(match.battingOrders['0:debut']);
});

test('priorise un septième joueur puis reprend la rotation attendue sans doublon', async ({ page }) => {
  await createMatchWithPlayerCount(page, 6);
  await startPreparedMatch(page);
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();

  const before = await storedMatch(page);
  const expectedSecond = before.battingRotation.nextId;
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByRole('button', { name: /Début de 2e.*courante/ }).click();
  await page.locator('#addPlayersModalNames').fill('Camille Tremblay');
  await page.getByRole('button', { name: 'Continuer' }).click();
  const added = (await storedMatch(page)).players.find(player => player.name === 'Camille Tremblay');

  await page.locator('#advanceHalfBtn').click();
  const after = await storedMatch(page);
  const secondInning = after.battingOrders['1:debut'];
  expect(secondInning[0]).toBe(added.id);
  expect(secondInning[1]).toBe(expectedSecond);
  expect(new Set(secondInning).size).toBe(6);

  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();
  const thirdInning = (await storedMatch(page)).battingOrders['2:debut'];
  expect(thirdInning).toEqual([before.battingOrders['0:debut'][0], added.id, ...before.battingOrders['0:debut'].slice(1, 5)]);
});

test('saute le prochain frappeur retiré lors du passage de sept à six joueurs', async ({ page }) => {
  await createMatchWithPlayerCount(page, 7);
  await startPreparedMatch(page);
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#advanceHalfBtn').click();

  const before = await storedMatch(page);
  const removedId = before.battingRotation.nextId;
  const removed = before.players.find(player => player.id === removedId);
  const activeOrder = before.order.filter(id => before.players.find(player => player.id === id)?.on);
  const expectedFirst = activeOrder[(activeOrder.indexOf(removedId) + 1) % activeOrder.length];
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Retirer un joueur' }).click();
  await page.getByRole('button', { name: /Début de 2e.*courante/ }).click();
  await page.getByRole('button', { name: new RegExp(removed.name) }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.locator('#advanceHalfBtn').click();

  const after = await storedMatch(page);
  expect(after.battingOrders['1:debut'][0]).toBe(expectedFirst);
  expect(after.battingOrders['1:debut']).not.toContain(removedId);
});

test('ajoute un joueur en match commencé sans inventer ses positions futures', async ({ page }) => {
  await startExampleMatch(page);
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByRole('button', { name: /Début de 1re.*courante/ }).click();
  await page.locator('#addPlayersModalNames').fill('Camille Tremblay');
  await page.getByRole('button', { name: 'Continuer' }).click();

  const match = await storedMatch(page);
  const added = match.players.find(player => player.name === 'Camille Tremblay');
  expect(added.on).toBe(true);
  expect(match.order.at(-1)).toBe(added.id);
  expect(match.schedule.every(inning => !inning.pos[added.id])).toBe(true);
  await expect(page.locator('#lineup')).toContainText('Camille Tremblay');
});

test('remplace un joueur tout en conservant la demi-manche jouée', async ({ page }) => {
  await startExampleMatch(page);
  const before = await storedMatch(page);
  const replaced = before.players.find(player => player.name === 'Marquis Grissom');
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Remplacer un joueur' }).click();
  await page.getByRole('button', { name: /Fin de 1re.*courante/ }).click();
  await page.getByRole('button', { name: /Marquis Grissom/ }).click();
  await page.locator('#replacementName').fill('Alex Gagnon');
  await page.getByRole('button', { name: 'Utiliser ce nom' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();

  const after = await storedMatch(page);
  const replacement = after.players.find(player => player.name === 'Alex Gagnon');
  expect(after.players.find(player => player.id === replaced.id).on).toBe(false);
  expect(replacement.on).toBe(true);
  expect(after.battingOrders['0:debut']).toContain(replaced.id);
  expect(after.battingOrders['0:debut']).not.toContain(replacement.id);
  expect(after.order.indexOf(replacement.id)).toBe(after.order.indexOf(replaced.id) + 1);
  expect(after.schedule.slice(1).every(inning => !inning.pos[replaced.id])).toBe(true);
});

test('retire un joueur des défenses futures sans effacer son historique', async ({ page }) => {
  await startExampleMatch(page);
  const before = await storedMatch(page);
  const removed = before.players.find(player => player.name === 'Marquis Grissom');
  await page.locator('#advanceHalfBtn').click();
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Retirer un joueur' }).click();
  await page.getByRole('button', { name: /Fin de 1re.*courante/ }).click();
  await page.getByRole('button', { name: /Marquis Grissom/ }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();

  const after = await storedMatch(page);
  expect(after.players.find(player => player.id === removed.id).on).toBe(false);
  expect(after.battingOrders['0:debut']).toContain(removed.id);
  expect(after.schedule.every(inning => !inning.pos[removed.id])).toBe(true);
  await expect(page.locator('#playWarnings')).toContainText('Positions défensives à compléter');
});

test('exige un remplacement lorsqu’il reste exactement six joueurs', async ({ page }) => {
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.getByRole('button', { name: 'Préparer un match' }).click();
  await page.locator('[data-step="joueurs"]').click();
  for (const name of ['Mike Lansing', 'Sean Berry', 'Pedro Martinez', 'Ken Hill']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
  }
  await page.locator('#toAlign').click();
  await page.locator('#readyToPlayBtn').click();
  const warning = page.getByRole('button', { name: 'Confirmer' });
  if (await warning.isVisible()) await warning.click();
  await page.locator('#startMatchBtn').click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Retirer un joueur' }).click();
  await page.getByRole('button', { name: /Début de 1re.*courante/ }).click();
  await page.getByRole('button', { name: /Marquis Grissom/ }).click();

  await expect(page.locator('#modalTitle')).toHaveText('Remplacer Marquis Grissom');
  await expect(page.locator('#modalText')).toContainText('Il reste seulement 6 joueurs actifs');
  expect((await storedMatch(page)).players.filter(player => player.on)).toHaveLength(6);
});

test('refuse un ajout lorsque douze joueurs sont déjà actifs', async ({ page }) => {
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.getByRole('button', { name: 'Préparer un match' }).click();
  await page.locator('[data-step="joueurs"]').click();
  await page.locator('#addPlayerToTeamFromMatchBtn').click();
  await page.locator('#addPlayersModalNames').fill('Camille Tremblay, Alex Gagnon');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('#toAlign').click();
  await page.locator('#readyToPlayBtn').click();
  const warning = page.getByRole('button', { name: 'Confirmer' });
  if (await warning.isVisible()) await warning.click();
  await page.locator('#startMatchBtn').click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByRole('button', { name: /Début de 1re.*courante/ }).click();

  await expect(page.locator('#modalTitle')).toHaveText('Maximum atteint');
  await expect(page.locator('#modalText')).toContainText('12 joueurs actifs');
  expect((await storedMatch(page)).players.filter(player => player.on)).toHaveLength(12);
});

test('applique un changement futur et verrouille les demi-manches précédentes', async ({ page }) => {
  await startExampleMatch(page);
  await page.locator('#lineupChangeBtn').click();
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByRole('button', { name: /Début de 2e/ }).click();
  await expect(page.locator('#modalTitle')).toHaveText('Avancer la progression');
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.locator('#addPlayersModalNames').fill('Camille Tremblay');
  await page.getByRole('button', { name: 'Continuer' }).click();

  const match = await storedMatch(page);
  expect(match.locks.halves['0:debut']).toBe(true);
  expect(match.locks.halves['0:fin']).toBe(true);
  expect(match.locks.halves['1:debut']).not.toBe(true);
  await expect(page.locator('#advanceHalfBtn')).toContainText('Terminer début de 2e');
});

test('archive un match terminé et conserve l’équipe pour le suivant', async ({ page }) => {
  await startExampleMatch(page);
  const original = await storedState(page);
  const teamId = original.activeTeamId;
  const rosterNames = original.teams.find(team => team.id === teamId).roster.map(player => player.name);
  for (let index = 0; index < 8; index++) await page.locator('#advanceHalfBtn').click();
  await expect(page.locator('#modalTitle')).toHaveText('Match terminé');
  await page.getByRole('button', { name: 'Archiver et retourner à l’accueil' }).click();

  const after = await storedState(page);
  const archived = after.matches.find(match => match.teamId === teamId);
  expect(after.activeMatchId).toBeNull();
  expect(archived.status).toBe('archived');
  expect(after.teams.find(team => team.id === teamId).roster.map(player => player.name)).toEqual(rosterNames);
  await expect(page).toHaveURL(/#accueil$/);
  await expect(page.getByRole('button', { name: 'Préparer un match' })).toBeVisible();
});

test('génère un export Texte complet et modifiable', async ({ page }) => {
  await createExampleMatch(page);
  await page.locator('#shareStepBtn').click();
  await page.getByRole('button', { name: /^Texte/ }).click();
  const preview = page.locator('#textPreview');
  await expect(preview).toHaveValue(/Expos de Montréal \(VIS\)/);
  await expect(preview).toHaveValue(/vs Aigles de Québec \(LOC\)/);
  await expect(preview).toHaveValue(/DÉBUT DE 1RE - ATTAQUE/);
  await expect(preview).toHaveValue(/FIN DE 1RE - DEFENSE/);
  await expect(preview).toHaveValue(/Marquis Grissom/);
  await expect(preview).toHaveValue(/⚾ CoachRally • coachrally\.app/);
  await expect(preview).toHaveValue(/https:\/\/coachrally\.app\//);
  await preview.fill('Correction manuelle avant impression');
  await expect(preview).toHaveValue('Correction manuelle avant impression');
  expect((await storedMatch(page)).opp).toBe('Aigles de Québec');
});

test('ouvre un export Banc cohérent avec le match', async ({ page }) => {
  await createExampleMatch(page);
  await page.locator('#shareStepBtn').click();
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#modalActions').getByRole('button', { name: /^Banc/ }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.getByRole('heading', { name: 'Expos de Montréal vs Aigles de Québec' })).toBeVisible();
  await expect(popup.getByRole('columnheader', { name: 'Manche 1' })).toBeVisible();
  await expect(popup.getByRole('cell', { name: /Marquis Grissom/ }).first()).toBeVisible();
  await expect(popup.locator('body')).toContainText('CoachRally');
  await expect(popup.locator('body')).toContainText('coachrally.app');
  await popup.close();
});

test('télécharge le Programme avec un nom de fichier stable', async ({ page }) => {
  await createExampleMatch(page);
  await page.locator('#date').evaluate((element) => {
    element.value = '2026-07-04';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#shareStepBtn').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#modalActions').getByRole('button', { name: /^Programme/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('2026-07-04_expos-de-montreal_aigles-de-quebec.png');
  expect(await download.failure()).toBeNull();
});

test('masque l’alignement dans une projection publique non prête', async ({ page }) => {
  const payload = {
    team: 'Étoiles de Québec', opp: 'Aigles de Montréal', ready: false, started: false,
    currentIndex: 0, publicStage: 'programme', phases: [], programme: { players: [] }
  };
  await mockFirebase(page, payload);
  await page.goto('/#public/match-public-test');
  await expect(page.getByRole('heading', { name: 'Étoiles de Québec vs Aigles de Montréal' })).toBeVisible();
  await expect(page.locator('#matchCard')).toContainText('Alignement à venir');
  await expect(page.locator('[data-public-player]')).toHaveCount(0);
});

test('rend une projection spectateur et conserve les favoris localement', async ({ page }) => {
  const players = [
    { playerId: 'p1', rank: 1, name: 'Émile Tremblay', number: '27' },
    { playerId: 'p2', rank: 2, name: 'Zoé Gagnon', number: '8' }
  ];
  const payload = {
    team: 'Étoiles de Québec', opp: 'Aigles de Montréal', date: '2026-07-04', time: '10:30', place: 'Parc central',
    teamPublicId: 'etoiles-quebec', ready: true, started: false, currentIndex: 0, publicStage: 'ready',
    phases: [{ inning: 0, half: 'debut', label: 'Début de 1re', type: 'attaque', locked: false }],
    programme: { players }, battingOrder: players, batters: { 0: players }, defense: { 0: [] }
  };
  await mockFirebase(page, payload);
  await page.goto('/#public/match-public-test');
  await expect(page.getByRole('heading', { name: 'Étoiles de Québec vs Aigles de Montréal' })).toBeVisible();
  await expect(page.locator('#matchCard')).toContainText('Samedi 4 juillet 2026');
  const favorite = page.getByRole('button', { name: /Émile Tremblay/ });
  await favorite.click();
  await expect(favorite).toHaveClass(/favorite/);
  expect(await page.evaluate(() => localStorage.getItem('rallye_cap_public_favorite_players:etoiles-quebec'))).toBe('["p1"]');
  await page.reload();
  await expect(page.getByRole('button', { name: /Émile Tremblay/ })).toHaveClass(/favorite/);
});

test('explique que l’aperçu Banc local exige un match actif', async ({ page }) => {
  await page.goto('/#banc/local');
  await expect(page.getByRole('heading', { name: 'Aucun match actif' })).toBeVisible();
  await expect(page.locator('#youngBench')).toContainText('Prépare ou ouvre un match');
});

test('affiche le Banc local depuis le match courant sans Firebase', async ({ page }) => {
  await startExampleMatch(page);
  await page.goto('/#banc/local');
  await expect(page.locator('.benchHeader')).toContainText('Expos de Montréal');
  await expect(page.locator('.benchHeader small')).toHaveAttribute('aria-label', 'Aperçu local');
  await expect(page.getByRole('heading', { name: 'Maintenant' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ensuite' })).toBeVisible();
  await expect(page.locator('#youngBench')).toContainText('Début de 1re');
  await expect(page.locator('#youngBench')).toContainText('Fin de 1re');
});

test('la navigation mobile garde le workflow utilisable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.getByRole('button', { name: 'Préparer un match' }).click();
  await expect(page.locator('#view-match')).toBeVisible();
  await expect(page.locator('.steps')).toBeVisible();
  await page.locator('[data-step="joueurs"]').click();
  await expect(page).toHaveURL(/#joueurs$/);
});
