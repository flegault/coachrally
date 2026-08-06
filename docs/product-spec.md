# Spécification produit

## Objectif

L'application aide un entraîneur Rallye-Cap à préparer rapidement un alignement clair pour un match: ordre des frappeurs, défensive par manche, équité de temps de jeu et supports partageables.

Promesse UX:

- clair et équitable pour le banc;
- facile pour les entraîneurs;
- beau et lisible pour les parents.

## Public cible

- Entraîneurs qui préparent l'alignement avant le match.
- Assistants qui consultent les positions pendant le match.
- Parents qui reçoivent une version simple à lire.

## Parcours principal

Le workflow cible suit la réalité du match et limite les retours en arrière une fois la partie commencée:

1. `📅 Match`: entrer les informations du match: adversaire, date, heure, endroit, nombre de manches initial, frappe fixe, local ou visiteur.
2. `👨‍👩‍👦‍👦 Joueurs`: indiquer quels joueurs du bassin permanent sont présents ou absents pour ce match.
3. `📋 Alignement`: optimiser, ajuster manuellement et confirmer `Prêt à jouer`.
4. `⚾ Jouer`: démarrer la partie, suivre la progression et gérer les changements de joueurs en vue complète ou simple.

`Partager` reste une action non numérotée du match courant pour les exports et le lien spectateur.

Le mode spectateur est une vue simplifiée en lecture seule accessible depuis `Partager le match` quand le match sélectionné est admissible. Il n'est plus une étape du workflow principal.

`Accueil` est une porte d'entrée contextuelle hors workflow. Si aucune équipe n'est définie, l'accueil dirige vers sa création. Créer ou modifier l'équipe ne crée jamais automatiquement un match. Quand un match courant existe, l'accueil présente quatre cartes: `Match`, `Joueurs`, `Alignement` avec `Vérifier et ajuster`, puis `Jouer` avec `Gérer la partie`. Son résumé affiche le nombre de joueurs présents; la carte Équipe affiche le nombre de joueurs permanents en pastille.

L’heure du match est saisie avec deux menus `Heure` et `Minutes`, par pas de cinq minutes, mais reste stockée sous la forme optionnelle `HH:mm`. L’étape `Joueurs` utilise une seule liste: présents d’abord, absents grisés ensuite, sans pastille textuelle, avec bascule au clic.

Le hero de présentation apparaît seulement sur `Accueil`. Quand un match courant non archivé existe, les cartes de l'accueil suivent le workflow: la carte `Informations` résume adversaire, date, heure et endroit; la carte `Joueurs` résume présents et absents; la carte `Alignement` ou `Jouer` ouvre le tableau. La carte du match courant expose aussi deux actions compactes: lien pour ouvrir `Partager le match`, et poubelle pour supprimer le match courant avec ses données en ligne connues et son lien spectateur. Après le chargement cloud, le compteur `Matchs` doit inclure immédiatement les matchs en ligne de l'équipe active et devenir cliquable. Si aucun match local n'est actif et qu'un seul match cloud non terminé peut être repris, l'accueil affiche `Match en ligne à reprendre` et l'importe seulement lorsque l'utilisateur clique `Reprendre le match`. Avec plusieurs matchs cloud à reprendre, l'accueil renvoie vers `Matchs`. L'accueil doit afficher un seul bouton d'action principal selon l'état courant.

La gestion de notre équipe et de son bassin permanent de joueurs est séparée du workflow de match. Le nombre de joueurs est affiché à droite immédiatement au-dessus de la liste. Le lien d’équipe accepte un message public de 300 caractères avec le même mini-Markdown que le message de match, prérempli avec `Merci de nous encourager!`. Les identifiants publics utilisent lettres minuscules, chiffres et tirets; un tiret final temporaire reste permis pendant la saisie, puis la valeur est normalisée à la création.

Depuis `Accueil`, l'utilisateur peut préparer un nouveau match dans la carte de match quand aucun match non archivé n'est actif. Depuis `Matchs`, une action `Créer un match` doit être offerte quand l'équipe est complète et qu'aucun match non archivé n'est actif.

L'ajout de joueurs utilise le même modal depuis la boîte d'équipe dans `Accueil` et depuis l'étape `Joueurs`. Le numéro de chandail peut être saisi en même temps avec des formats simples comme `#27 Émile`, `27 Émile` ou `Émile #27`. Depuis la boîte d'équipe, le joueur est ajouté au bassin permanent et comme absent dans tous les matchs non commencés de cette équipe. Son nom et son numéro de chandail restent synchronisés avec ces matchs tant qu'ils ne sont pas commencés. Les matchs commencés, terminés ou archivés restent figés. Dans `Joueurs`, le raccourci `Ajouter un joueur à l'équipe` est placé sous la liste unique; il ajoute aussi le joueur au bassin permanent et aux matchs non commencés, mais le rend présent dans le match courant s'il y a moins de 12 joueurs présents. Sinon, il demeure absent. Rendre ensuite ce joueur présent invalide au besoin l'état `Prêt à jouer`; la première arrivée dans `Alignement` régénère la défensive sans retirer le joueur de l'ordre.

Hiérarchie des actions:

- `brandBtn` / primaire: une seule action principale par écran ou par carte de travail. Elle représente la prochaine étape évidente du workflow ou l'action qui fait avancer le match.
- `secondary`: navigation contextuelle, exports, actions utiles mais non obligatoires, ou actions qui ne devraient pas détourner du flux principal.
- `danger`: actions destructives ou irréversibles comme réinitialiser, retirer un lien public ou supprimer.
- Icônes seules: actions répétitives ou compactes dans les tableaux, avec `title` et `aria-label` explicites.
- `Accueil`: les actions de création d'équipe ou de préparation d'un nouveau match peuvent être primaires. Quand un match actif existe, les cartes de workflow servent de navigation principale.
- Boîte d'équipe dans `Accueil`: `Ajouter des joueurs` est primaire. La suppression d'équipe reste une icône destructive discrète dans l'en-tête de la boîte, près du lien public.
- `Matchs`: `Créer un match` peut être primaire seulement quand aucun match non archivé n'est actif. Les actions de ligne restent en icônes.
- `Match` et `Joueurs`: `Continuer` est primaire parce qu'il suit le workflow.
- `Alignement`: `Prêt à jouer` est primaire. `Mélanger` et `Optimiser` restent secondaires. Le démarrage et l’avancement du match appartiennent exclusivement à `Jouer`.
- `Partager le match`: `Créer le lien` et `Connexion` sont primaires quand ils sont l'action attendue; `Programme`, `Banc`, `Texte`, `Copier`, `Fermer` et la navigation du toggle `Gérer en ligne` restent secondaires; `Retirer le lien` est danger.
- `Spectateurs en direct`: la navigation reste simple; `Suivant` peut être primaire, tandis que `Précédent` et `Manche en cours` restent secondaires.

Inventaire des boutons et couleurs:

- Vert primaire: `Créer une équipe`, `Créer un match`, `Ajouter des joueurs`, `Continuer`, `Commencer`, `Suivant`, `Créer le lien`, `Connexion`, `Confirmer` quand l'action crée un exemple.
- Blanc secondaire: `Annuler`, `Fermer`, `Copier`, `Programme`, `Banc`, `Texte`, le toggle `Gérer en ligne`, `Mélanger`, `Optimiser`, `Changement`, navigation non destructive.
- Rouge danger: `Supprimer`, `Retirer le lien`, `Réinitialiser`, confirmations destructives.

Observations UX à explorer:

- À la fin de la dernière demi-manche, l'application demande si le match doit être archivé. Dans les deux cas, l'entraîneur revient à `Accueil` et l'équipe ainsi que le bassin de joueurs restent en mémoire pour le prochain match.
- Seul un match terminé (`completed`) peut être archivé. Un match en préparation ou en cours doit être ouvert, terminé ou supprimé; il ne peut pas être rangé directement dans les archives.
- Les archives sont des matchs en lecture seule. Une archive conserve le match terminé; les changements futurs à l'équipe et au bassin permanent de joueurs ne modifient pas l'archive.
- Décision actuelle: `Match` reste avant `Joueurs`, parce que la présence des joueurs est liée à un match daté et que l'équipe permanente est gérée séparément hors workflow.

## Règles métier actuelles

- Les règles Rallye-Cap sont considérées uniformes par défaut. Il ne faut pas ajouter de profils par association ou catégorie sans nouvelle décision produit.
- Le nombre de joueurs actifs doit être entre 6 et 12.
- Le bassin permanent peut contenir plus de 12 joueurs. Pour un match, seuls 12 joueurs peuvent être `présents`; les joueurs excédentaires restent visibles comme `absents` et ne doivent pas être perdus.
- Le nombre de manches doit être entre 4 et 9.
- Chaque manche défensive doit avoir 6 défenseurs.
- Les positions défensives sont `1B`, `2B`, `3B`, `AC`, `L1`, `L2`; les autres joueurs sont au banc.
- En mode frappe fixe, il y a 6 frappeurs par manche et l'ordre continue à la manche suivante.
- La frappe fixe est normalement activée en Rallye-Cap; l'interface doit l'indiquer clairement dans l'étape `Match`, avec les autres paramètres du match courant.
- L'option `Faire varier le premier frappeur`, activée par défaut avec la frappe fixe, décale le départ d'une position par manche lorsqu'il y a exactement 6 joueurs. Elle est verrouillée au début du match.
- En cours de match, un joueur ajouté frappe en premier à la prochaine manche offensive; plusieurs ajouts gardent leur ordre d'ajout. La rotation reprend ensuite au frappeur attendu, sans doublon parmi les 6 frappeurs. Un joueur retiré est sauté et les demi-manches déjà barrées conservent leur ordre.
- Quand la frappe fixe est désactivée, l'application garde l'ordre général des frappeurs, mais ne doit pas afficher de frappeurs par manche, de nombre de présences au bâton prévu, ni de rang `(#)` dans les cases du tableau. Ces informations dépendent alors des retraits réels pendant le match.

## Règles obligatoires de défensive

Ces règles sont obligatoires. L'application doit les traiter comme des erreurs à corriger, pas comme de simples préférences d'équité.

- Premier but: un joueur peut jouer `1B` au maximum une fois dans le match.
- Lanceurs: un joueur ne peut pas être lanceur deux manches consécutives. `L1` et `L2` comptent tous les deux comme une présence de lanceur.
- Banc: un joueur ne peut pas être au banc deux manches consécutives.
- Défense complète: chaque manche doit avoir exactement 6 défenseurs et chaque position défensive doit être assignée une seule fois.

Hypothèse produit:

- Avec 4 manches et entre 6 et 12 joueurs actifs, l'application devrait normalement pouvoir produire un alignement qui respecte ces contraintes.
- Si une contrainte devient impossible à cause d'un changement en cours de match ou d'un nombre différent de manches, l'application doit l'expliquer clairement.

## Objectifs d'équité

Ces objectifs améliorent la qualité de l'alignement, mais ils ne doivent pas masquer les règles obligatoires.

- Répartir le temps de jeu le plus équitablement possible.
- Répartir les présences défensives le plus équitablement possible.
- Répartir les présences au bâton le plus équitablement possible en mode frappe fixe.
- Lorsqu'une règle défensive est mathématiquement impossible, comme un premier but unique sur plus de manches que de joueurs, l'interface l'affiche comme information non bloquante plutôt que comme erreur à confirmer. Les avertissements corrigeables sont présentés en liste avant le démarrage, avec la question de confirmation séparée.
- Les cartes d'équité sont harmonisées entre les modes: `Temps de jeu`, `Variété des positions` et `Indice global`. En mode frappe fixe, la carte `Présences au bâton` est ajoutée.
- `Temps de jeu` inclut les présences au bâton et la défensive quand la frappe fixe est activée. Quand la frappe fixe est désactivée, `Temps de jeu` inclut seulement la défensive, parce que les présences au bâton dépendent des retraits réels.
- Quand la frappe fixe est désactivée, les présences au bâton ne doivent pas influencer les scores d'équité. Les statistiques n'affichent alors pas les colonnes `AB` ni `Total`.
- Varier les positions autant que possible après respect des règles obligatoires.

## Exigences de langue et d'encodage

- La langue de référence est le français du Québec.
- Le HTML doit rester `lang="fr-CA"` avec `<meta charset="utf-8">`.
- Les fichiers doivent être enregistrés en UTF-8.
- Les textes visibles doivent utiliser des caractères français corrects, pas des chaînes mojibake comme `Ã©`, `Ã¨`, `â€™`, `âœ”`.

## Fonctionnalités existantes

- Ajout de joueurs par liste, virgules ou lignes.
- Activation et suppression de joueurs.
- Réorganisation de l'ordre par glisser-déposer.
- Génération automatique de la défensive.
- Ajustement manuel des positions par glisser-déposer dans une manche.
- Validations et suggestions.
- Statistiques par joueur.
- Vue spectateur navigable par boutons, clavier ou geste tactile.
- Exports: `Programme`, `Banc` et `Texte`. L'ancien export courriel HTML et l'ancien export spectateur HTML autonome sont retirés.
- L'export `Texte` doit suivre le même ordre de demi-manches que la vue spectateur: l'équipe visiteuse frappe en début de manche et l'équipe locale frappe en fin de manche.

## Préparation de match

- Un nouveau match est créé seulement par une action explicite de l'entraîneur. Il démarre sans adversaire, date, heure ni endroit par défaut et copie notre équipe ainsi que le bassin permanent de joueurs au moment de la création.
- L'étape `Match` contient l'adversaire, la date, l'heure en format 24h, l'endroit, le côté local/visiteur, le nombre de manches initial et le réglage `Frappe fixe`. Le nom de notre équipe se gère dans la boîte d'équipe de `Accueil`.
- Le champ d'heure devrait proposer des intervalles de 5 minutes.
- L'écran `Match` doit rester direct et ne pas répéter un texte d'aide générique comme `Crée le contexte du match courant.` quand les champs expliquent déjà l'action.
- L'action destructive globale garde le libellé `Réinitialiser`, parce qu'elle efface vraiment toutes les données locales.
- Réinitialiser doit être confirmé avec le message: `Toutes tes équipes, joueurs et matchs seront supprimés pour toujours. Continuer?`
- Terminer un match doit permettre de conserver la liste des joueurs pour préparer un nouveau match.

## Progression du match dans Jouer

- `Jouer` porte l'état courant du match par le bouton de progression, le tableau et les demi-manches grisées ou mises en évidence. L'écran ne doit pas dupliquer cet état dans un pill séparé.
- Un seul bouton principal fait avancer la progression par demi-manche: `Commencer le match`, puis `Terminer début 1re`, `Terminer fin 1re`, etc.
- Après la dernière demi-manche, l'application doit permettre de terminer le match et de sortir de l'état bloqué tout en gardant les mêmes joueurs en mémoire.
- L'interface principale ne permet pas de revenir à une demi-manche précédente. Une correction de progression, si nécessaire, doit être une action avancée future avec confirmation forte.
- Commencer le match ou appliquer un changement à partir d'une demi-manche verrouille les demi-manches précédentes comme jouées.
- Quand une demi-manche est jouée, elle devient de l'historique non modifiable. Les demi-manches futures restent modifiables selon les actions permises.
- Quand le match est commencé, les vues `Match` et `Joueurs` deviennent non modifiables.
- L'action `Optimiser` existe seulement avant le début réel du match dans `Alignement`.
- `Alignement` prépare et valide l'alignement; `Jouer` possède une route et des vues `Complète` / `Simple` distinctes.
- La vue complète est sélectionnée par défaut et réutilise le tableau d'alignement. Le choix de vue n'est pas un statut persistant du match.
- Après le départ, `Jouer` contient la progression de demi-manche et `Changement de joueurs`; `Alignement` reste consultable en lecture seule.
- Le tableau principal sépare chaque manche en deux demi-manches: la colonne gauche est toujours le début et la colonne droite est toujours la fin.
- L'en-tête de chaque demi-manche indique seulement le type de jeu pour notre équipe: `🏏` pour l'attaque et `🧤` pour la défensive. L'ordre dépend du statut visiteur/local.
- Les lignes du tableau principal restent associées aux joueurs. En attaque, les cellules affichent seulement le rang de frappe prévu (`#1`, `#2`, etc.) quand la frappe fixe est activée. En défensive, les cellules affichent les positions.
- Le concept de cadenas est remplacé par une progression de match: les demi-manches passées sont grisées et la demi-manche `À jouer` est indiquée clairement.
- Sur mobile, le tableau de la vue complète de `Jouer` doit faire défiler horizontalement automatiquement vers la demi-manche `À jouer` quand le match est commencé.
- Quand une demie-manche offensive est barrée, l'ordre au bâton utilisé pour cette demie-manche est figé afin que les changements futurs ne modifient pas l'historique.
- Avant le début du match, l'ordre des frappeurs peut être modifié en glissant les joueurs dans la première colonne; le déplacement réordonne les lignes complètes. Une fois le match débuté, ce glisser-déposer d'ordre est désactivé.
- Avant le début du match, `Optimiser` recalcule les positions défensives en respectant l'ordre de frappe courant.
- Avant le début du match, une action de mélange aléatoire peut modifier l'ordre de frappe des joueurs actifs. Cette action demande confirmation, mélange l'ordre, puis optimise automatiquement les positions défensives.
- Au premier affichage de `Alignement` pour un nouveau match, l'application devrait offrir de mélanger l'ordre de frappe avant de montrer l'alignement généré.
- Avant le début du match, la première arrivée sur `Alignement` après un ajout, une suppression ou un changement de présence des joueurs optimise automatiquement l'alignement si 6 à 12 joueurs sont actifs.
- En attaque, afficher seulement les frappeurs de la manche courante quand la frappe fixe est activée.
- Quand la frappe fixe est désactivée, la vue spectateur affiche constamment l'ordre général des frappeurs dans les demi-manches offensives.
- En attaque, afficher aussi les lanceurs de la prochaine manche défensive de notre équipe quand cette prochaine défense existe, pour préparer les casques.
- En défense, afficher les positions défensives de la manche courante.
- En défense, afficher aussi les deux premiers frappeurs de la prochaine manche offensive de notre équipe quand cette prochaine présence au bâton existe.
- Permettre l'ajout ou le retrait d'une manche en cours de match quand le contexte réel change, par exemple quand il reste assez de temps pour une 5e manche.
- Ne pas afficher d'aperçu de frappeurs après la dernière présence offensive possible du match.
- Ne pas afficher d'aperçu des lanceurs après la dernière manche défensive possible du match.

## Changements de joueurs pendant un match

L’étape `Jouer` est l’écran terrain du coach. Elle offre une `Vue complète`, sélectionnée par défaut, qui réutilise le tableau d’alignement, et une `Vue simple` qui affiche une demi-manche à la fois et permet de parcourir toutes les demi-manches par glissement horizontal. La pastille de progression ramène à la demi-manche courante. Les actions de progression et de changement sont désactivées lorsqu’une autre demi-manche est consultée. Une section repliée affiche les joueurs présents au banc pour la demi-manche consultée; les joueurs absents n’y apparaissent jamais. En défensive, le banc contient les joueurs sans position assignée. À l’attaque en frappe fixe, il contient les joueurs hors du groupe des six frappeurs; en frappe variable, tous les joueurs actifs participent à l’ordre.

`Prêt à jouer` dans `Alignement` valide l’horaire, enregistre le statut durable `ready`, puis ouvre `Jouer`. Toute modification de préparation remet le match à `draft`. Dans `Jouer`, la publication en ligne est facultative et le match peut être commencé seulement lorsqu’il est prêt. Après le départ, `Alignement` demeure consultable en lecture seule.

Si un lien Match existe déjà, le passage à `ready` publie l’alignement complet, incluant l’ordre, les frappeurs et les positions prévues. Il ne crée jamais de lien. Revenir à `draft` masque de nouveau ces données publiques; aucune demi-manche n’est courante avant `active`.

Si les validations détectent un problème dans une demi-manche défensive encore modifiable, la Vue simple de `Jouer` affiche une alerte non bloquante avec le nombre de problèmes et un accès à la Vue complète. Les écarts limités à l’historique déjà joué ne déclenchent pas cette alerte.

Les corrections automatiques encore applicables sont aussi présentées dans une section `Suggestions` repliée. Chaque application exige une confirmation qui décrit la modification et rappelle sa synchronisation publique. Après application, les validations et suggestions sont recalculées. Les problèmes sans action automatique renvoient vers `Alignement`.

- Les changements rapides sur téléphone sont prioritaires, mais les opérations qui changent beaucoup l'alignement doivent demander confirmation.
- Les changements de joueurs en cours de match sont accessibles depuis `Jouer` par un seul bouton de changement de joueurs.
- Le changement demande toujours la demi-manche précise à partir de laquelle l'action s'applique, par exemple `Début 3e` ou `Fin 3e`.
- Les demi-manches précédentes sont alors considérées jouées et ne doivent plus être modifiées par ce changement ni par les suggestions automatiques.
- Une fois qu'une demi-manche est jouée, aucun changement futur ne peut être appliqué dans une demi-manche précédente.
- `Enlever`: si plus de 6 joueurs sont actifs, le joueur est retiré des demi-manches futures. Son historique demeure visible.
- `Remplacer`: le nouveau joueur peut être un joueur inactif existant ou un nouveau nom. L'historique du joueur remplacé demeure, une nouvelle ligne est ajoutée sous lui, et le nouveau joueur reprend ses assignations futures.
- `Ajouter`: si moins de 12 joueurs sont actifs, le nouveau joueur est ajouté directement au match en cours. Il est placé en bas de la liste, ouvre la prochaine manche offensive en frappe fixe et ne reçoit aucune assignation défensive automatique. Le remplacement d'un joueur doit passer par l'action séparée `Remplacer`.
- `Inactif`: le joueur est enregistré sans participer au match courant.
- Le remplacement direct avant le début du match est retiré de l'étape `Joueurs`. Avant match, un changement de composition devrait passer par la présence/absence ou par la gestion hors workflow du bassin permanent.
- Quand un joueur actif est retiré pendant un match débuté, les demi-manches passées ne sont pas modifiées. Les assignations futures du joueur sont retirées et l'entraîneur doit corriger manuellement.
- Si seulement 6 joueurs sont actifs, retirer un joueur exige un remplacement.
- Quand un remplacement se fait pendant un match débuté, le tableau doit préserver l'historique du joueur remplacé dans les demi-manches passées, ajouter une ligne pour le nouveau joueur sous le joueur remplacé, retirer l'ancien joueur de l'ordre futur et retirer l'ancien joueur des assignations défensives futures.
- Si un retrait ou une désactivation crée une manche future avec moins de 6 positions assignées, l'application doit offrir un chemin clair pour corriger l'alignement. Les corrections possibles incluent une suggestion automatique pour insérer un joueur du banc, une action manuelle rapide depuis une cellule `BANC`, ou une ligne/zone indiquant les positions non assignées.
- Dans `Alignement`, les manches défensives futures incomplètes doivent être signalées directement au-dessus du tableau. L'entraîneur peut cliquer une cellule `BANC` mise en évidence pour assigner une position manquante, ou utiliser une action globale qui remplit automatiquement les positions possibles sans toucher aux demi-manches déjà complétées.
- Les suggestions proposées en cas de problème doivent viser seulement les demi-manches non jouées.
- Au démarrage du match, l'application bloque si le nombre de joueurs actifs n'est pas entre 6 et 12. Si le nombre de joueurs est valide mais que l'alignement est incomplet ou que des règles ne sont pas respectées, l'application doit avertir clairement et permettre à l'entraîneur de continuer après confirmation.
- Créer une équipe exemple est offert seulement quand aucune équipe locale n'existe encore.

## Exports et partage

### Banc des jeunes en direct

- Le lien public d'un match offre aussi une route `#banc/{publicId}` destinée à une tablette fixe sur la clôture. Cette route réutilise le document public et son mot de passe, mais ne contient aucune navigation, aucun favori et aucune action de progression.
- La route `#banc/local` affiche la même expérience à partir du match courant sauvegardé sur l'appareil. Elle sert d'aperçu local et hors ligne avant publication; ce n'est pas un lien partageable et elle affiche une erreur claire quand aucun match n'est actif.
- Sur une tablette partagée par tout le banc, la vue privilégie la lecture à distance en orientation paysage: `Maintenant` occupe environ les trois quarts de l'espace et les noms courants sont fortement agrandis, tandis que `Ensuite` demeure visible dans une colonne secondaire. En attaque, chaque joueur affiche la pastille de son rang et son nom sur une même ligne. En défense, chaque fiche affiche le nom en haut à gauche et le code avec le nom complet de la position en bas à droite. Les numéros de chandail et les joueurs au banc ne sont pas affichés afin de réserver tout l'espace aux joueurs actifs. L'icône de bâton ou de gant apparaît uniquement dans le titre de la demi-manche, sauf le casque qui identifie les deux lanceurs.
- La vue suit automatiquement la demi-manche courante. `Maintenant` montre l'ordre de frappe complet avec casques et bâtons en attaque, ou une grille des six positions en défense. `Ensuite` montre la prochaine demi-manche dans un format compact.
- Les positions défensives utilisent leurs noms complets: `Lanceur Gauche`, `Lanceur Droite`, `Arrêt-court`, `Premier but`, `Deuxième but` et `Troisième but`. Les lanceurs portent les mêmes icônes `🧢` et `🧤` que les autres vues.
- `Maintenant` et `Ensuite` ont chacun leur propre liste d'encouragement agrandie. Tous les joueurs au banc d'une même demi-manche reçoivent la même mission, affichée seulement par `👏`, `🎉`, `🎵` ou `🙌`, sur une ligne avec leur nom. Les joueurs absents ne sont jamais affichés.
- La vue minimise la lecture: elle retire les libellés `Ordre de frappe`, `Positions défensives` et le texte de synchronisation. Seuls la demi-manche, les rôles nécessaires, les noms, les icônes et un point d'état réseau demeurent visibles.
- Avant le début, la vue indique que le match commencera bientôt. À la dernière demi-manche, elle invite à encourager l'équipe; après la fin, elle affiche un message de félicitations.
- En cas de perte de connexion, le dernier alignement reçu demeure affiché avec un indicateur hors ligne. Le maintien de l'écran éveillé relève du mode kiosque ou des réglages de la tablette.

- Les exports parents doivent rester lisibles avec beaucoup de joueurs et avec des noms longs. La mise en page doit s'adapter au contenu au lieu de couper ou de superposer les textes.
- Le partage `Programme` correspond à l'image parents.
- Le partage `Banc` est un tableau imprimable simple avec une ligne par joueur et deux sous-colonnes par manche: `🏏` pour le rang de frappe local `1` à `6`, et `🧤` pour la position défensive. En frappe fixe, un joueur qui ne frappe pas reçoit une mission d'encouragement `👏`, `🎉` ou `🎵` dans la cellule `🏏`. Les présences au banc en défensive utilisent les mêmes icônes au lieu du mot `BANC`. Quand la frappe fixe est désactivée, les cellules `🏏` restent vides pour annotation manuscrite.
- Le partage `Texte` est un format brut compact. En frappe fixe, il n'affiche pas l'ordre général et liste les frappeurs de chaque demi-manche offensive un par un. En frappe variable, il garde l'ordre général, mais n'ajoute pas de rappel `Suivre l'ordre au banc`.
- L'image parents affiche la date, l'heure en format 24h et le lieu dans l'en-tête.
- L'onglet `Match` contient un champ optionnel `Message aux fans`, limité à 300 caractères. Ce message reste modifiable pendant le match afin de donner une indication aux fans, mais il est verrouillé dans une archive. Il est affiché dans `Spectateurs en direct` sur l'étape `Programme` et dans l'export image `Programme`.
- Le `Message aux fans` accepte seulement un mini-Markdown volontairement limité: `**gras**`, `*italique*`, retours de ligne et listes `- item`. Le HTML brut, les liens, les images, les titres et les tableaux ne sont pas supportés.
- L'onglet `Match` affiche un aperçu du `Message aux fans` quand un message est saisi, afin de rendre le mini-Markdown compréhensible sans documentation externe.
- L'image parents est organisée chronologiquement par manche et doit viser une impression lisible sur une page lettre. Chaque carte de manche affiche les deux demi-manches dans l'ordre réel du match avec une colonne d'icône seulement: `🏏` pour l'attaque et `🧤` pour la défense.
- En mode `Frappe fixe`, l'image parents affiche les frappeurs dans la demi-manche offensive avec une numérotation locale `1` à `6` pour chaque manche, sans afficher l'ordre général séparé.
- Quand `Frappe fixe` est désactivé, l'image parents affiche l'ordre général des frappeurs sur deux colonnes, puis chaque carte de manche indique seulement la demi-manche offensive sans liste de frappeurs.
- La demi-manche défensive affiche les 6 positions avec une grille compacte dans l'ordre `L1`, `L2`, `AC`, puis `1B`, `2B`, `3B`; `L1` et `L2` gardent le casque à côté du nom du lanceur.
- Les noms de fichiers d'exports parents utilisent le format `YYYY-MM-DD_equipe_adversaire.png`. Si la date manque, le préfixe est `match`; si l'adversaire manque, le nom contient seulement la date et notre équipe.
- Dans la vue spectateur, les deux lanceurs doivent être affichés sur deux lignes séparées afin que la défensive présente 6 éléments visuels, comme l'ordre de frappe.
- La vue spectateur doit utiliser la même palette visuelle que le reste du site.
- La vue spectateur ne doit pas répéter inutilement `Lecture seule` dans les libellés visibles.
- La vue spectateur évite de déplacer automatiquement l'utilisateur quand une nouvelle demi-manche devient disponible. Elle suit automatiquement si le parent regarde la demi-manche courante; sinon, un popup nomme la nouvelle demi-manche et propose `Afficher` ou `Rester ici`. Un refus est mémorisé pour cette progression seulement.
- Dans la liste défensive publique, les libellés `L1 🧢` et `L2 🧢` restent sur une seule ligne, y compris sur téléphone.
- Les manches futures dans `Spectateur` ne devraient pas afficher un libellé `À venir` si ce texte alourdit la lecture.
- Une évolution de `Spectateur` devrait ajouter une étape initiale `Programme`. Si aucune donnée de manche n'est encore publiée, cette étape indique `Alignement à venir` et reste la seule étape visible.
  - Livré pour le spectateur public: l'étape `Programme` précède les manches et sert d'état d'attente avant publication complète.
- Dans `Spectateurs en direct`, l'étape `Programme` affiche les noms des équipes comme titre principal. Les demi-manches affichent des titres courts `Frappeurs` et `Défenseurs`; le rôle attaque/défense n'est pas répété dans la pastille quand le contenu le rend évident.
- Les pastilles de progression de `Spectateurs en direct` sont cliquables pour permettre aux fans de naviguer rapidement entre le programme, les demi-manches et l'état final.
- Les fans peuvent cliquer des joueurs dans `Spectateurs en direct` pour les mettre en favori. Les favoris sont mémorisés localement dans le navigateur du fan avec les `playerId` publiés dans la projection publique, sans écriture Firestore. Plusieurs joueurs peuvent être favoris; cliquer de nouveau un joueur le désélectionne. Si un ancien lien ne contient pas de `playerId`, le fan devra simplement choisir ses favoris manuellement dans un lien plus récent.
- Une évolution de `Spectateur` devrait ajouter un état final `Merci, à la prochaine` quand le match est terminé, jusqu'à archivage ou suppression.
  - Livré pour le spectateur public.
- En frappe non fixe, le spectateur n'essaie pas de saisir le dernier frappeur; si ce besoin revient, il appartiendra plutôt à la gestion du match par le coach.
- Le partage externe du mode spectateur cible un futur lien en ligne en lecture seule avec informations limitées, plutôt qu'un fichier HTML autonome.
- Le partage externe du mode spectateur est maintenant conçu comme un lien Firestore `#public/{publicId}`. Il publie une projection limitée du match courant, en lecture seule, et peut se mettre à jour en direct pendant le match.
- Le lien public peut être protégé par un mot de passe optionnel. Dans ce cas, la projection publique est chiffrée côté client avant sauvegarde dans Firestore; le mot de passe n'est pas stocké. Si un mot de passe est saisi, l'interface doit indiquer qu'il devra être fourni aux fans.
- Après création du `Lien Match`, le champ de mot de passe est verrouillé. Pour changer le mot de passe, l'entraîneur doit retirer le lien puis en créer un nouveau.
- Avant `Prêt à jouer`, la synchronisation automatique en ligne ne publie pas l'alignement. Si un lien public existe déjà, `Prêt à jouer` publie l'alignement complet sans marquer de demi-manche courante; une modification de préparation le masque de nouveau. Sans lien existant, cette action reste locale. Le direct est ensuite synchronisé au démarrage et pendant la progression du match.
- La synchronisation en ligne sert aux matchs explicitement mis en ligne. Un match archivé est figé: il reste supprimable, mais ne doit plus être modifiable côté app ou côté Firestore.
- Les partages en ligne doivent être distingués des exports. Dans la modale `Partager le match`, `Lien Match` publie une projection spectateur indépendante de la sauvegarde privée. `Gérer en ligne` sert à la gestion de l'alignement et à la synchronisation du match pour le coach; il exige que l'équipe soit elle-même gérée en ligne. Retirer la sauvegarde privée conserve la copie locale et le lien Match. Les exports `Programme`, `Banc` et `Texte` sont présentés après ces sections, avec leur description sous le titre de chaque action. Les champs de lien et de mot de passe des partages en ligne sont indisponibles tant que l'entraîneur n'est pas connecté; la modale affiche alors une action primaire verte `Connexion`.
  - Livré: les exports et le lien spectateur sont regroupés dans une modale de match.
- Le champ de mot de passe du `Lien Match` ne doit pas être assimilé à un mot de passe de connexion par le navigateur. Il est affiché comme champ texte avec `autocomplete="off"` pour éviter les propositions de sauvegarde de Chrome.
- `Matchs` affiche un seul tableau triable qui contient les matchs en préparation, en cours, terminés et archivés. Les colonnes sont `Adversaire`, `Date / heure`, `Endroit`, `Statut`, `Modifié` et `Actions`. Une ligne cliquée ouvre le match, sauf si l'utilisateur clique une action. `Modifié` utilise le format `YYYY-MM-DD HH:mm`. Les actions sont `Partager`, `Archiver` quand applicable et `Supprimer` avec une icône poubelle. La page recharge automatiquement les matchs cloud à son ouverture; elle n'affiche pas d'action manuelle `Actualiser`.
- Un match `completed` est affiché comme terminé sur l'accueil même si son indicateur historique `started` demeure vrai. Il ne verrouille plus le nom ni le bassin permanent de l'équipe.
- La suppression d'un match utilise le message commun: `Le match et ses données seront supprimés. Continuer?`
- Si une action de partage ou sauvegarde cloud exige une connexion, l'app doit proposer la connexion au moment de l'action et expliquer ce qui deviendra disponible.
  - Livré: les actions cloud ouvrent la connexion quand nécessaire.
- L'export `Texte` affiche le texte dans une zone éditable avant la copie. Les modifications manuelles ne sont pas sauvegardées dans le match; elles servent seulement à ajuster l'impression de dernière minute.
- Les numéros de chandail, quand ils existent, sont affichés dans l'alignement avec une pastille près du nom et inclus dans `Programme`, `Banc`, `Texte`, `Spectateur` et les exports régénérés depuis les archives.
- Une évolution du `Programme` pourrait ajouter une première page style poster avec équipes, date, heure, joueurs présents, numéros et visuel baseball. Si cette évolution dépasse une page image fiable, un export PDF multi-page pourrait être plus approprié.
- Livré: les favoris joueur dans les vues publiques couvrent l'intention de suivre un joueur précis sans créer une vue fan séparée.
- L'app peut gérer plusieurs équipes locales. `Accueil` affiche l'équipe active dans le contexte; cliquer cette carte ouvre une modale pour passer à une autre équipe ou en créer une nouvelle. Les bassins de joueurs, les matchs, les liens publics d'équipe et les liens spectateur sont séparés par équipe; `Matchs` affiche seulement les matchs de l'équipe active. Supprimer une équipe supprime aussi ses matchs locaux et tente de retirer les liens cloud/public connus.
- Une URL permanente d'équipe permet aux parents de conserver un même lien `#fans/{teamPublicId}`. L'identifiant public se gère depuis la modale `Lien d'équipe` de la carte équipe, par exemple `expos-rallye-cap`; il est obligatoire à la création, normalisé en minuscules avec lettres, chiffres et tirets, doit contenir de 3 à 40 caractères, et doit être unique côté Firestore. La saisie ne devient un lien actif qu'après une création Firestore réussie; un identifiant refusé ne doit jamais apparaître comme lié à l'équipe. En cas d'erreur, la modale reste ouverte, affiche le message dans le formulaire et ne persiste aucune valeur saisie. La modale n'a pas de boîte intermédiaire: quand le lien permanent est actif, elle affiche seulement le lien avec `Copier` et `Retirer`; il faut retirer le lien pour changer l'identifiant. Quand aucun lien n'existe, elle affiche directement `Identifiant public`, `Mot de passe optionnel` et `Créer le lien`. Cette URL peut être publiée sans mot de passe ou avec un mot de passe optionnel qui chiffre la liste côté client. Cette page publique affiche l'équipe et ses joueurs afin que les parents puissent choisir plusieurs favoris privés dans leur navigateur, puis liste les matchs dont le lien `Spectateurs en direct` est publié pour l'équipe. Elle indique si un match demande son propre mot de passe et ouvre le lien de match `#public/{publicId}`. Retirer le lien public d'un match le retire de la liste d'équipe; retirer le lien permanent d'équipe ne supprime pas les liens de match déjà créés.
- La modale `Lien d'équipe` n'affiche plus la liste des documents Firestore `publicTeams`; les liens publics de match sont gérés dans la modale `Partager le match`.

## Archives

- Les archives vivent dans `Matchs`; il n'y a plus de page `Archives` séparée dans le modèle courant.
- Chaque archive est en lecture seule et peut être consultée, refermée ou supprimée manuellement avec confirmation. Les détails ne devraient pas être ouverts par défaut.
- Une archive ne peut pas être reprise, recommencée ou rejouée. Pour poursuivre avec les mêmes joueurs, l’entraîneur crée un nouveau match depuis l’équipe.
- Les archives complètes conservent les métadonnées du match, les joueurs figés, l'ordre, la frappe fixe, les manches, les positions, les snapshots de frappe et les demi-manches complétées.
- Les exports `Programme`, `Banc` et `Texte` peuvent être régénérés depuis une archive complète, mais les fichiers ou rendus d'export ne sont pas stockés dans l'archive.
- Les exports portent une signature `CoachRally • coachrally.app`. `Programme` et `Banc` incluent un code QR généré localement. Le lien permanent de l'équipe est prioritaire afin que le document reste utile d'un match à l'autre; sans lien d'équipe, le QR mène au match public, puis à `https://coachrally.app/` si aucun partage n'existe. L'export `Texte` ajoute la même destination sous forme d'URL, sans code QR.
- Dans le `Programme`, les noms de joueurs restent sur une seule ligne et leur taille s'adapte à l'espace disponible. Les noms exceptionnellement longs peuvent être comprimés horizontalement afin d'éviter les chevauchements et de conserver une seule image/page.
- Les anciens formats d'archives ne sont pas supportés pendant la phase de développement. Une archive valide est un match v5 avec le statut `archived`.

## Questions ouvertes

- Firestore devra-t-il publier seulement une projection publique limitée ou aussi une archive privée complète synchronisée?
- La boîte d'équipe doit-elle rester entièrement autosauvegardée, ou certaines actions devraient-elles devenir explicites pour la clarté? La réponse doit tenir compte de la sauvegarde cloud et de la clarté pour l'utilisateur.
- Le `Programme` accessible depuis `Spectateur` doit-il générer le même export image local, ouvrir une version web adaptée, ou devenir un futur PDF?

## Décision livrée: modèle multi-match

L'application conserve maintenant une liste de matchs plutôt qu'un seul match courant. Le bassin permanent de joueurs vit dans la boîte d'équipe de `Accueil`; chaque match copie ensuite ses joueurs, ses présences, son ordre, ses positions et sa progression.

`Matchs` est le centre de consultation et de gestion:

- `Matchs`: matchs en préparation, en cours ou terminés;
- `Matchs archivés`: matchs en lecture seule;
- les matchs locaux et cloud sont fusionnés dans les mêmes tableaux;
- ouvrir un match seulement en ligne l'importe localement, puis active ce match;
- ouvrir un match déjà actif mène simplement à `Match` sans message inutile.

Actions cloud:

- La modale `Lien d'équipe` contient une section `Lien public`, puis le contrôle privé `Gérer en ligne`: `Oui` synchronise le nom et le bassin; `Non` retire l'équipe et ses matchs privés après confirmation, mais conserve les copies locales et les liens publics;
- `Gérer en ligne: Oui` sur un match exige une équipe déjà gérée en ligne, sauvegarde le match dans Firestore et associe la copie locale au document cloud;
- `Gérer en ligne: Non` supprime la copie cloud privée après confirmation, mais garde le match local et son lien spectateur;
- `Supprimer` retire le match partout où l'app le connaît, localement et en ligne, après confirmation claire.

Archives:

- une archive est un match avec le statut `archived`;
- seul un match terminé peut passer au statut `archived`;
- elle est ouverte dans les mêmes vues que les autres matchs, mais en lecture seule;
- les exports peuvent être générés depuis une archive ouverte sans modifier ses données;
- les changements futurs à l'équipe ou au bassin permanent ne modifient pas l'archive.
