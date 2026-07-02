# Roadmap

## Maintenant

- Livré: l'application adopte la marque `CoachRally`, le domaine canonique `coachrally.app` et le dépôt `flegault/CoachRally`; les mentions `Rallye-Cap` sont conservées pour les règles sportives.
- Livré: une page `À propos` présente l'origine de CoachRally et permet de joindre François par courriel, sans formulaire ni service tiers.
- Livré: les exports affichent la marque CoachRally; les formats Programme et Banc contiennent un code QR local qui privilégie le lien permanent de l'équipe, puis le match public ou `coachrally.app`, et le format Texte contient la même destination avec une signature compacte.
- Livré: le Programme adapte automatiquement la taille des noms longs sans ajouter de lignes ni augmenter la hauteur de l'export.
- Livré: l'export Banc attribue une icône d'encouragement aux enfants qui ne frappent pas pendant une manche en mode frappe fixe.

- Compléter la gestion multi-match restante: actions avancées de reprise/recommencement à partir d'un match archivé.
- Améliorer les exports et partages: PDF parents responsive.
- Extraire la logique métier de `app.js` dans des modules testables.
- Livré: les règles, la vue Banc et la synchronisation d'équipe ont des tests Node; Playwright couvre les parcours front critiques, les invariants de génération, les changements de joueurs, la fin avec archivage et les trois exports dans Chromium bureau et mobile. Il reste à étendre les tests aux projections publiques.

## Priorité Spectateurs / Cloud

- Synchronisation privée du profil d'équipe et du bassin de joueurs:
  - Livré: les équipes explicitement gérées en ligne vivent séparément des matchs dans Firestore et sont récupérées avant eux sur un nouvel appareil;
  - Livré: le nom et le bassin utilisent la dernière modification gagnante sans réécrire les snapshots des matchs existants;
  - Livré: désactiver la gestion privée d'une équipe retire ses matchs privés, mais conserve les copies locales et les liens spectateurs indépendants.
  - Livré: le contrôle privé de l'équipe vit dans la modale `Lien d'équipe`; un match refuse son activation privée tant que celle de l'équipe n'est pas active.
- Polish visible par les fans:
  - rendre l'écran `Spectateurs en direct` plus lisible avant partage public large;
  - remplacer les titres génériques par les noms des équipes quand possible;
  - alléger l'étape `Programme` pour éviter les doublons visuels;
  - rendre les infos de match plus faciles à scanner sur mobile;
  - garder les notifications de nouvelle demi-manche seulement lorsqu'elles aident à revenir à la manche courante.
  - Livré: l'étape `Programme` affiche maintenant les équipes comme titre, les infos de match sont plus lisibles, les demi-manches utilisent des titres courts `Frappeurs` / `Défenseurs`, et les pastilles de navigation sont cliquables.
- Joueur favori dans `Spectateurs en direct`:
  - permettre au spectateur de cliquer un joueur pour le mettre en évidence partout dans la vue publique;
  - plusieurs joueurs favoris peuvent être sélectionnés;
  - cliquer un favori à nouveau le désélectionne;
  - mémoriser ce choix localement dans le navigateur du spectateur, sans écrire dans Firestore;
  - utiliser le `playerId` publié dans la projection publique, sans fallback nom/numéro.
  - Livré: les joueurs dans `#fans`, `Programme`, `Frappeurs` et `Défenseurs` sont cliquables; les favoris sont mémorisés localement par `playerId` et peuvent donc suivre les mêmes joueurs entre les matchs d'une équipe.
- URL fixe d'équipe pour les fans:
  - Livré: la route publique `#fans/{teamPublicId}` affiche les joueurs de l'équipe et liste les matchs dont le lien `Spectateurs en direct` est publié, avec mot de passe optionnel pour la liste.
  - Livré: chaque match public mène vers son lien `#public/{publicId}` et affiche si un mot de passe est requis.
  - Livré: les matchs apparaissent ou disparaissent selon les liens `Spectateurs en direct` créés ou retirés par le coach.
  - Livré: `Partager` liste les liens d'équipe de l'équipe active et les matchs partagés de cette équipe afin de copier ou retirer les liens publics.
  - La visibilité publique reste contrôlée par le lien spectateur du match.
- Identifiant public d'équipe:
  - Livré: `Partager` contient le champ optionnel `Identifiant public`;
  - exemple: `expos-rallye-cap`;
  - l'identifiant est normalisé en minuscules avec lettres, chiffres et tirets, de 3 à 40 caractères;
  - l'identifiant doit être unique côté Firestore et l'app refuse d'écraser celui d'une autre équipe;
  - il sert à produire l'URL stable `#fans/{teamPublicId}`;
  - Livré: quand le lien permanent est actif, l'identifiant est verrouillé; il faut retirer le lien pour le changer.
- Multi-équipe locale:
  - Livré: l'accueil affiche l'équipe active, permet de changer d'équipe et de créer une nouvelle équipe;
  - Livré: les matchs, joueurs et liens publics sont séparés par équipe avec `teamId`; il n'y a pas de déplacement de matchs entre équipes;
  - Livré: `Matchs` affiche seulement les données de l'équipe active.
  - Livré: le menu global est réduit à `Accueil`, `Connexion` et `Réinitialiser`; `Matchs` s'ouvre depuis l'accueil, la route interne `Spectateur` n'a plus d'accès visible, et les routes désuètes `#equipe` / `#mesmatchs` / `#partager` ne sont pas maintenues.
- Livré: un document public `publicTeams/{teamPublicId}` contient la liste publique ou une version chiffrée de cette liste. Les détails protégés par mot de passe restent dans les documents de match chiffrés.

## Workflow actuel

Le workflow livré est maintenant:

```text
Match -> Joueurs -> Alignement -> Jouer
```

`Matchs` reste hors des étapes numérotées et s'ouvre depuis l'accueil. Le partage est une action non numérotée du match courant, accessible depuis le workflow et depuis `Matchs`. Les expériences spectateur passent uniquement par les routes publiques `#public`, `#banc` et `#fans`.

### Navigation

- Livré: le header est simplifié en un menu global unique avec statut compact du match; les quatre étapes restent dans le contenu.
- `#accueil`: porte d'entrée contextuelle; création/sélection de l'équipe, gestion du bassin permanent de joueurs, création explicite d'un match si l'équipe existe sans match actif, ou reprise du match courant.
- `#match`: informations du match, côté local/visiteur, adversaire, date, heure et endroit.
- `#joueurs`: liste des joueurs du match et présence/absence avant le début.
- `#alignement`: ordre des frappeurs, optimisation défensive, validations, suggestions, statistiques et confirmation `Prêt à jouer`.
- `#matchs`: ouverture, partage, archivage et suppression des matchs locaux et cloud du compte connecté; l'actualisation et la gestion cloud sont centralisées automatiquement ou dans `Partager`.
- Action `Partager`: modale de match avec `Lien Match`, `Gérer en ligne` pour l'édition/synchronisation privée, puis les exports `Programme`, `Banc` et `Texte`. Le lien d'équipe `#fans` vit dans la carte équipe.
- `#jouer`: quatrième étape de gestion pour le coach, avec vues complète et simple; les vues spectateurs en lecture seule passent par les routes publiques.

### Alignement

- `Alignement` prépare l'alignement et `Jouer` gère la partie sans dupliquer le tableau complet.
- `Optimiser` recalcule les positions défensives sans modifier l'ordre de frappe courant.
- Le bouton shuffle près de `Optimiser` mélange l'ordre de frappe des joueurs actifs, puis optimise les positions.
- L'ordre peut encore être modifié manuellement par glisser-déposer avant le début du match.
- Les joueurs ajoutés avant match vont à la fin de l'ordre.
- L'ajout, la suppression et la présence/absence avant match déclenchent une optimisation automatique à la première arrivée sur `Alignement` quand 6 à 12 joueurs sont actifs.

### Match commencé

- Le match avance seulement vers l'avant, une demi-manche à la fois.
- Les demi-manches passées sont historiques et non modifiables.
- Les informations de match, la liste des joueurs, la frappe fixe, le shuffle et `Optimiser` sont bloqués ou masqués quand le match est commencé.
- `Changement de joueurs` dans `Jouer` ouvre `Retirer`, `Remplacer` ou `Ajouter`, puis demande la demi-manche d'effet.
- Les suggestions et les corrections automatiques doivent viser seulement les demi-manches non jouées.

### Partage et spectateur

- `Partager` ne fait pas partie du chemin numéroté; les vues spectateur sont des routes publiques en lecture seule.
- Livré: intégration Firebase optionnelle pour sauvegarder le match courant, publier un lien spectateur live et ouvrir le match sur mobile avec un compte courriel/Google.
- Livré: mot de passe public optionnel avec projection spectateur chiffrée côté client.
- Livré: `Matchs` est hors menu global et accessible depuis le contexte d'accueil, tandis que `Partager` est une action contextuelle du match courant.
- Livré: `Partager le match` présente maintenant `Lien Match`, `Gérer en ligne` et `Exports` dans cet ordre; le lien permanent d'équipe vit dans la carte équipe.
- Livré: `Mes matchs` permet d'ouvrir ou supprimer les matchs cloud du compte connecté sans lien d'édition.
- À clarifier: les actions cloud doivent indiquer quand une connexion est requise et proposer la connexion au moment où l'utilisateur tente une action qui en dépend.
  - Livré: les actions cloud ouvrent la connexion quand elle est requise et affichent des états plus explicites.

### Équipe et joueurs permanents

- Notre équipe et son bassin de joueurs sont gérés séparément du workflow de match.
- Cette gestion ne devient pas une étape numérotée et elle est accessible dans `Équipe`.
- Elle permet de définir le nom de notre équipe et d'ajouter, renommer ou supprimer des joueurs pour les matchs futurs.
- Le workflow `Joueurs` sert alors à indiquer les présences et absences du match courant, sans supprimer de joueur du bassin permanent.
- L'accueil contextuel est livré pour la création d'équipe, la création explicite d'un match, la reprise du match courant et l'accès aux archives. La création ou modification de l'équipe ne crée plus de match automatiquement.

### Gaps connus du workflow

- La fin de match offre maintenant une sortie de base complète: archiver ou non, conserver l'équipe et les joueurs, puis retourner à l'accueil. Il reste à livrer les actions avancées de reprise/recommencement.
- Les exports doivent être contrôlés plus finement selon la validité réelle du match.
- À surveiller: les changements de joueurs en cours de match sont considérés suffisamment fonctionnels pour l'instant. Les cas avancés de retrait, remplacement, ajout imprévu et positions futures incomplètes restent documentés, mais ne sont plus une priorité immédiate.
- Le modèle de données courant utilise encore `team` et `players` comme bassin permanent et comme base du match courant. Une séparation interne plus nette reste à faire avant une synchronisation ou publication en ligne.

## Prochaines fonctionnalités candidates

- Livré: les titres de page changent par vue/hash afin d'améliorer l'historique du navigateur et le retour arrière. Une amélioration future pourrait enrichir le titre avec les équipes du match courant.
- Ajouter un `favicon.ico`.
  - Livré: favicon simple ajouté.
- Capitaliser le nom du jour dans les dates affichées, par exemple `Vendredi`.
  - Livré: `formatDate()` capitalise le premier caractère.
- Ajouter un raccourci rapide vers le match en cours près du menu quand un match existe.
  - Livré: raccourci compact ajouté près du menu global, visible seulement pour un match commencé ou terminé non archivé.
- Explorer Firebase/Firestore pour publier optionnellement un match avec un lien ou un QR code toujours à jour.
- Livré: sauvegarder plusieurs matchs cloud et les afficher dans `Mes matchs`, avec date de modification, ouverture et suppression.
- Livré: ajouter une page d'archives des matchs passés.
- Terminer un match avec action explicite, puis offrir `Nouveau match avec les mêmes joueurs` ou `Recommencer ce match`.
  - Livré partiellement: à la fin de la dernière demi-manche, l'application propose d'archiver ou non, ferme le match courant, conserve l'équipe et les joueurs, puis retourne à l'accueil.
- Ajouter les archives à l'accueil contextuel quand la gestion multi-match sera disponible.
  - Redécoupé: les archives vivent maintenant dans `Mes matchs`; l'accueil se concentre sur le match courant non archivé.
- Rejeté pour l'instant: importer/exporter une liste de joueurs.
- Normaliser automatiquement la casse des noms de joueurs à l'ajout, par exemple `marquis grissom` -> `Marquis Grissom`.
- Livré: ajouter un champ optionnel de numéro de chandail à 2 chiffres dans les cartes joueurs de `Équipe`. Le numéro est éditable seulement hors match, comme le nom du joueur. Il apparaît en pastille dans l'alignement et reste disponible pour `Programme`, `Banc`, `Texte`, `Spectateur` et les futurs partages parents/fans.
- Optimiser automatiquement l'alignement la première fois qu'on arrive sur `Alignement` après des changements de joueurs, parce que les ajouts/retraits ne sont pas toujours bien reflétés avant optimisation.
  - Livré: ajout, suppression et présence/absence avant match déclenchent une optimisation automatique à l'arrivée sur `Alignement`.
- À la première arrivée sur `Alignement`, offrir de mélanger l'ordre au bâton avant d'afficher l'alignement, idéalement avec l'option aléatoire comme choix simple et réversible avant le début du match.
- Livré: ajouter une action à la demande pour mélanger l'ordre au bâton avec une icône shuffle près de `Optimiser`. Le mélange optimise automatiquement les positions, mais `Optimiser` seul conserve maintenant l'ordre courant.
- Décision: garder `Match` avant `Joueurs`, parce que l'équipe permanente est maintenant séparée et que les présences/absences se décident dans le contexte d'un match daté.
- Évaluer plus tard une correction de progression avancée. L'interface principale doit d'abord avancer seulement d'une demi-manche à la fois.
- Deuxième passe Alignement: permettre de recommencer un match démarré par erreur tant que le début de 1re manche n'est pas terminé, avec confirmation claire et retour à l'état non commencé.
- Pour `Spectateur`, explorer plus tard un suivi en direct du déroulement du match basé sur la progression courante.
- Dans `Spectateur`, indiquer clairement quand le match n'est pas commencé et placer la vue au début dans ce cas.
- Dans `Spectateur`, informer qu'une nouvelle demi-manche est disponible sans forcément déplacer automatiquement l'utilisateur s'il consultait autre chose.
  - Livré pour le spectateur public: un popup dynamique apparaît une seule fois par nouvelle demi-manche si l’utilisateur consulte une autre étape; il peut afficher le direct ou rester sur place.
- Dans `Spectateur`, retirer les libellés visibles qui répètent `Lecture seule`; le contexte doit suffire.
  - Livré partiellement: les messages publics ne répètent plus `Lecture seule`.
- Dans `Spectateur`, retirer `À venir` des manches futures si le libellé alourdit la lecture.
  - Livré: les manches futures ne répètent plus `À venir`.
- Dans `Spectateur`, ajouter une étape initiale `Programme` avant les manches. Si aucune donnée de manche n'est publiée, cette étape est la seule visible et indique `Alignement à venir`.
  - Livré: le spectateur public affiche une étape `Programme` avec `Alignement à venir` avant le début.
- Dans `Spectateur`, ajouter un état final `Merci, à la prochaine` disponible quand le match est terminé et jusqu'à ce qu'il soit archivé ou supprimé.
  - Livré: le spectateur public affiche un état final quand toutes les demi-manches sont complétées.
- Dans `Spectateur`, permettre d'ouvrir ou générer le `Programme` depuis la vue spectateur.
- Explorer une action explicite pour publier ou mettre à jour l'alignement visible dans le spectateur live, afin d'éviter de publier des informations incomplètes par accident.
- Rejeté pour l'instant: saisir le dernier frappeur côté spectateur; Rallye-Cap utilise normalement la frappe fixe et ce besoin appartiendrait plutôt aux outils coach.
- L'URL permanente d'équipe est remontée en priorité `Spectateurs / Cloud` sous la forme `#fans/{teamPublicId}`.
- Rejeté pour l'instant: dupliquer un match existant. L'usage réel ne justifie pas cette action dans la première version.
- Ajouter un écran de résumé avant impression.
- En mode attaque, afficher les lanceurs de la prochaine manche défensive si applicable.
- En mode défense, afficher les deux premiers frappeurs de la prochaine manche offensive si applicable.
- Livré: harmoniser le look de la vue spectateur avec le reste de l'application, retirer l'en-tête global dans cette vue et afficher les états `En cours`, `Terminée` et `À venir`.

## Match et joueurs

Le découpage actuel sépare la préparation en deux étapes:

- `Match`: adversaire, local/visiteur, date, heure et endroit;
- `Joueurs`: présence/absence des joueurs disponibles pour le match courant.

La gestion durable de notre équipe, de son nom et de son bassin de joueurs est séparée de ce découpage dans `Équipe`, sans devenir une étape du workflow.

À stabiliser:

- initialiser les nouveaux matchs sans date ni heure par défaut;
- retirer la valeur par défaut du toggle `Visiteur` / `Local` pour les nouveaux matchs, afin d’exiger un choix explicite et d’éviter les oublis avant `Prêt à jouer`;
- ajouter le nombre de manches initial dans l'étape `Match`, puisque c'est une propriété du match prévu avant l'ajustement de l'alignement;
- déplacer le réglage `Frappe fixe` dans l'étape `Match`, puisqu'il décrit les règles/configurations du match courant. Il devient non modifiable après le début du match;
- utiliser une heure en format 24h avec intervalles de 5 minutes;
- Livré: `Match` contient maintenant les manches initiales, `Frappe fixe`, l'heure 24h par pas de 5 minutes et une mise en page plus claire sans texte d'aide redondant sur `Équipe`.
- garder `Réinitialiser` pour l'action destructive globale, parce qu'elle efface vraiment toutes les données locales;
- normaliser automatiquement la casse des noms de joueurs à l'ajout;
- garder les actions de modification clairement bloquées quand le match est débuté.

À ne pas changer pour l'instant:

- garder les libellés local/visiteur plutôt que passer à un langage phrase du type `visitent les` / `reçoivent les`. Ce langage est intéressant, mais la grammaire varie selon les noms d'équipe.

## Accueil

Améliorations UX à prévoir:

- états du match:
  - `Aucun match prévu`;
  - `En préparation`;
  - `En cours`, avec la demi-manche courante affichée.
- dans le détail du match, afficher date, heure et endroit;
- Livré: l'accueil utilise `Aucun match prévu`, `Préparer un match`, `Match en préparation` et `En cours` avec la demi-manche courante, et affiche date, heure et endroit quand disponibles.
- Livré: la carte de contexte `Équipe active` affiche `Aucune équipe` quand aucune équipe n'existe et ouvre la modale pour changer ou créer une équipe.
- Livré: la boîte d'équipe permet d'éditer le nom directement dans son titre, met `Ajouter des joueurs` en action primaire et ne contient plus de bouton `Préparer un match`.
- Livré: le compteur de joueurs de la boîte d'équipe est placé à droite juste au-dessus de la liste.
- Livré: quand un match courant non archivé existe, l'accueil affiche quatre cartes workflow cliquables: `Match`, `Joueurs`, `Alignement` et `Jouer`.

## Équipe et joueurs

Améliorations UX à prévoir:

- Livré: ajouter le numéro de chandail optionnel dans `Équipe`, éditable seulement avant match;
- Livré: `Équipe` affiche un compteur de joueurs juste au-dessus du bassin.
- Livré: pendant un match commencé, `Équipe` affiche une note expliquant que le bassin permanent est verrouillé jusqu'à la fin ou l'archivage du match.
- Livré: l'action de suppression d'un joueur dans `Équipe` utilise une icône `×` plutôt qu'une poubelle.
- Livré: `Équipe` offre une action contextuelle pour préparer un match ou modifier le match courant, et `Mes matchs` offre `Créer un match` quand aucun match non archivé n'est actif.
- Livré: l'étape `Joueurs` permet d'ajouter rapidement un joueur à l'équipe et au match courant avant le début, sans quitter le workflow.
- Livré: l'action `Créer une équipe exemple` est placée sous la liste des joueurs et son avertissement précise que l'équipe, les matchs et les archives locales sont remplacés.
- Livré: `Joueurs` utilise une liste unique; les présents sont verts, les absents gris, sans pastille textuelle.
- Livré: quand plus de 12 joueurs existent dans le bassin ou sont collés dans la liste, les joueurs excédentaires restent visibles comme absents au lieu d'être perdus.
- Livré partiellement: `Joueurs` ne contient plus `Frappe fixe`.

## Alignement

- L'ordre des frappeurs se modifie directement dans le tableau principal en glissant les joueurs.
- Livré: `Frappe fixe` vit dans l'écran `Match`, car elle fait partie des paramètres du match courant.
- L'interface doit indiquer que `Frappe fixe` est normalement activée en Rallye-Cap.
- Les validations et l'équité suivent le tableau principal pour servir de rétroaction après l'ajustement.
- Simplifier la densité de l'écran `Alignement`:
  - consolider l'introduction, les actions de préparation et le tableau dans une seule carte;
  - retirer le pill de statut redondant quand le bouton de progression et le tableau indiquent déjà l'état;
  - placer `Mélanger`, `Optimiser` et `Prêt à jouer` au-dessus du tableau;
  - garder `Commencer/terminer la demi-manche` et `Changement de joueurs` dans `Jouer`;
  - garder une section `Validation` visible comme verdict rapide;
  - afficher les règles obligatoires avec `check` ou `x`;
  - afficher l'équité avec `check`, `warning` ou `x`;
  - renommer `Problèmes et suggestions` en `Suggestions`;
  - afficher `Suggestions` seulement quand il y a des actions concrètes à proposer;
  - regrouper les cartes d'équité et le tableau détaillé dans une section `Statistiques et équité`;
  - garder les cartes d'équité dans cette section, idéalement repliée par défaut.
  - Livré partiellement: `Suggestions` est renommé et masqué quand il n'y a rien d'actionnable; les cartes d'équité et le tableau sont regroupés dans `Statistiques et équité`.
- Livré: stabiliser la taille des boutons `Mélanger`, `Optimiser`, `Commencer` / `Terminer...`, `Changement de joueurs` et des boutons `+` / `-` de manches afin que l'interface ne bouge pas selon le texte.
- Livré: la pastille de rang dans la colonne `Ordre` utilise une couleur plus neutre pour ne pas ressembler à une erreur.
- Livré: remplacer l'icône seule de shuffle par le libellé texte `Mélanger`.
- Remplacé: l'ancien toggle local `Préparer` / `Jouer` a été retiré au profit de deux étapes officielles partageant le même tableau.

## Archives

Améliorations UX à prévoir:

- ne pas afficher les détails d'une archive par défaut;
- permettre de fermer le détail d'une archive ouverte;
- ajouter éventuellement un tri par date ascendant/descendant;
- ajouter éventuellement de la pagination quand la liste devient longue;
- ajouter éventuellement des filtres par équipe/adversaire.

## Publication optionnelle en ligne

Firebase/Firestore est une avenue prometteuse pour publier un match spécifique tout en gardant l'application locale par défaut.

Modèle souhaité:

- local-first: rien n'est envoyé en ligne tant que l'entraîneur ne publie pas le match;
- publication explicite d'un seul match;
- lien ou QR code vers une version consultable;
- deux vues futures: archive privée complète pour l'entraîneur et projection publique limitée pour les parents;
- la projection publique doit être dérivée d'un snapshot de match, pas du bassin d'équipe courant;
- données publiques minimales: prénoms, numéros si disponibles, ordre, positions, infos de match;
- accès public seulement aux personnes qui ont le lien;
- vue fans en lecture seule avec informations limitées comme minimum;
- mode assistant modifiable à évaluer plus tard;
- possibilité de dépublier ou remplacer le lien plus tard.
- Livré: URL fixe d'équipe `#fans/{teamPublicId}` qui affiche une projection publique limitée du bassin permanent et liste les matchs publics en ordre chronologique, sans remplacer les liens de match `#public/{publicId}`;
- interface de connexion plus standard, incluant un bouton Google reconnaissable avec icône;
- actions cloud guidées: quand une sauvegarde, une liste de matchs ou une publication requiert une connexion, l'app devrait proposer de se connecter au lieu de laisser l'utilisateur deviner.

Notes de coût:

- Firebase/Firestore offre un palier sans frais qui semble suffisant pour un prototype et une petite utilisation d'équipe.
- Les quotas et prix peuvent changer; vérifier la page officielle Firebase avant de dépendre du service.

Points à définir avant implémentation:

- format exact des documents Firestore privé/public;
- règles de sécurité pour empêcher la modification non autorisée;
- stratégie `publicId` non devinable et `editToken` local;
- durée de conservation ou suppression manuelle;
- comportement hors ligne quand un match publié ne peut pas être synchronisé.

## Partage parents et vues fans

À explorer:

- `Programme`: ajouter une première page style poster avec les équipes, date, heure, joueurs présents et numéros de chandail, avec une composition visuelle baseball en arrière-plan.
- Évaluer si le `Programme` doit devenir un PDF multi-page plutôt qu'une seule image quand on ajoute une page poster et que le contenu doit éviter les coupures.
- Livré: les favoris joueur dans les vues publiques couvrent l'intention de suivre un joueur précis.
- La vue fan joueur est probablement une vue partageable en ligne ou une extension de `Spectateur`; la forme exacte reste à explorer plus tard.

## Sortie Texte

Un export `Texte` minimal est disponible dans `Partager` pour imprimer rapidement un alignement de dernière minute avec une petite imprimante, l'application Funny Print ou une autre application.

Objectifs livrés:

- format texte brut, sans HTML;
- lisible sur papier étroit;
- priorité aux informations utiles en match;
- facile à copier dans une autre application.

À améliorer:

- Afficher le texte généré dans un champ éditable avant la copie. Les modifications manuelles ne sont pas sauvegardées dans l'état du match.
- Séparer la génération du texte et l'action `Copier`, afin de permettre une correction rapide avant d'envoyer vers Funny Print.

Contenu actuel:

- équipe, adversaire, date ou terrain si utile;
- ordre des frappeurs;
- défensive par manche;
- lanceurs clairement visibles;
- banc par manche;
- très peu de décoration.

## Changement de joueurs sur mobile: priorité

L'application doit aider l'entraîneur à ajuster rapidement un match déjà préparé quand la liste réelle change juste avant ou pendant le match, surtout sur téléphone.

Objectif UX:

- permettre un changement en quelques gestes;
- rester lisible et utilisable sur un petit écran, possiblement au banc ou près du terrain;
- éviter de demander une raison détaillée;
- montrer clairement l'impact sur les manches, le banc, l'ordre des frappeurs et l'équité;
- préserver le plus possible les ajustements manuels déjà faits.
- demander une confirmation avant les opérations qui peuvent modifier beaucoup l'alignement, comme recalculer plusieurs manches ou remplacer plusieurs assignations manuelles.
- expliquer brièvement ce qui sera conservé, ce qui sera recalculé et quelles manches sont touchées avant de confirmer un gros changement.

Cas à couvrir:

- absence de dernière minute d'un joueur prévu;
- retard d'un joueur prévu;
- ajout de dernière minute d'un joueur disponible;
- substitution ou remplacement temporaire;
- joueur qui quitte ou se blesse en cours de match;
- joueur présent qui n'était pas prévu au départ.

Comportement souhaité:

- conserver le plus possible l'alignement déjà ajusté manuellement;
- conserver les manches déjà jouées ou déjà confirmées;
- recalculer seulement les manches futures ou ce qui devient invalide;
- afficher clairement les impacts sur l'ordre des frappeurs, les positions, le banc et l'équité;
- permettre de revenir à la liste initiale si l'ajustement était temporaire.

Statuts possibles:

- actif;
- retardé ou pas encore disponible;
- absent ou retiré du match;
- ajouté au match;
- inactif hors match.

Il n'est pas nécessaire de distinguer les raisons dans l'app. Une absence, un retard, une blessure, un départ, un joueur prêté à l'autre équipe ou une autre indisponibilité peuvent être traités comme un changement de disponibilité. Un joueur emprunté ou présent sans être prévu est traité comme ajouté au match.

Comportement livré:

- progression de match directement dans `Jouer`;
- bouton `Commencer le match`, puis action simple pour terminer la demi-manche courante;
- avancement seulement vers l'avant, sans retour arrière dans l'interface principale;
- tableau principal séparé en demies-manches `Début` / `Fin` avec icônes `🏏` attaque et `🧤` défensive selon visiteur/local;
- glisser-déposer de l'ordre qui déplace les lignes complètes avant le début du match;
- `Optimiser` désactivé quand le match est commencé;
- `Optimiser` préserve l'ordre au bâton courant avant le match;
- bouton shuffle pour mélanger l'ordre au bâton avant le match et optimiser automatiquement les positions;
- lignes du tableau principal stables par joueur après le début du match, avec rang courant dans la première colonne;
- snapshots d'ordre au bâton pour les demies-manches offensives jouées afin de préserver l'historique;
- ajout direct d'un joueur en match commencé après choix de la demi-manche d'effet; le remplacement reste une action séparée;
- remplacement qui substitue les joueurs dans l'ordre et les assignations futures;
- retrait d'un joueur actif avec avertissement, sans toucher aux demi-manches jouées;
- obligation de remplacer un joueur si seulement 6 joueurs sont actifs.

## Changements en cours de match à surveiller

Ces scénarios sont importants à long terme, mais ils sont moins prioritaires pour la première version cloud parce que le flux actuel est considéré suffisamment utilisable et devrait être peu fréquent au départ.

- Quand toutes les demi-manches sont terminées, l'application doit permettre de terminer le match et de préparer un nouveau match avec les mêmes joueurs. Présentement, l'entraîneur peut se retrouver bloqué dans un état de match terminé.
  - Livré partiellement: la fin de match propose maintenant d'archiver ou non et retourne à l'accueil.
- Après ajout ou retrait de joueurs, l'alignement peut rester dans un état mal ajusté tant que l'utilisateur ne clique pas manuellement sur `Optimiser`.
  - Livré partiellement: avant match, l'arrivée sur `Alignement` optimise automatiquement après des changements de joueurs quand 6 à 12 joueurs sont actifs.
- Quand plus de 12 joueurs sont entrés, l'application semble rendre seulement 12 joueurs actifs. Les joueurs excédentaires devraient plutôt apparaître comme absents ou inactifs, sans être perdus ni invisibles.
  - Livré: les joueurs excédentaires restent visibles comme absents.
- Il semble y avoir des bogues quand un joueur redevient présent après avoir été absent ou inactif. À valider avec les nouvelles règles d'ordre.
- Retirer ou désactiver un joueur pendant un match peut laisser des manches futures avec moins de 6 positions assignées et rendre l'alignement difficile à corriger.
  - Première correction livrée: générer une suggestion pour insérer un joueur du banc dans une position manquante et permettre de cliquer une cellule `BANC` pour remplir automatiquement une position manquante.
  - Livré: une alerte apparaît dans `Alignement` au-dessus du tableau quand des manches défensives futures sont incomplètes. Elle nomme les manches touchées et offre `Remplir les positions possibles` quand un joueur au banc peut être assigné.
  - À évaluer plus tard: ajouter une ligne ou zone `Positions non assignées` en bas du tableau.
- En match débuté, permettre de modifier manuellement les positions des manches futures sans toucher aux demi-manches déjà complétées.
  - Livré: le tableau d'`Alignement` reste interactif pour les demi-manches futures; les demi-manches complétées restent grisées et non modifiables.
- Remplacer un joueur pendant un match doit préserver l'historique du joueur remplacé dans les demi-manches jouées, ajouter une ligne pour le nouveau joueur, retirer l'ancien joueur de l'ordre futur et retirer l'ancien joueur des assignations défensives futures.
  - Première correction livrée: les joueurs inactifs qui ont de l'historique verrouillé restent visibles dans le tableau, les snapshots de frappe verrouillés peuvent afficher un ancien joueur, et le nouveau joueur apparaît sous le joueur remplacé pour les manches futures.
- Exposer les changements de joueurs directement dans `Alignement`, sans retourner dans `Joueurs`.
  - Livré: un bouton unique dans `Alignement` ouvre `Retirer`, `Remplacer` ou `Ajouter`, puis demande la demi-manche d'effet.
- Retirer l'action `Remplacer` de l'étape `Joueurs` avant match.
  - Livré: l'étape `Joueurs` n'affiche plus d'action directe `Remplacer`; le remplacement reste disponible dans les changements de joueurs en cours de match.
- Vérifier que le moteur respecte les règles obligatoires avant les objectifs d'équité.
  - Livré: `tests/rules.html` couvre les règles obligatoires, les positions défensives dupliquées ou inconnues, le blocage du démarrage sans manche préparée et le blocage du démarrage avec une manche incomplète.

Irritants UX à corriger:

- Le texte d'introduction devrait mieux nommer la promesse produit: un alignement clair et équitable pour le banc, facile pour les entraîneurs et beau pour les parents.
- Rendre la demi-manche courante plus évidente dans `Alignement`.
- Retirer l'icône du lien `Partage` dans le menu global.
- Dans `Match`, retirer le texte d'aide redondant `Crée le contexte du match courant.`
- Dans `Équipe`, clarifier le modèle du bouton `Sauvegarder`: soit sauvegarde automatique cohérente partout, soit action explicite cohérente, avec une décision particulière pour la sauvegarde cloud.
- Livré: `Réinitialiser` utilise le message `Toutes tes équipes, joueurs et matchs seront supprimés pour toujours. Continuer?`
- Livré: `Mes matchs` sert à la sauvegarde et à la reprise des matchs cloud; `Spectateurs en direct` dans `Partager` sert au lien pour les fans.
- Livré: les actions disponibles localement sont dans `Exports`; les actions qui exigent une connexion sont dans `En ligne`.
- Dans `Spectateur`, afficher les deux lanceurs sur deux lignes séparées pour obtenir 6 éléments visuels comme l'ordre de frappe.
- Livré: `L1` et `L2` sont affichés sur deux lignes distinctes dans `Spectateur`.
- Livré: les libellés `L1 🧢` et `L2 🧢` ne se coupent plus sur deux lignes dans les cartes publiques mobiles.
- Livré: le bouton d'échange `Local` / `Visiteur` reste stable quand on inverse les côtés.
- Livré: les actions des cartes joueurs restent sur une seule ligne.
- Livré: le curseur de glisser-déposer des joueurs utilise une main.
- Livré: les icônes de demi-manche sont centrées dans les entêtes du tableau principal.
- Livré: cliquer sur l'en-tête `Ordre` désélectionne le tableau principal.

Évolutions de règles / validations:

- Au démarrage du match, bloquer si le nombre de joueurs actifs n'est pas entre 6 et 12. Pour les autres règles ou problèmes d'alignement, afficher un avertissement et permettre à l'entraîneur de continuer après confirmation.

Bugs de sélection du tableau:

- Livré: sélectionner un joueur surligne toute sa ligne dans `Alignement`.
- Livré: sélectionner une cellule surligne la ligne du joueur et seulement la colonne de la demi-manche concernée.
- Livré: les entêtes de demi-manche sélectionnent seulement leur demi-manche; l'entête de manche complète ne sélectionne plus les deux colonnes.
- Livré: cliquer sur `Ordre` désélectionne toute sélection active.

Questions fermées:

- Correction manuelle rapide des positions manquantes: le chemin existant par suggestion et clic sur une cellule `BANC` est considéré suffisant pour l'instant. Une zone `Positions non assignées` reste une amélioration possible si ce flux devient trop lent sur téléphone.

## Bugs et dettes connues

- La couverture CLI comprend maintenant les modules purs existants, les invariants de génération, les cas limites principaux de changements de joueurs, la fin de match et les contrats visibles des exports. Les projections publiques demandent encore une couverture automatisée plus complète.
- Les exports peuvent diverger de l'affichage principal parce qu'ils reconstruisent leur propre HTML.
- Livré: le champ de mot de passe de `Spectateurs en direct` utilise maintenant un champ texte avec `autocomplete="off"` et des noms d'inputs dédiés afin de réduire les propositions de sauvegarde du gestionnaire de mots de passe Chrome.
- À surveiller: Chrome peut encore proposer de sauvegarder le code si le navigateur détecte malgré tout un flux d'authentification; dans ce cas, il faudra remplacer le champ par un contrôle encore plus personnalisé.
- Livré: le placeholder du mot de passe `Spectateurs en direct` est `ex. Youppi!`; le champ est verrouillé après création du lien et se réactive quand le lien est retiré.
- Livré: le `Message aux fans` peut être modifié pendant un match actif, affiche les indications mini-Markdown dans l'interface et montre un aperçu.
- Livré: l'export `Texte` présente maintenant un aperçu éditable avant la copie.
- Livré: l'équipe exemple des Expos de 1994 inclut les numéros de chandail du roster 1994.
- Livré: ajout d'un `Message aux fans` dans l'onglet `Match`, avec mini-Markdown limité, affiché dans l'étape publique `Programme` et dans l'export image `Programme`.
- Livré: l'image parents s'adapte mieux aux longues listes et aux noms longs avec ordre sur deux colonnes, sections aérées et retours de ligne contrôlés.
- Livré: les partages sont simplifiés en `Banc`, `Programme` et `Texte`; le partage courriel est retiré.
- Livré: l'export `Banc` imprime un tableau simple avec une ligne par joueur et deux sous-colonnes par manche, `🏏` et `🧤`; la colonne frappe reste vide quand la frappe fixe est désactivée.
- Livré: l'image parents est réorganisée chronologiquement par manche avec une colonne d'icône compacte, frappeurs `1` à `6` en frappe fixe et positions défensives harmonisées dans l'ordre `L1`, `L2`, `AC`, `1B`, `2B`, `3B`.
- Livré: les fichiers d'export parents utilisent un nom simple avec date et équipes, par exemple `2026-06-15_expos_padres.png`.
- Les comportements de presse-papiers et de fenêtres surgissantes varient selon le navigateur.
- `app.js` contient encore trop de responsabilités: état, moteur d'alignement, rendu, exports et interactions.

## Décisions à prendre

- Rester en app statique pure ou introduire un petit outil de build.
- Garder les caractères typographiques (`’`, `—`, `✔`) ou préférer une ponctuation plus simple en UTF-8.
- Définir le comportement exact quand un joueur est retiré après des ajustements manuels.
- Livré: Playwright avec Chromium bureau et mobile est la stratégie de tests navigateur; Firebase et les API variables du navigateur restent hors du premier périmètre.

## Décisions prises

- Les archives de matchs passés seront verrouillées en lecture seule. Elles servent à consulter l'historique, pas à modifier rétroactivement un alignement.
- L'archivage des matchs sera déclenché par une action manuelle, pas automatiquement.
- Les exports ne sont pas stockés dans les archives; ils sont régénérés à partir du snapshot figé.
- La publication en ligne doit au minimum supporter un mode spectateur en lecture seule avec informations limitées.
- Les exports et publications sont regroupés dans une section `Partager`.
- La vue terrain est retirée de l'expérience principale.

## Livré

- Documentation produit, technique, roadmap et notes pour agents.
- Documentation de la structure du site et des pistes d'optimisation UX.
- Découpage statique: `index.html`, `styles.css`, `app.js`.
- Section `Partager` séparée pour les exports.
- Retrait de la vue terrain de l'expérience principale.
- Contrôles visibles pour ajouter ou retirer une manche dans l'écran d'alignement.
- Module `rules.js` pour valider les règles obligatoires.
- Base de tests navigateur dans `tests/rules.html`.
- Encodage UTF-8 documenté; les faux diagnostics causés par l'affichage PowerShell sont identifiés.
- Actions rapides `Charger l'exemple` et `Voir l'alignement` retirées de l'en-tête principal.
- Changements de vue qui ramènent l'utilisateur en haut de la page.
- Action `Optimiser` placée près du tableau principal.
- Boutons de navigation doublés retirés des sections `Alignement`, `Partager` et `Spectateur`.
- Boutons `Continuer` ajoutés en bas des étapes du flux principal.
- Affichage `Visiteur` / `Locale` intégré près des noms d'équipes, avec inversion automatique entre l'équipe et l'adversaire.
- Gestion séparée de l'ordre retirée; l'ordre se modifie dans le tableau principal de l'alignement.
- Option `Frappe fixe` déplacée dans l'écran `Match`, avec l'indication que le mode est normalement activé en Rallye-Cap.
- `Alignement` consolidé: les actions principales sont au-dessus du tableau, sans pill de statut ni sous-titre `Tableau principal`.
- `Optimiser` conserve maintenant l'ordre de frappe courant au lieu de revenir à l'ordre initial des joueurs enregistrés.
- Bouton shuffle ajouté près de `Optimiser` pour mélanger l'ordre de frappe avant match et optimiser les positions automatiquement.
- Validations et équité déplacées après le tableau principal.
- Ajout/retrait de manches intégré à la dernière manche du tableau principal avec des icônes `-` et `+`.
- Action `Régénérer` renommée `Optimiser`; le bouton devient grisé après optimisation et se réactive lors d'une modification manuelle.
- Export texte brut compact ajouté pour Funny Print ou une petite imprimante.
- Le partage `Texte` suit maintenant l'ordre visiteur/local des demi-manches comme la vue spectateur.
- Le spectateur autonome a été retiré de `Partager`; le partage externe utilise maintenant un lien public en lecture seule.
- En mode frappe variable, les rangs de frappe par manche et les listes de frappeurs par manche sont retirés du tableau, des exports et du spectateur.
- Les cartes d'équité sont harmonisées entre les modes avec `Temps de jeu`, `Variété des positions` et `Indice global`; `Présences au bâton` apparaît seulement en frappe fixe.
- `Temps de jeu` inclut les présences au bâton en frappe fixe, mais seulement la défensive en frappe variable.
- En mode frappe variable, les présences au bâton sont retirées des scores d'équité et les colonnes `AB` / `Total` sont retirées des statistiques.
- Workflow livré: `Match`, `Joueurs`, `Alignement`, `Jouer`; `Partager` reste une action non numérotée.
- `Accueil` contextuel livré pour créer l'équipe initiale, reprendre un match ou créer un nouveau match.
- `Équipe` hors workflow livré pour gérer le nom de notre équipe et le bassin de joueurs.
- Le hero de présentation apparaît seulement dans `Accueil`.
- Les cartes de contexte de l'accueil affichent le nom de l'équipe, les joueurs, les matchs en préparation, en cours, terminés et archivés. Les cartes à zéro pour `En préparation` et `En cours` ne sont pas cliquables; `Terminés` et `Archivés` mènent à `Mes matchs`.
- L'accueil garde un seul bouton d'action principal selon l'état courant.
- `Partager` et `Spectateur` sont sortis des étapes numérotées.
- `Spectateur` masque maintenant l'en-tête global et le workflow numéroté, et utilise la palette visuelle du site.
- L'exemple est retiré de l'accueil et du menu principal; il reste seulement dans `Équipe` comme création d'équipe exemple.
- La route officielle `#jouer` porte la gestion active; aucune ancienne route n’est maintenue par redirection.
- `Jouer` affiche la demi-manche courante et permet d'avancer seulement vers la prochaine demi-manche.
- Les informations de match, la liste des joueurs et l'alignement partant sont verrouillés après le début du match.
- L'étape `Joueurs` permet de basculer `Présent` / `Absent` en cliquant directement la carte du joueur; l'ajout, le renommage et la suppression de joueurs sont déplacés dans `Équipe`.
- L'action `Remplacer` est retirée de l'étape `Joueurs` avant match; elle reste disponible dans le flux de changement de joueurs en cours de match.
- Le menu du haut est réduit aux actions globales; `Matchs` et le partage s'ouvrent depuis leur contexte, et les vues spectateur passent par les routes publiques.
- Les entêtes de demi-manche du tableau principal gardent seulement les icônes bâton et gant.
- Le bloc `Ajouter des joueurs` est déplacé dans `Équipe`, hors workflow.
- Livré: supprimer une équipe supprime aussi ses matchs locaux et tente de retirer les liens cloud/public connus.
- Livré: les modales de partage en ligne bloquent les champs de lien et de mot de passe avant connexion, affichent `Connexion` en vert, et utilisent `Créer le lien` comme action primaire quand connecté.
- Livré: l'inventaire des boutons documente les couleurs vert primaire, blanc secondaire et rouge danger.
- Livré: la modale `Lien d'équipe` est réduite à deux états sans boîte intermédiaire: lien existant avec copier/retirer, ou création avec identifiant obligatoire, mot de passe optionnel et bouton `Créer le lien`.
- Livré: la carte du match courant sur `Accueil` expose les icônes lien et poubelle pour partager ou supprimer le match courant.
- Livré: la modale `Partager le match` est réorganisée en `Lien Match`, `Gérer en ligne` pour l'édition/synchronisation cloud privée, puis `Exports` avec descriptions sous chaque document.
- Livré: les descriptions précisent que `Lien Match` peut être partagé directement ou apparaître dans le lien d'équipe, tandis que `Gérer en ligne` sert au coach pour l'alignement et la synchronisation.
- Livré: dans `Joueurs`, l'ajout d'un joueur est placé sous les listes de présence et la mention redondante sur la suppression est retirée.
- La création d'équipe exemple est bloquée pendant un match débuté.
- Le démarrage de la progression du match bloque si le nombre de joueurs actifs n'est pas entre 6 et 12. Les autres problèmes d'alignement ou de règles affichent un avertissement avec confirmation.
- Le workflow possède une quatrième étape `Jouer`; `Alignement` se limite à la préparation et devient en lecture seule après le départ.

## Livré: refactor multi-match v5

- Stockage local basculé vers `rallye_cap_qc_v5`.
- Décision de développement: aucun vieux modèle de données n'est supporté avant la mise en production. Aucune migration, compatibilité ou réparation automatique d'anciens états ne doit être ajoutée tant que l'app n'a pas d'utilisateurs de production.
- `teamProfile`, `roster`, `matches` et `activeMatchId` deviennent la structure officielle.
- `Mes matchs` remplace la logique séparée `Mes matchs` / `Archives`.
- Livré: `Mes matchs` utilise maintenant un seul tableau triable pour tous les statuts.
- Les matchs locaux et cloud sont fusionnés dans les tableaux; les matchs seulement en ligne sont importés localement à l'ouverture.
- Les lignes de `Mes matchs` sont cliquables pour ouvrir le match; les actions sont des icônes avec titres accessibles.
- Livré: les actions de ligne sont simplifiées à `Partager`, `Archiver` quand applicable et `Supprimer` avec une poubelle; `Actualiser`, `Mettre en ligne`, `Retirer du cloud` et l'accès direct `Spectateur` ont été centralisés ou retirés.
- Livré: `Jouer` est une quatrième étape officielle. `Prêt à jouer` valide et fige un état `ready`; la publication facultative et le démarrage se font ensuite dans `Jouer`. La vue complète réutilise le tableau unique et la vue simple reprend le suivi par demi-manche. `Alignement` devient lecture seule après le départ et aucune ancienne route n’est redirigée.
- Livré: `Prêt à jouer` ouvre `Jouer`, seule étape qui démarre et avance la partie; la Vue simple masque le workflow et les détails superflus.
- Livré: un match terminé est affiché comme tel sur l'accueil et ne verrouille plus l'édition de l'équipe permanente.
- Livré: la création d'un lien d'équipe refuse transactionnellement tout identifiant déjà existant, même pour le même compte.
- Corrigé: un identifiant d'équipe refusé ne peut plus être affiché localement comme un lien actif et l'erreur Firestore n'est plus remplacée par la réouverture de la modale.
- Corrigé: les créations, mises à jour et suppressions de liens sont isolées par équipe active; les doublons locaux issus du bug précédent sont nettoyés sans supprimer le document de l'équipe propriétaire.
- Corrigé: une erreur de création de lien d'équipe reste affichée dans la modale sans fermer le formulaire ni persister les champs.
- Les archives sont maintenant des matchs `archived` en lecture seule.
- Stabilisé: l'action `Archiver` est disponible seulement pour les matchs terminés; un match en préparation ou en cours doit être terminé ou supprimé.
- `Partager` reste limité au match actif et ne contient plus de reprise d'édition cloud.
- Stabilisé: un nouveau match est créé seulement par action explicite, copie les joueurs de l'équipe, démarre sans date/heure/adversaire/endroit et apparaît immédiatement dans `Mes matchs`.
- Stabilisé: le raccourci du header ignore les archives, affiche `Match en cours` pour un match actif et `Match terminé` pour un match complété.
- Stabilisé: les tableaux `Mes matchs` utilisent les colonnes `Adversaire`, `Date / heure`, `Endroit`, `Statut`, `Modifié`, `Actions`; `Modifié` est formaté `YYYY-MM-DD HH:mm`.

Dette restante: nettoyer le code mort hérité des anciennes archives et extraire la couche d'état v5 hors de `app.js` quand le modèle sera validé manuellement.

## Livré: Banc des jeunes en direct

- Ajout du lien `#banc/{publicId}`, synchronisé avec le lien Match et protégé par le même mot de passe.
- Ajout des panneaux `Maintenant`, `Ensuite` et `Mission encouragement`, d'une grille défensive adaptative avec noms de positions complets et des états d'attente, dernière manche, fin et hors ligne.
- Ajout de tests navigateur ciblés dans `tests/bench.html`.
- Livré: palette contextuelle verte pour `Maintenant`, jaune pour `Ensuite`, codes `L1`/`L2` retirés quand les noms complets sont présents et casquette utilisée dans l’attente.
- Livré: à `ready`, un lien Match existant publie l’alignement complet sans créer de nouveau partage; toute invalidation le masque de nouveau.
- Livré: derniers ajustements de densité — compteur Équipe au-dessus des joueurs, absents grisés sans pastille, tirets saisissables dans l’identifiant public et carte d’introduction masquée en Vue simple.
