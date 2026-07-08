# CoachRally

Application web statique à l'adresse [coachrally.app](https://coachrally.app) pour préparer, ajuster et partager l'alignement d'une équipe de baseball Rallye-Cap.

L'app aide les entraîneurs à créer un alignement clair et équitable, à suivre la progression du match, à gérer les changements de joueurs et à partager une version simple pour les parents.

## Fonctionnalités

- Gestion de plusieurs équipes locales, avec un bassin permanent de joueurs séparé par équipe.
- Préparation de matchs avec adversaire, date, heure, endroit, local/visiteur, nombre de manches et frappe fixe.
- Présences et absences par match.
- Génération d'un alignement défensif selon les règles Rallye-Cap.
- Ajustement manuel de l'ordre des frappeurs et des positions.
- Suivi du match par demi-manche dans l'onglet `Alignement`.
- Changements de joueurs en cours de match.
- Validation des règles obligatoires.
- Statistiques et indicateurs d'équité.
- Archives de matchs en lecture seule.
- Exports `Programme`, `Banc` et `Texte`.
- Vues publiques `Spectateurs`, `Banc` et `Fans` en lecture seule.
- Synchronisation Firebase optionnelle pour les matchs mis en ligne.
- Liens publics pour spectateurs en direct, avec mot de passe optionnel.
- Lien permanent public par équipe (`#fans/...`) avec liste des joueurs et des matchs partagés.
- Favoris multiples côté parents/spectateurs, mémorisés seulement dans leur navigateur.

## Utilisation locale

Aucune installation n'est requise.

Ouvrir simplement `index.html` dans un navigateur moderne.

Les données sont sauvegardées localement dans le navigateur avec `localStorage`, sous la clé:

```text
rallye_cap_qc_v5
```

L'application reste utilisable hors ligne à partir des fichiers statiques.

## Structure du projet

```text
index.html                  Structure HTML de l'application
styles.css                  Styles
app.js                      Logique applicative principale
rules.js                    Validations pures des règles obligatoires
lineup-engine.js            Génération pure des positions défensives
firebase-sync.js            Synchronisation Firebase optionnelle
firebase-config.example.js  Exemple de configuration Firebase
firestore.rules             Règles Firestore
vendor/qrcode.js             Génération locale des codes QR (MIT)
tests/rules.html            Tests navigateur des règles
docs/                       Documentation produit, UX et technique
```

## Workflow principal

Le flux principal suit la préparation réelle d'un match:

```text
Match -> Joueurs -> Alignement -> Jouer
```

- `Accueil`: point d'entrée contextuel.
- `Équipe`: gestion du nom de l'équipe active et de son bassin permanent de joueurs.
- `Mes matchs`: matchs locaux, matchs en ligne et archives de l'équipe active.
- `Match`: informations du match.
- `Joueurs`: présences et absences pour le match courant.
- `Alignement`: génération, ajustements et validation `Prêt à jouer`.
- `Jouer`: démarrage, progression et changements de joueurs en vue complète ou simple.
- `Partager`: action contextuelle pour les exports et les liens publics.
- `Spectateurs`, `Banc` et `Fans`: routes publiques en lecture seule.

La barre du haut affiche l'équipe active et permet de changer d'équipe ou d'en créer une nouvelle. Les joueurs, les matchs, les liens publics d'équipe et les liens spectateurs restent séparés par équipe; il n'y a pas de déplacement de match entre équipes.

## Règles Rallye-Cap prises en charge

L'application valide notamment:

- de 6 à 12 joueurs actifs pour un match;
- 4 à 9 manches;
- 6 défenseurs par manche;
- une seule assignation par position défensive;
- positions `1B`, `2B`, `3B`, `AC`, `L1`, `L2`;
- aucun joueur au `1B` plus d'une fois;
- aucun lanceur deux manches consécutives;
- aucun joueur au banc deux manches consécutives.

Les règles obligatoires sont traitées comme des erreurs à corriger, pas comme de simples préférences.

## Firebase optionnel

L'application fonctionne sans Firebase.

Firebase sert seulement à ajouter une couche de synchronisation en ligne pour les équipes et matchs explicitement gérés en ligne, ainsi que les liens publics spectateurs.

Les données privées de l'entraîneur restent locales par défaut. Une équipe peut être gérée en ligne pour synchroniser son nom et son bassin entre appareils; ses matchs peuvent ensuite être activés séparément. Les liens publics `#public/...` et `#fans/...` restent indépendants de cette gestion privée.

Dans `Partager`:

- `Lien permanent d'équipe` gère l'identifiant public, le mot de passe optionnel, la copie et le retrait du lien de l'équipe active.
- `Spectateurs en direct` crée le lien public du match courant.
- La liste des matchs partagés permet de copier ou retirer les liens publics de l'équipe active.

Le lien public d'équipe publie une projection limitée: nom d'équipe, joueurs (`playerId`, nom, numéro, libellé) et résumés des matchs publiés. Avec mot de passe, cette projection est chiffrée côté client avant l'écriture Firestore.

Pour l'activer en local:

1. Créer un projet Firebase avec Authentication et Firestore.
2. Activer la connexion par courriel/mot de passe et Google.
3. Copier `firebase-config.example.js` vers `firebase-config.js`.
4. Remplacer les valeurs par celles du projet Firebase.
5. Déployer les règles à partir de `firestore.rules`.
6. Optionnel: configurer Firebase App Check avec reCAPTCHA v3.

`firebase-config.js` ne doit pas être committé.

## Déploiement GitHub Pages

Le dépôt GitHub est `flegault/CoachRally`. Le workflow GitHub Actions `.github/workflows/pages.yml` publie l'application statique sur GitHub Pages avec le domaine personnalisé `coachrally.app` défini dans `CNAME`.

Pour l'utiliser:

1. Aller dans `Settings > Pages`.
2. Choisir `Build and deployment > Source: GitHub Actions`.
3. Ajouter les secrets GitHub Actions nécessaires:

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_APP_ID
FIREBASE_APPCHECK_SITE_KEY
```

Le workflow génère `firebase-config.js` pendant le déploiement à partir des secrets.

La vraie configuration Firebase ne doit pas être stockée dans le dépôt.

## App Check en développement local

Pour tester Firebase App Check en local, ajouter temporairement ceci dans `firebase-config.js`:

```js
appCheckSiteKey: "CLE_SITE_RECAPTCHA_V3",
appCheckDebugToken: true
```

Ouvrir ensuite l'application avec la console du navigateur ouverte. Firebase affichera un jeton `AppCheck debug token`.

Ajouter ce jeton dans Firebase Console:

```text
App Check > app Web > Manage debug tokens
```

Puis remplacer `true` par la valeur du jeton enregistré:

```js
appCheckDebugToken: "JETON_DEBUG_ENREGISTRE"
```

Ne jamais ajouter de debug token dans les secrets GitHub ou dans un fichier publié.

## Tests

Installer les dépendances de développement et Chromium une première fois:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Exécuter toute la suite, les tests métier seuls ou les parcours navigateur:

```powershell
# Toute la suite
npm.cmd test

# Tests Node seulement
npm.cmd run test:unit

# Tests Playwright seulement
npm.cmd run test:e2e
```

Par défaut, la configuration Playwright utilise un seul worker afin de privilégier une exécution reproductible. Pour accélérer ponctuellement les parcours navigateur, ils peuvent être distribués entre plusieurs workers sans modifier la configuration:

```powershell
# Exécution parallèle recommandée sur une machine locale
npx.cmd playwright test --fully-parallel --workers=4

# Surcharge plus agressive pour une machine qui dispose de suffisamment de ressources
npx.cmd playwright test --fully-parallel --workers=6
```

Quatre workers offrent généralement le meilleur équilibre entre vitesse, consommation de ressources et stabilité. Six workers peuvent réduire encore légèrement la durée, mais sollicitent davantage le processeur et la mémoire. Si des tests deviennent intermittents, revenir à quatre workers, puis confirmer le comportement avec l'exécution séquentielle `npm.cmd run test:e2e`.

Pour cibler ou observer un parcours Playwright:

```powershell
# Filtrer les tests par leur titre
npx.cmd playwright test --grep "projection spectateur"

# Filtrer un parcours et lui appliquer une surcharge de workers
npx.cmd playwright test --grep "projection spectateur" --fully-parallel --workers=4

# Afficher le navigateur pendant l'exécution
npx.cmd playwright test --headed

# Ouvrir l'interface interactive Playwright
npx.cmd playwright test --ui
```

Lors d'un échec, Playwright place les diagnostics dans `test-results/`: trace, capture d'écran et vidéo. Ouvrir une trace avec:

```powershell
npx.cmd playwright show-trace test-results\chemin-vers-la-trace\trace.zip
```

Les commandes utilisent explicitement les exécutables `.cmd`, parce que certaines configurations PowerShell de Windows bloquent les scripts `npm.ps1` et `npx.ps1`.

### Couverture actuelle

Les tests Node couvrent 11 scénarios répartis entre:

- validations obligatoires de l'alignement;
- positions inconnues ou dupliquées;
- répétitions interdites au premier but, au banc et comme lanceur;
- nettoyage des assignations;
- statistiques et équité;
- validation du démarrage;
- états de la vue Banc;
- choix de version et regroupement des matchs synchronisés.

Playwright contient 19 scénarios utilisateur:

- chargement, UTF-8 et persistance locale;
- création d'équipe et ajout de joueurs;
- préparation, démarrage et progression d'un match;
- invariants de génération de l'alignement;
- ajout, remplacement et retrait en match commencé;
- limites de 6 et 12 joueurs actifs;
- changement appliqué à une demi-manche future;
- fin, archivage et conservation de l'équipe;
- exports `Texte`, `Banc` et `Programme`;
- projection publique non prête;
- projection spectateur prête et favoris locaux;
- aperçu local de la route Banc, avec et sans match actif;
- navigation mobile du workflow.

Dans la sortie Playwright, un même scénario apparaît généralement deux fois: une fois dans le projet `chromium` de bureau et une fois dans `mobile-chromium`. Les 18 scénarios communs produisent donc 36 exécutions. Le scénario de navigation mobile est ignoré sur le projet bureau et exécuté sur mobile, ce qui donne 37 réussites et 1 skip attendu pour 19 scénarios distincts.

Dans `npx.cmd playwright test --ui`, la colonne de gauche regroupe les tests par projet. Déplier `chromium` ou `mobile-chromium` permet de voir les scénarios correspondants; activer les deux projets affiche volontairement les doublons bureau/mobile.

Les pages `tests/rules.html`, `tests/bench.html` et `tests/team-sync.html` restent disponibles pour le diagnostic manuel. Playwright sert directement l'application statique et n'ajoute aucune dépendance à la version déployée.

## Documentation

- `AGENTS.md`: consignes de maintenance pour agents.
- `docs/product-spec.md`: règles produit et parcours utilisateur.
- `docs/site-structure.md`: structure de navigation et décisions UX.
- `docs/technical-notes.md`: architecture, état et notes d'implémentation.
- `docs/firebase-firestore-sync.md`: détails de synchronisation Firebase.
- `docs/roadmap.md`: améliorations prévues, dettes et décisions.

## Notes de maintenance

- Les fichiers texte et HTML doivent rester en UTF-8.
- Le français du Québec doit être conservé.
- Les données des joueurs et des matchs restent locales par défaut.
- L'application doit rester utilisable hors ligne.
- Les changements de règles métier doivent être documentés dans `docs/product-spec.md`.
- Les changements de navigation ou de flux utilisateur doivent être documentés dans `docs/site-structure.md`.
- Les décisions techniques durables doivent être documentées dans `docs/technical-notes.md`.
