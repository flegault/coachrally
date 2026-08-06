# Changelog

Ce document regroupe les livraisons fonctionnelles de CoachRally. Il ne remplace pas les règles de produit ni les notes techniques; il décrit ce qui a été livré.

## Livraisons consolidées

### Workflow coach et matchs

- Workflow principal livré : `Match`, `Joueurs`, `Alignement`, puis `Jouer`.
- Accueil contextuel pour créer ou sélectionner une équipe, préparer un match et reprendre le match courant.
- Gestion locale multi-équipe et multi-match avec un bassin permanent de joueurs par équipe.
- Vue `Matchs` unique, triable, pour les matchs en préparation, en cours, terminés et archivés.
- Archivage d'un match terminé en lecture seule, avec conservation de l'équipe et des joueurs pour le prochain match.
- Vue complète et vue simple de `Jouer`; la progression avance une demi-manche à la fois et l'historique demeure verrouillé.
- Changements de joueurs en cours de match appliqués seulement aux demi-manches futures.

### Alignement et règles Rallye-Cap

- Moteur de génération extrait dans `lineup-engine.js` et validations pures dans `rules.js`.
- Optimisation des positions sans modifier l'ordre de frappe, plus mélange optionnel avant match.
- Optimisation automatique après les changements de présence avant match.
- Validations de départ pour 6 à 12 joueurs actifs, positions et règles obligatoires; les autres problèmes demandent confirmation.
- Frappe fixe avec rotation continue et option de faire varier le premier frappeur lorsque six joueurs sont actifs.
- Numéros de chandail optionnels propagés vers l'alignement, les exports et les projections publiques.

### Partage, cloud et vues publiques

- Synchronisation Firebase optionnelle des équipes et matchs privés, avec chargement des équipes avant leurs matchs sur un nouvel appareil.
- Lien public de match, mot de passe facultatif et projection spectateur distincte des données d'édition.
- Lien permanent d'équipe `#fans/{teamPublicId}` avec liste des matchs publiés et identifiant unique côté Firestore.
- Vues publiques `Spectateurs`, `Banc` et `Fans` en lecture seule; aperçu local `#banc/local` disponible sans publication.
- Favoris de joueurs mémorisés localement dans les vues publiques, basés sur `playerId`.
- Publication de l'alignement à `Prêt à jouer` lorsqu'un lien Match existe, puis synchronisation pendant le match.

### Exports et expérience parent

- Exports `Programme`, `Banc` et `Texte` regroupés dans la modale `Partager le match`.
- Codes QR générés localement pour les exports, avec priorité au lien permanent de l'équipe.
- Exports régénérables depuis les archives sans modifier leur snapshot.
- Adaptation du `Programme` aux noms longs et ajout d'une indication d'encouragement dans le format Banc.

### Interface et qualité

- Marque CoachRally, domaine `coachrally.app`, favicon et page `À propos`.
- Navigation globale simplifiée, étapes visibles dans le contenu et titre de page adapté à la route.
- Interface de présence des joueurs simplifiée: liste unique, présents visibles et absents grisés.
- Tests Node pour les règles, le moteur, l'ordre de frappe, la vue Banc et la synchronisation d'équipe.
- Parcours Playwright Chromium bureau et mobile pour les flux critiques, les exports, les changements de joueurs, les archives et les projections publiques.
- Build GitHub Pages contrôlé afin de publier explicitement chaque asset statique requis.

## Décisions consignées

- Les anciens modèles de stockage ne sont pas pris en charge avant la mise en production.
- Les archives sont des historiques en lecture seule; aucun flux de reprise, recommencement ou relecture n'est prévu.
- Les données restent local-first; les fonctionnalités cloud sont optionnelles.
