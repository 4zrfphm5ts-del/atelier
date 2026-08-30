# Plan de l'atelier

Relevé de l'arborescence complète — sources, chaîne de fabrication, dépôt publié
et sites en ligne. Établi le 19-08-2026 sur `main`, commit `0829d3c`, mis à jour
le 30-08-2026 (icônes d'écran d'accueil, hors ligne, Leaflet rapatrié).

Version illustrée : [`docs/plan-atelier.html`](plan-atelier.html) (à ouvrir dans un
navigateur). Les deux fichiers de `docs/` sont en `noindex` mais restent servis par
GitHub Pages — rien de confidentiel ne doit y être ajouté.

---

## 1. La chaîne de fabrication

```
① ENTRÉES        OpenStreetMap · Overpass          Atelier local — VS Code
                 (données terrasses, ODbL)          sources des apps, photos,
                          │                         logos et textes clients
                          │ requête Overpass                │
                          ▼                                 ▼
② FABRICATION    tools/fetch_osm.py               public-web/build_public.py
   (sur le          (hors dépôt)                   (hors dépôt)
    poste)               │                        + édition directe à la main
                         │ écrit au-soleil/data.js          │ 1 HTML autonome / app
                          ▼                                 ▼
③ DÉPÔT          ┌───────────────────────────────────────────────────────┐
                 │ 4zrfphm5ts-del/atelier · branche main                  │
                 │ 63 fichiers · 2,8 Mo · 12 commits                      │
                 │ enseigne/ au-soleil/ drink-gamz/ piou-piou-express/    │
                 │ dada/ · tools/make_icons.py (dans le dépôt, lui)       │
                 │ index.html · manifest + sw · sitemap.xml · .nojekyll   │
                 └───────────────────────────────────────────────────────┘
                          │ git push origin main
                          ▼
④ EN LIGNE       GitHub Pages — .nojekyll : fichiers servis tels quels
                 https://4zrfphm5ts-del.github.io/atelier/
                          │
          ┌───────────────┴────────────────┐
          ▼                                ▼
   Référencé                        Lien direct
   (accueil + sitemap.xml)          (noindex, hors accueil et sitemap)
   enseigne · au-soleil ·           dada
   drink-gamz · piou-piou-express
```

**Point important :** les deux premiers étages n'existent que sur le poste, à une
exception près depuis le 30-08-2026 — `tools/make_icons.py`, qui refabrique les
icônes des cinq sites, est versionné. Le reste du dépôt ne contient que le
résultat et ne peut toujours pas se reconstruire tout seul.

---

## 2. Sources — poste local, non versionné

Reconstitué à partir des traces laissées dans les fichiers générés, pas observé
directement.

```
atelier/                      (dossier de travail VS Code)
├── tools/
│   └── fetch_osm.py          → au-soleil/data.js
├── public-web/
│   └── build_public.py       → tout le dépôt
├── sources des apps          avant inlining CSS/JS
└── médias clients            photos, logos
```

Les trois traces qui le prouvent :

- l'en-tête de `au-soleil/data.js` : « Généré par tools/fetch_osm.py — données ©
  OpenStreetMap (ODbL). Ne pas éditer à la main. » ;
- le message du commit initial `2417d69` : « généré par public-web/build_public.py » ;
- le message d'erreur d'Au Soleil, qui invite à lancer `python3 tools/fetch_osm.py`.

---

## 3. Sorties — le dépôt publié

```
atelier/
├── index.html                    8 K    landing, 4 apps listées (dada absent)
├── manifest.webmanifest          4 K    landing installable (« Atelier »)
├── sw.js                         4 K    hors ligne, ne répond que pour la landing
├── icon-512/192/180.png                 icônes d'écran d'accueil
├── favicon-32.png
├── sitemap.xml                   4 K    5 URL, lastmod 2026-07-07
├── .nojekyll                     0      sert les fichiers tels quels
│
├── tools/
│   └── make_icons.py             8 K    refabrique les icônes des 5 sites
│
├── enseigne/                            336 K
│   ├── index.html                48 K   740 lignes
│   ├── mentions-legales.html      8 K   69 lignes
│   ├── icon-512/192/180.png             icônes d'écran d'accueil
│   ├── favicon-32.png
│   └── img/
│       ├── og-enseigne.jpg              100 K
│       ├── apercu-dada-cafeteria.jpg     48 K
│       ├── apercu-le-matisse.jpg         48 K
│       └── apercu-le-saint-jean.jpg      52 K
│
├── au-soleil/                           268 K
│   ├── index.html                24 K   331 lignes
│   ├── data.js                   32 K   209 terrasses (généré)
│   ├── leaflet-1.9.4.js         148 K   copie locale, plus d'unpkg
│   ├── leaflet-1.9.4.css         16 K
│   ├── manifest.webmanifest       4 K   installable (« Au Soleil »)
│   ├── sw.js                      8 K   hors ligne : page, terrasses, Leaflet
│   ├── icon-512/192/180.png             icônes d'écran d'accueil
│   └── favicon-32.png
│
├── drink-gamz/                          356 K
│   ├── index.html               100 K   1 237 lignes
│   ├── manifest.webmanifest       4 K
│   ├── sw.js                      4 K   cache drinkgamz-v3
│   ├── icon-512.png             164 K
│   ├── icon-192.png              40 K
│   ├── icon-180.png              36 K
│   └── favicon-32.png             4 K
│
├── piou-piou-express/                   88 K
│   ├── index.html                44 K   899 lignes
│   ├── manifest.webmanifest       4 K   installable (« Piou Piou »)
│   ├── sw.js                      8 K   hors ligne
│   ├── icon-512/192/180.png             icônes d'écran d'accueil
│   └── favicon-32.png
│
└── dada/                                1,6 M
    ├── index.html                28 K   515 lignes
    └── assets/
        ├── styles.css            20 K   334 lignes
        ├── main.js                4 K   89 lignes
        ├── equipe.jpg           336 K
        ├── logo-dada.png        176 K
        ├── logo-dada-wordmark.png  68 K
        ├── plat-curry.jpg       160 K
        ├── plat-couscous.jpg    156 K
        ├── plat-chou-fleur.jpg  144 K
        ├── plat-bourguignon.jpg 108 K
        ├── brunch-toast.jpg     136 K
        ├── brunch-table.jpg     120 K
        └── brunch-dessert.jpg   104 K
```

Les médias de DADA pèsent 1,5 Mo, soit 68 % du dépôt pour un seul des cinq sites.

---

## 4. Les cinq sites

### 🪧 L'Enseigne — `/enseigne/` · en ligne, priorité 1.0

Vitrine commerciale du studio : création de sites pour commerces, bars et artisans
des Hauts-de-France. La seule page travaillée à fond côté référencement.

| | |
|---|---|
| Fichiers | `index.html` (735 l.), `mentions-legales.html` (69 l.), 4 images |
| Sections | hero · services · méthode · exemples · pourquoi · chiffres · tarifs · FAQ · devis |
| Tarifs | site 690 € · menu QR 290 € · fiche Google 190 € · retouches 60 €/h · option 29 €/mois · pack 990 € |
| Balisage | JSON-LD `ProfessionalService`, `FAQPage` (8 questions), 5 `Service`/`Offer`, 10 villes |
| Contact | `mailto:` + tél. + WhatsApp — aucun formulaire, aucun serveur |
| Zones | Lille · Lens · Liévin · Arras · Béthune · Douai · Le Touquet · Berck · Boulogne · Montreuil |
| Runtime | Google Fonts (Fraunces + Work Sans) |

### ☀️ Au Soleil — `/au-soleil/` · en ligne

Carte des terrasses qui prennent le soleil maintenant. Le calcul se fait dans le
navigateur : position du soleil à l'instant T croisée avec l'orientation de la
façade et la hauteur de l'horizon.

| | |
|---|---|
| Données | 209 terrasses — Lille 178, Le Touquet 31 · 88 restos, 67 bars, 47 cafés, 7 pubs |
| Champs | `n` nom · `lat`/`lng` · `facing` orientation · `horizon` hauteur · `type` · `h` horaires OSM · `w` site |
| Source | OpenStreetMap (ODbL), régénérable par `tools/fetch_osm.py` |
| Sortie | 4 états : soleil · partiel · ombre · nuit, plus l'heure du prochain changement |
| Hors ligne | service worker, cache `ausoleil-v1` : page, terrasses et Leaflet. Sans réseau, la liste et le calcul du soleil marchent, les tuiles non |
| Runtime | Leaflet 1.9.4 servi par le site + tuiles OpenStreetMap |

### 🍻 Drink Gamz' — `/drink-gamz/` · en ligne, PWA

La machine à jeux de soirée sur un seul téléphone. Plus gros fichier de l'atelier,
et la première app à avoir été installable sur l'écran d'accueil.

| | |
|---|---|
| Jeux | 15 — Mode Épique, La Roue, Action ou Vérité, Je n'ai jamais, Tu préfères, Le plus susceptible, Picolo, Le Roi, La Bombe, Méduse, King Game, Paranoïa, Quiz Culture G, GeoGuess, Rent Guesser |
| Niveaux | 🍼 Enfance · 😎 Soft · 🤪 Délire · 🌶️ Chaud · 🍑 Sexe 18+ · 💀 Trash 18+ |
| Sanctions | deux modes au choix : gorgées ou gages |
| Hors ligne | service worker, cache `drinkgamz-v3`, repli sur `index.html` |
| Poids | 1 237 lignes dans un fichier de 100 K + 4 icônes (244 K) |
| Runtime | aucune dépendance réseau |

### 🐦 Piou Piou Express — `/piou-piou-express/` · en ligne

Jeu d'arcade en canvas : deux poussins, des graines à ramasser, des trains à éviter.

| | |
|---|---|
| Modes | 2 joueurs · solo contre l'ordi · échange des manettes en cours de partie |
| Format | match en manches, compte à rebours, écran d'entre-deux, confettis de fin |
| Moteur | canvas 960×600 redimensionné, boucle de rendu maison, ~45 fonctions |
| Poids | 899 lignes, 44 K, un seul fichier |
| Hors ligne | service worker, cache `pioupiou-v1` |
| Runtime | aucune dépendance réseau |
| Manque | aucune commande tactile : installé sur un téléphone, le jeu réclame toujours un clavier |

### ☕ DADA — `/dada/` · lien direct, noindex

Seul site livré à un client : le café-cafétéria-bar DADA, 169 rue Pierre Mauroy à
Lille. Volontairement hors de la page d'accueil et du sitemap.

| | |
|---|---|
| Sections | le lieu · la carte (4 onglets : cafétéria, chaud, froid, alcool) · le brunch · ateliers · privatisation & événements · infos |
| Réservation | formulaire validé côté client, puis `mailto:` pré-rempli — aucun serveur |
| Balisage | JSON-LD `CafeOrCoffeeShop` : adresse, horaires, Instagram @dadacafeteria |
| Fichiers | `index.html` (519 l.) + `styles.css` (334 l.) + `main.js` (89 l.) + 10 médias (1,5 Mo) + 4 icônes |
| Runtime | Google Fonts (Rubik, Antonio, Inter) |

---

## 5. Ce que le navigateur va chercher ailleurs

Aucun site n'a de serveur ni de base de données. Reste ce qui est chargé depuis
l'extérieur, et donc ce qui casse quand un tiers tombe.

| Site | Services tiers | Si le tiers tombe |
|---|---|---|
| L'Enseigne | `fonts.googleapis.com` | mise en page intacte, polices système |
| DADA | `fonts.googleapis.com` | mise en page intacte, polices système |
| Au Soleil | `tile.openstreetmap.org` | fond de carte gris ; liste, filtres et calcul du soleil intacts (Leaflet est servi par le site depuis le 30-08-2026) |
| Drink Gamz' | aucun | fonctionne hors ligne (service worker) |
| Piou Piou Express | aucun | fonctionne hors ligne (service worker) |

Et ce que chaque site sait faire sans réseau, une fois posé sur l'écran d'accueil :

| Site | Installable | Hors ligne |
|---|---|---|
| Accueil de l'atelier | oui (« Atelier ») | la page et ses liens |
| Drink Gamz' | oui | tout |
| Piou Piou Express | oui | tout |
| Au Soleil | oui | tout sauf le fond de carte |
| L'Enseigne · DADA | icône d'écran d'accueil, pas de manifeste | non — sites vitrines, dont le contenu doit rester frais |

---

## 6. Chronologie

| Date | Commit | Objet |
|---|---|---|
| 02-07-2026 | `2417d69` | Ateliers en ligne — 4 apps + L'Enseigne, générés par `public-web/build_public.py`. 16 fichiers, 3 041 lignes. |
| 03-07-2026 | `e56f458` | DADA mis en ligne : 13 fichiers, 943 lignes. URL directe, noindex, hors landing. |
| 03-07-2026 | `fad14fe` | DADA — photo de l'équipe redressée (EXIF) et recadrée : 544 K → 336 K. |
| 06-07-2026 | `f8811ef` | L'Enseigne v2 — SEO complet, FAQ, chiffres, zones, option 29 €/mois, WhatsApp, mentions légales. |
| 06-07-2026 | `a2f3b28` | Mentions légales — identité complète (EI micro BFIEVE Consulting, adresse, TVA). |
| 06-07-2026 | `6f96f08` | Mentions légales — SIREN et SIRET renseignés, page terminée. |
| 07-07-2026 | `a5c5435` | DADA — carte à jour et refonte selon retours (ordre carte/brunch, bar, horaires, équipe). |
| 07-07-2026 | `0829d3c` | SEO et partage — favicon, image OG, canonical, JSON-LD pour DADA ; métas ajoutées aux trois apps. |
| 19-08-2026 | `1162fa1` | Plan de l'atelier : arborescence, chaîne de fabrication, fiches des 5 sites. |
| 23-08-2026 | `990a68e` | Drink Gamz' — le service worker ne peut plus figer l'app sur une copie abîmée. |
| 23-08-2026 | `2012e4c` | Les 5 sites : plus de point unique de panne qui laisse un écran blanc sur iPhone. |
| 30-08-2026 | (celui-ci) | Les apps s'emportent : icônes d'écran d'accueil partout, Au Soleil et Piou Piou installables et hors ligne, Leaflet rapatrié. |

---

## 7. Points ouverts

Relevés en lisant les fichiers du dépôt. Rien n'est cassé, ce sont des bouts qui
pendent.

1. **Les scripts ne sont presque nulle part.** `build_public.py` et `fetch_osm.py`
   n'existent que sur le poste : le dépôt ne peut toujours pas être reconstruit à
   partir de lui-même. Seul `tools/make_icons.py` a été versionné (30-08-2026).
2. **L'email de DADA est un placeholder.** `main.js` porte encore
   `RESA_EMAIL = "contact@dadacafeteria.fr"` avec le commentaire « à remplacer par
   l'email réel ». Toutes les demandes de réservation partent là.
3. **Deux polices déclarées, jamais chargées.** Drink Gamz' demande Poppins et Piou
   Piou demande Baloo 2 sans jamais les inclure : les deux tournent en police système.
4. ~~**Au Soleil dépend d'un CDN.**~~ Réglé le 30-08-2026 : `leaflet-1.9.4.js` et
   `.css` sont servis par le site, empreintes SHA-256 identiques aux SRI qu'ils
   remplacent. Restent les tuiles OpenStreetMap, qui ne se rapatrient pas.
5. **Le sitemap est figé.** Les 5 URL portent toutes `lastmod 2026-07-07`, y compris
   celles qui n'ont pas bougé depuis le 2 juillet.
6. **1,5 Mo de photos non optimisées.** Les médias de DADA sont en JPEG et PNG pleine
   taille (`equipe.jpg` 336 K, `logo-dada.png` 176 K) : pas de WebP, pas de vignettes.
7. **Piou Piou n'a pas de commandes tactiles.** Il est maintenant installable sur un
   téléphone, mais toujours jouable au clavier seulement : l'app s'emporte, la
   partie non. C'est une fonctionnalité à écrire, pas une réparation.
8. **Les tuiles de la carte ne sont pas mises en cache.** Hors ligne, Au Soleil
   affiche ses terrasses sur un fond gris. Garder les tuiles d'une ville tiendrait
   dans quelques Mo, mais c'est une décision à prendre (poids, licence OSM).
