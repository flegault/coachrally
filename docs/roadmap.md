# Roadmap

Ce document contient uniquement le travail planifié. Les fonctions livrées sont consignées dans [changelog.md](changelog.md). Les règles et comportements courants restent décrits dans `product-spec.md`, `site-structure.md` et `technical-notes.md`.

## Maintenant

### 1. Rendre le côté du match explicite

**Problème** : un nouveau match ne doit pas supposer `Visiteur` ou `Local`; ce choix influence l'ordre des demi-manches, les exports et les vues publiques.

**Livraison** :

- un nouveau match n'a aucun côté par défaut;
- `Prêt à jouer` bloque tant que le côté n'est pas choisi;
- les libellés et validations restent cohérents dans `Match`, `Alignement`, `Jouer`, les exports et les projections publiques;
- des tests couvrent les deux côtés et le cas sans sélection.

### 2. Extraire le domaine du match hors de `app.js`

**Problème** : l'état, la progression, les changements de joueurs, les projections publiques et les exports sont encore trop couplés au rendu DOM.

**Livraison, par étapes** :

1. extraire la normalisation et les transitions d'état v5 dans un module pur;
2. extraire les commandes de match: avancer, ajouter, retirer et remplacer un joueur pour les demi-manches futures;
3. extraire les projections publiques et les données d'export;
4. couvrir chaque module par des tests Node sans DOM ni `localStorage`.

**Critère de sortie** : `app.js` orchestre l'état et le rendu, sans porter les règles de transition ni les calculs métier.

### 3. Fiabiliser les exports parents

**Problème** : les exports doivent mieux refléter l'état réel d'un match et rester lisibles avec des noms ou listes longues.

**Livraison** :

- définir la disponibilité de `Programme`, `Banc` et `Texte` pour un brouillon, un match prêt, en cours, terminé et archivé;
- finaliser un rendu parent responsive pour impression/PDF, y compris les noms longs;
- générer des noms de fichiers avec date et équipes lorsque le navigateur permet le téléchargement;
- ajouter des tests ciblés ou doubles contrôlés pour impression, téléchargement et presse-papiers.

### 4. Couvrir les frontières local/cloud

**Problème** : les parcours Firebase, impression, téléchargement et presse-papiers ne sont pas encore couverts par la suite automatisée.

**Livraison** :

- introduire des doubles contrôlés pour Firebase et les API navigateur;
- tester les erreurs de connexion, la publication, le retrait des liens et la lecture des projections publiques;
- documenter clairement les limites hors ligne des actions cloud.

## Ensuite

### Simplifier l'ajustement sur mobile

Réduire la densité de l'écran `Alignement` sans masquer les règles obligatoires : statistiques avancées repliées par défaut, validations rapprochées de la manche concernée et patron mobile clair pour corriger une position manquante.

### Améliorer l'information de banc et de spectateurs

Évaluer les informations utiles à la prochaine action: lanceurs à préparer en attaque, premiers frappeurs à préparer en défense et présentation des états de match plus facile à scanner sur téléphone. Ces améliorations ne doivent pas transformer les vues publiques en outils d'édition.

## Hors périmètre actuel

- Reprendre, recommencer ou rejouer un match archivé. Une archive est un historique en lecture seule; l'entraîneur crée un nouveau match avec le bassin de joueurs conservé.
- Importer ou exporter une liste de joueurs.
- Dupliquer un match existant.
- Ajouter une correction générale de progression ou un retour arrière dans l'interface principale.

## Règle de gestion

Chaque entrée planifiée doit avoir un problème, une livraison et un critère de sortie. Lorsqu'elle est livrée, elle quitte ce document pour `docs/changelog.md`; lorsqu'elle est rejetée ou redécoupée, la décision est consignée ici et, si elle change un comportement produit, dans la documentation concernée.
