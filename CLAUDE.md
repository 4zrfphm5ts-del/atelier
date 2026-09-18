# Atelier — dépôt Vasistas

Studio web, data et IA. Un fondateur, Benjamin, qui écrit le code, et une équipe
d'agents au travail derrière lui. Ce fichier est lu automatiquement au démarrage :
il dit comment travailler ici.

## Avant toute production, lis le cerveau

Le dossier `cerveau/` contient ce qui ne doit jamais être réinventé à chaque fois.
Charge la ou les fiches utiles **avant** d'écrire quoi que ce soit :

| Fiche | Quand la lire |
|---|---|
| `cerveau/voix.md` | Tout texte destiné à être lu par un client ou le public |
| `cerveau/offre.md` | Dès qu'un prix, un délai ou une prestation est mentionné |
| `cerveau/da.md` | Tout visuel, maquette, capture, page HTML |
| `cerveau/clients.md` | Ciblage, prospection, choix d'un angle |
| `cerveau/methode.md` | Devis, réponse à un prospect, explication du déroulé |
| `cerveau/garde-fous.md` | **Toujours.** Ce qu'on ne promet pas, ce qu'on ne dit pas |

Les informations confidentielles (clients réels, pipeline, tarifs négociés) ne
sont **pas** dans ce dépôt : il est public. Voir `cerveau/prive/LISEZMOI.md`.

## Mise en route — à vérifier au démarrage

Au premier message d'une session, regarde si `cerveau/prive/` contient autre
chose que `LISEZMOI.md` et les `*.exemple.md`.

**S'il est vide, dis-le en une phrase avant de travailler.** Le système est
installé mais son cerveau privé ne l'est pas : l'agent commercial et le brief
du matin tourneront à vide. La marche à suivre est dans `INSTALLATION.md`,
section « Installation », puis « Ce qui reste à faire ».

Ne le répète pas à chaque message : une fois par session suffit.

## Le dépôt

Pages statiques publiées sur GitHub Pages depuis la racine. `.nojekyll` : les
fichiers sont servis tels quels.

```
index.html              Page d'entrée « Vasistas, ateliers »
studio/                 Site du studio — renvoie désormais vers studiovasistas.com
enseigne/               Renvoi vers la page commerces
au-soleil/              PWA — terrasses au soleil
drink-gamz/             PWA — jeux de soirée
piou-piou-express/      PWA — arcade 2 joueurs
penderie/               PWA
dada/                   Site client DADA Cafétéria
cerveau/                Contexte du studio (ce que les agents lisent)
outils/                 Petits scripts sans dépendance (capture d'écran)
journal/                Journal des exécutions d'agents
sorties/                Brouillons produits par les agents (hors git)
```

## Règles de code

Elles ne sont pas négociables : elles sont la raison pour laquelle ces sites sont
rapides et reprenables par n'importe qui.

- **Pas de build, pas de npm, pas de framework.** HTML, CSS et JavaScript écrits
  à la main. Un `index.html` par projet, CSS et JS inline quand c'est court.
- **Aucune dépendance externe au chargement.** Polices servies en local
  (`studio/assets/fonts/`), pas de CDN, pas de Google Fonts en ligne.
- **Mobile d'abord.** Tout doit être juste sur un écran de téléphone avant
  d'être joli sur un grand écran.
- **PWA** : une app = `index.html` + `sw.js` + `manifest.webmanifest` + les
  quatre icônes (`favicon-32`, `icon-180`, `icon-192`, `icon-512`).
  Si tu touches aux fichiers mis en cache, **incrémente la version du cache**
  dans `sw.js`, sinon les utilisateurs gardent l'ancienne version.
- **Le studio est multilingue** : `studio/` (fr), `studio/en/`, `studio/es/`,
  `studio/de/`. Une modification de contenu se répercute dans les quatre, et les
  `hreflang` doivent rester cohérents.
- **Référencement** : chaque page porte `title`, `description`, `canonical`,
  Open Graph et, si pertinent, des données structurées schema.org.
  Toute page ajoutée ou retirée se répercute dans `sitemap.xml`.

## Écriture des messages de commit

En français, factuels, au ras du réel. Le sujet nomme ce qui change, pas
l'intention. Format observé dans l'historique :

```
Vasistas : tarifs de l'assistant en 4 niveaux (dès 590, 1 490, 2 790, 4 490 €,
outils branchés inclus, suivi facultatif), 4 langues
```

Pas de « feat: », pas de « amélioration de l'expérience utilisateur ».
Ne mentionne jamais quel modèle ou quel outil a produit le changement.

## Garde-fous d'exécution

- **Aucun envoi sans validation.** Un agent rédige des brouillons. Il n'envoie
  pas de mail, ne publie pas, ne modifie pas un CRM sans accord explicite.
- **Lecture seule par défaut** sur les outils branchés.
- **Toute exécution automatique est journalisée** dans `journal/` (voir
  `journal/LISEZMOI.md`).
- **Les chiffres inventés sont signalés comme tels.** Les démos portent la
  mention « Données fictives » à l'écran. Jamais un faux chiffre présenté
  comme réel.
