# Notes pour agents

Ce dépôt contient une application SPA statique pour préparer un alignement de baseball Rallye-Cap.

## Règles générales

- L'application doit rester utilisable hors ligne à partir d'un fichier statique.
- Les données des joueurs et des matchs restent locales à l'appareil, sauf décision produit documentée.
- Le français du Québec doit être conservé. Les fichiers texte et HTML doivent être en UTF-8.
- Ne pas remplacer les accents par de l'ASCII. Corriger les problèmes de type `Ã©`, `â€™`, `âœ”` en restaurant les vrais caractères UTF-8.
- Documenter tout changement de règle métier dans `docs/product-spec.md`.
- Documenter tout changement de navigation ou de flux utilisateur dans `docs/site-structure.md`.
- Documenter toute décision technique durable dans `docs/technical-notes.md`.
- Mettre à jour `docs/roadmap.md` quand une amélioration planifiée est livrée, rejetée ou redécoupée.

## Architecture actuelle

- `index.html` contient la structure HTML et charge les fichiers statiques.
- `styles.css` contient les styles.
- `app.js` contient la logique applicative principale.
- `rules.js` contient les validations pures des règles obligatoires.
- L'état est sauvegardé dans `localStorage` avec la clé `rallye_cap_qc_v5`.
- Tant que l'application n'est pas en production, ne pas supporter les vieux modèles de données. Aucune logique de code ne doit exister seulement pour migrer, lire ou réparer une ancienne version de stockage local ou cloud.
- Les vues principales sont: `Accueil`, `Matchs`, `Match`, `Joueurs`, `Alignement`, `Jouer` et les routes publiques `Spectateurs`, `Banc` et `Fans`.
- `Alignement` prépare et valide l'horaire avec `Prêt à jouer`. `Jouer` porte le démarrage, la progression et les changements de joueurs, en vue complète ou simple.
- Le moteur de génération vit dans `lineup-engine.js` et les validations pures dans `rules.js`; l'état, la progression, les changements de joueurs, le rendu et les exports restent regroupés dans `app.js`.

## Priorités de maintenance

1. Préserver l'encodage UTF-8 lisible dans toute l'interface.
2. Extraire la logique métier de `app.js` dans des modules testables.
3. Ajouter des tests pour la génération, les validations et les cas limites.
4. Garder les exports HTML, impression/PDF et image parents compatibles avec une app statique.
5. Garder la fin de match et la préparation d'un nouveau match simples: les joueurs devraient pouvoir être conservés d'un match à l'autre.

## Risques connus

- Les sorties PowerShell peuvent afficher du mojibake même quand les fichiers sont bien encodés. Vérifier les fichiers en UTF-8 avant de corriger des accents.
- La suite automatisée comprend des tests Node et des parcours Playwright sur Chromium bureau et mobile. Les anciennes pages HTML restent utiles pour le diagnostic manuel.
- Les fonctionnalités presse-papiers, fenêtre d'impression et téléchargement dépendent du navigateur.

## Exécution des tests

- L'utilisateur exécute localement les tests lors des changements afin de limiter l'usage des agents.
- Un agent peut ajouter ou modifier des tests, vérifier leur syntaxe et indiquer précisément les commandes à lancer, mais ne doit pas exécuter la suite localement sauf demande explicite de l'utilisateur.
- Quand l'agent n'a pas exécuté les tests, il doit le signaler clairement dans son compte rendu sans affirmer qu'ils passent.
- La CI GitHub demeure la validation automatique lors des push et pull requests.
