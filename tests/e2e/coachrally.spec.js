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

async function storedMatch(page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rallye_cap_qc_v5'));
    return state.matches.find(match => match.id === state.activeMatchId);
  });
}

async function storedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('rallye_cap_qc_v5')));
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
