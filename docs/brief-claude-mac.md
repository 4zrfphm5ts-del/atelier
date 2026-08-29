# Brief pour Claude Code / Cowork tournant sur le Mac

Colle ce fichier tel quel dans une session Claude ayant accès au terminal du Mac.

---

## Contexte et objectif

L'utilisateur réorganise son iPad Pro (iPadOS 26.6.x) en suivant un plan détaillé.
Ta mission couvre **une seule étape de ce plan : la fabrication de sept raccourcis.**

Le transport vers l'iPad est déjà résolu : l'app Raccourcis se synchronise par iCloud.
Tout raccourci créé sur ce Mac apparaîtra seul sur l'iPad.

**Prérequis à vérifier avant de commencer** (et à signaler si absent) :
- Mac : Raccourcis → Réglages → Général → **Synchronisation iCloud** activée.
- iPad : Réglages → Raccourcis → **Synchronisation iCloud** activée.
- Même compte Apple sur les deux.

## Périmètre — lis ceci avant d'agir

**Tu fais :** les sept raccourcis ci-dessous, signés et importés sur le Mac.

**Tu ne fais PAS, et tu ne tentes pas de contourner :**
- L'écran d'accueil, le Dock, le Centre de contrôle de l'iPad. Aucune interface
  scriptable n'existe. N'essaie pas.
- Les **modes de concentration**. Leur base sur macOS (`~/Library/DoNotDisturb/DB/`)
  est privée, non documentée et adossée à iCloud : y écrire peut corrompre la
  configuration sur tous les appareils. N'y touche pas, même en lecture-écriture
  prudente. L'utilisateur les crée à la main, ça lui prend six minutes.
- Les **remplacements de texte**. Le magasin est adossé à CloudKit, il n'y a pas
  de CLI propre. Deux minutes à la main dans Réglages Système.
- Les **automatisations personnelles** (« à 8 h, lance… »). Apple documente
  explicitement qu'elles **ne se synchronisent pas** entre appareils : elles
  devront être créées sur l'iPad. Ne les construis pas ici, ce serait du travail
  perdu.

## Méthode obligatoire : découvrir avant d'écrire

**N'invente aucun identifiant d'action.** Le format `.shortcut` est un plist dont
les clés (`WFWorkflowActions`, `WFWorkflowActionIdentifier`,
`WFWorkflowActionParameters`) sont stables, mais les identifiants d'actions
individuelles ne sont pas documentés publiquement — et l'action centrale ici,
« Utiliser le modèle » (Use Model), est une nouveauté de la génération 26 dont
l'identifiant n'est pas devinable.

Procède donc ainsi :

1. `shortcuts list --show-identifiers` pour voir l'existant.
2. Dans l'app Raccourcis, onglet **Galerie**, duplique les raccourcis Apple
   **« Résumé matinal »** et **« Points d'action à partir de notes de réunion »**.
   Ils utilisent déjà « Utiliser le modèle ».
3. Exporte-les (Fichier → Exporter, ou `shortcuts view` puis export depuis l'app)
   et **lis leur plist** : `plutil -convert xml1 -o - fichier.shortcut`.
4. Tu tiens alors la vérité terrain : identifiant exact de l'action « Utiliser le
   modèle », noms de ses paramètres (choix du modèle, invite, case « Suivi »,
   format de sortie), et la façon dont les variables se chaînent.
5. Construis les sept raccourcis **à partir de ce gabarit**, jamais de mémoire.

Si une action reste introuvable, **dis-le** et laisse ce raccourci de côté plutôt
que de produire un fichier qui échouera à l'import.

## Signature et import

    shortcuts sign --mode anyone --input "Nom.shortcut" --output "Nom-signe.shortcut"

Note pour l'utilisateur : signer envoie une copie à Apple pour validation. Si
c'est un problème, l'alternative est d'activer « Autoriser les raccourcis non
approuvés » sur l'appareil — moins propre, à mentionner mais pas à imposer.

Puis ouvre le fichier signé pour l'importer dans l'app Raccourcis du Mac.

## Les sept raccourcis

Dans « Utiliser le modèle », choisis systématiquement **Private Cloud Compute**
et **décoche « Suivi »** (cochée, elle rend le raccourci interactif et bloque
toute automatisation).

**1. Résumé du jour** — se lance seul
Rechercher des événements de calendrier (début = aujourd'hui, limite 15) →
Rechercher des rappels (échéance aujourd'hui, non terminés) → Obtenir les
prévisions météo → Texte (les trois, sous les titres AGENDA / TÂCHES / MÉTÉO) →
Utiliser le modèle → Créer une note.
Invite : « Écris en français un brief de journée en 5 puces maximum. Signale les
conflits d'horaire et la première échéance critique. Pas d'introduction. »

**2. PDF → résumé + actions** — feuille de partage (types : Fichiers, PDF)
Recevoir → Créer du texte enrichi à partir d'un PDF → Obtenir le texte de
l'entrée → Utiliser le modèle → Créer une note → Afficher le contenu.
Invite : « En français. Section 1 : résumé en 5 puces. Section 2 : actions à
faire, une par ligne, commençant par un verbe. Section 3 : chiffres, dates et
montants cités. N'invente rien. »

**3. Notes de réunion → rappels** — feuille de partage (type : Texte)
Recevoir → Utiliser le modèle, **Sortie : Liste** → Répéter chaque élément →
Ajouter un rappel (liste Travail, demain 9 h) → Fin de la répétition.
Invite : « Extrais uniquement les actions à faire. Une action par élément, à
l'impératif, en français. Si aucune action, renvoie une liste vide. »

**4. Résumer la page ouverte** — feuille de partage (types : Pages web Safari, URL)
Recevoir → Obtenir le contenu de la page web → Obtenir le texte de l'entrée →
Utiliser le modèle → Copier dans le presse-papiers → Afficher le contenu.
Invite : « Résume ce texte en français : 3 puces de fond, puis une ligne "À
retenir". Si c'est une publicité ou une page de connexion, réponds seulement
"Pas de contenu". »

**5. Rejoindre la visio** — se lance seul, aucune IA
Rechercher des événements de calendrier (limite 1, à venir) → Obtenir les détails
(Notes, puis URL) → Extraire les URL du texte → Ouvrir les URL.

**6. Scanner → PDF classé** — se lance seul
Crée d'abord le dossier `Scans` dans iCloud Drive.
Numériser un document → Créer un PDF → Enregistrer le fichier vers
Fichiers › Scans, « Demander où enregistrer » **décoché**.
(La numérisation n'existe pas sur Mac : ce raccourci ne sera testable que sur
l'iPad. Construis-le quand même, il s'y synchronisera.)

**7. Session de 25 minutes** — se lance seul
Définir le mode de concentration « Atelier » sur activé → Démarrer le minuteur
25 minutes.
(Dépend d'un mode « Atelier » que l'utilisateur crée sur l'iPad. Si le mode
n'existe pas encore, construis quand même le raccourci et signale qu'il faudra
resélectionner le mode une fois créé.)

## Rangement

Crée deux dossiers dans Raccourcis :
- **Travail** : 1, 5, 6, 7 — dans cet ordre exact. Ce sont les quatre qui se
  lancent seuls ; l'ordre détermine ce qu'affichera le widget moyen sur l'iPad.
- **Partage** : 2, 3, 4 — les trois qui reçoivent du contenu.

Pour 2, 3 et 4 : dans les détails du raccourci, active **« Afficher dans la
feuille de partage »** et coche **uniquement** les types d'entrée listés ci-dessus.
Un type qui ne correspond pas rend le raccourci invisible, sans message d'erreur.

Nomme-les court et sans collision avec un nom d'app : sur iPad il n'y a pas de
raccourci clavier assignable, le lanceur est ⌘ + Espace puis trois lettres.

## Vérification avant de rendre la main

1. `shortcuts list` montre bien les sept.
2. Lance le 1 et le 5 sur le Mac : ils doivent produire un résultat, pas une erreur.
3. Demande à l'utilisateur de vérifier qu'ils sont apparus sur l'iPad (compter
   quelques minutes de synchronisation).
4. Rappelle-lui ce qui reste à faire **sur l'iPad** : les trois automatisations
   horaires, le pointage du widget vers le dossier Travail, et les quatre
   commandes de raccourcis dans la page 2 du Centre de contrôle.

Rends compte honnêtement : si un raccourci n'a pas pu être construit faute
d'identifiant fiable, dis-le au lieu de livrer un fichier qui ne s'importera pas.
