const { test, expect, devices } = require('@playwright/test');

const CLOUD_API = '/__coachrally_test_cloud__';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createRealtimeCloudStore() {
  let clock = Date.now() + 2_000;
  let nextMatchId = 1;
  const teams = new Map();
  const matches = new Map();

  const stamp = () => {
    clock = Math.max(clock + 1, Date.now() + 2_000);
    return clock;
  };
  const list = collection => [...collection.values()].map(clone);

  return {
    listTeams: () => list(teams),
    listMatches: () => list(matches),
    team: id => clone(teams.get(id) || null),
    match: id => clone(matches.get(id) || null),
    saveTeam(id, payload, clientId) {
      const previous = teams.get(id);
      const doc = {
        id,
        payload: clone(payload),
        updatedAtMs: stamp(),
        updatedByClientId: clientId || null,
        version: (previous?.version || 0) + 1
      };
      teams.set(id, doc);
      return clone(doc);
    },
    saveMatch(id, payload, clientId, extra = {}) {
      id ||= `match-cloud-${nextMatchId++}`;
      const previous = matches.get(id);
      const doc = {
        id,
        payload: clone(payload),
        teamId: payload.teamId,
        team: payload.team,
        opp: payload.opp,
        date: payload.date,
        time: payload.time,
        place: payload.place,
        status: payload.status,
        started: payload.started,
        completed: Boolean(extra.completed),
        currentIndex: extra.currentIndex || 0,
        currentLabel: extra.currentLabel || '',
        publicId: extra.publicId || null,
        updatedAtMs: stamp(),
        updatedByClientId: clientId || null,
        version: (previous?.version || 0) + 1
      };
      matches.set(id, doc);
      return clone(doc);
    },
    deleteTeam(id) { teams.delete(id); },
    deleteMatch(id) { matches.delete(id); }
  };
}

const realtimeFirebaseModule = `
  const api = '${CLOUD_API}';
  const request = async (path, options = {}) => {
    const response = await fetch(api + path, {
      headers: { 'content-type': 'application/json' },
      ...options
    });
    return response.json();
  };
  const subscribe = async (kind, id, callback) => {
    let active = true;
    let lastVersion = -1;
    const poll = async () => {
      if (!active) return;
      const doc = await request('/' + kind + '/' + encodeURIComponent(id));
      const version = doc?.version || 0;
      if (version !== lastVersion) {
        lastVersion = version;
        callback(doc);
      }
    };
    await poll();
    const timer = setInterval(() => poll().catch(() => {}), 50);
    return () => { active = false; clearInterval(timer); };
  };

  export async function currentUser() { return { uid: 'test-coach' }; }
  export async function onAuth(callback) { await callback({ uid: 'test-coach' }); return () => {}; }
  export async function listTeams() { return request('/teams'); }
  export async function listMatches() { return request('/matches'); }
  export async function listPublicTeams() { return []; }
  export async function listenTeam(id, callback) { return subscribe('team', id, callback); }
  export async function listenMatch(id, callback) { return subscribe('match', id, callback); }
  export async function saveTeam(id, payload, clientId) {
    await request('/team/' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify({ payload, clientId }) });
    return id;
  }
  export async function saveMatch(id, payload, clientId, extra = {}) {
    const doc = await request('/match/' + encodeURIComponent(id || 'new'), {
      method: 'POST',
      body: JSON.stringify({ payload, clientId, extra })
    });
    return doc.id;
  }
  export async function deleteTeam(id) { await request('/team/' + encodeURIComponent(id), { method: 'DELETE' }); }
  export async function deleteMatch(id) { await request('/match/' + encodeURIComponent(id), { method: 'DELETE' }); }
  export async function listenPublic() { return () => {}; }
  export async function listenPublicTeam() { return () => {}; }
  export async function publishPublic(id) { return id || 'public-match-test'; }
  export async function publishPublicTeam(id) { return id || 'public-team-test'; }
  export async function deletePublic() {}
  export async function deletePublicTeam() {}
`;

async function installRealtimeFirebase(page, store) {
  await page.route('**/firebase-sync.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: realtimeFirebaseModule
  }));
  await page.route(`**${CLOUD_API}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice(CLOUD_API.length).split('/').filter(Boolean);
    const [kind, encodedId] = path;
    const id = encodedId ? decodeURIComponent(encodedId) : null;
    let result = null;

    if (request.method() === 'GET' && kind === 'teams') result = store.listTeams();
    else if (request.method() === 'GET' && kind === 'matches') result = store.listMatches();
    else if (request.method() === 'GET' && kind === 'team') result = store.team(id);
    else if (request.method() === 'GET' && kind === 'match') result = store.match(id);
    else if (request.method() === 'POST' && kind === 'team') {
      const body = request.postDataJSON();
      result = store.saveTeam(id, body.payload, body.clientId);
    } else if (request.method() === 'POST' && kind === 'match') {
      const body = request.postDataJSON();
      result = store.saveMatch(id === 'new' ? null : id, body.payload, body.clientId, body.extra);
    } else if (request.method() === 'DELETE' && kind === 'team') {
      store.deleteTeam(id);
    } else if (request.method() === 'DELETE' && kind === 'match') {
      store.deleteMatch(id);
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(result)
    });
  });
}

async function createExampleMatch(page) {
  await page.goto('/#accueil');
  await page.getByRole('button', { name: 'Créer une équipe exemple' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.getByRole('button', { name: 'Préparer un match' }).click();
  await page.locator('#opp').fill('Aigles de Québec');
  await page.locator('[data-step="joueurs"]').click();
  await page.locator('#toAlign').click();
}

async function enableOnlineManagement(page) {
  await page.goto('/#accueil');
  await page.locator('#teamPublicLinkBtn').click();
  const teamToggle = page.getByRole('group', { name: 'Gérer l’équipe en ligne' });
  await expect(teamToggle).toBeVisible();
  await teamToggle.getByRole('button', { name: 'Oui' }).click();
  await expect(page.getByRole('group', { name: 'Gérer l’équipe en ligne' }).getByRole('button', { name: 'Oui' })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Fermer' }).click();

  await page.locator('#homeMatchShareBtn').click();
  const matchToggle = page.getByRole('group', { name: 'Gérer en ligne' });
  await expect(matchToggle).toBeVisible();
  await matchToggle.getByRole('button', { name: 'Oui' }).click();
  await expect(page.getByRole('group', { name: 'Gérer en ligne' }).getByRole('button', { name: 'Oui' })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Fermer' }).click();
}

async function openCloudMatchOnSecondDevice(page) {
  await page.goto('/#accueil');
  await expect(page.locator('#miniMatches')).toHaveText('1');
  await expect(page.locator('#matchesMetric')).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Match en ligne à reprendre' })).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre le match' }).click();
  await expect(page).toHaveURL(/#match$/);
  await expect(page.locator('#opp')).toHaveValue('Aigles de Québec');
}

async function createSyncedPair(browser) {
  const store = createRealtimeCloudStore();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const mobile = await browser.newContext({ ...devices['Pixel 7'] });
  const pageA = await desktop.newPage();
  const pageB = await mobile.newPage();
  await installRealtimeFirebase(pageA, store);
  await installRealtimeFirebase(pageB, store);
  await createExampleMatch(pageA);
  await enableOnlineManagement(pageA);
  await openCloudMatchOnSecondDevice(pageB);
  return {
    pageA,
    pageB,
    close: async () => Promise.all([desktop.close(), mobile.close()])
  };
}

async function storedMatch(page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rallye_cap_qc_v5'));
    return state.matches.find(match => match.id === state.activeMatchId);
  });
}

async function acknowledgeRemoteUpdate(page) {
  await expect(page.locator('#modalTitle')).toHaveText('Version distante reçue');
  await page.getByRole('button', { name: 'OK' }).click();
}

test.describe('synchronisation entre deux navigateurs', () => {
  test.setTimeout(60_000);

  test('propage les informations du match de A vers B, puis de B vers A', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Le scénario crée déjà un contexte bureau et un contexte mobile.');
    const pair = await createSyncedPair(browser);
    try {
      await pair.pageA.goto('/#match');
      await pair.pageA.locator('#opp').fill('Royaux de Québec');
      await expect(pair.pageB.locator('#opp')).toHaveValue('Royaux de Québec');
      await acknowledgeRemoteUpdate(pair.pageB);

      await pair.pageB.locator('#place').fill('Parc du Fleuve');
      await expect(pair.pageA.locator('#place')).toHaveValue('Parc du Fleuve');
      await acknowledgeRemoteUpdate(pair.pageA);
    } finally {
      await pair.close();
    }
  });

  test('propage les présences, l’ordre au bâton et les positions défensives', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Le scénario crée déjà un contexte bureau et un contexte mobile.');
    const pair = await createSyncedPair(browser);
    try {
      await pair.pageA.goto('/#joueurs');
      await pair.pageB.goto('/#joueurs');
      const initial = await storedMatch(pair.pageA);
      const playerId = initial.order[0];

      await pair.pageA.locator(`[data-toggle="${playerId}"]`).click();
      await expect(pair.pageB.locator(`[data-toggle="${playerId}"]`)).toHaveAttribute('aria-pressed', 'false');
      await acknowledgeRemoteUpdate(pair.pageB);

      await pair.pageB.locator(`[data-toggle="${playerId}"]`).click();
      await pair.pageB.goto('/#alignement');
      await expect.poll(async () => (await storedMatch(pair.pageA)).players.find(player => player.id === playerId)?.on).toBe(true);
      await acknowledgeRemoteUpdate(pair.pageA);
      await pair.pageA.goto('/#alignement');

      const beforeOrder = (await storedMatch(pair.pageA)).order;
      const [firstId, secondId] = beforeOrder;
      await pair.pageA.locator(`[data-row="${firstId}"]`).dragTo(pair.pageA.locator(`[data-row="${secondId}"]`));
      await expect.poll(async () => (await storedMatch(pair.pageB)).order.slice(0, 2)).toEqual([secondId, firstId]);
      await acknowledgeRemoteUpdate(pair.pageB);

      const beforePositions = await storedMatch(pair.pageB);
      const assignments = Object.entries(beforePositions.schedule[0].pos).slice(0, 2);
      const [[firstDefender, firstPosition], [secondDefender, secondPosition]] = assignments;
      const defenseHalf = beforePositions.side === 'locale' ? 'debut' : 'fin';
      await pair.pageB.locator(`[data-cell="${firstDefender}"][data-inning="0"][data-half="${defenseHalf}"]`).dragTo(
        pair.pageB.locator(`[data-cell="${secondDefender}"][data-inning="0"][data-half="${defenseHalf}"]`)
      );
      await expect.poll(async () => {
        const match = await storedMatch(pair.pageA);
        return [match.schedule[0].pos[firstDefender], match.schedule[0].pos[secondDefender]];
      }).toEqual([secondPosition, firstPosition]);
      await acknowledgeRemoteUpdate(pair.pageA);
    } finally {
      await pair.close();
    }
  });
});
