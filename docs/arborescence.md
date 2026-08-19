# Plan de l'atelier

Relevé de l'arborescence complète — sources, chaîne de fabrication, dépôt publié
et sites en ligne. Établi le 19-08-2026 sur `main`, commit `0829d3c`.

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
   (sur le                                        + édition directe à la main
    poste,               │                                  │
    hors dépôt)          │ écrit au-soleil/data.js          │ 1 HTML autonome / app
                          ▼                                 ▼
③ DÉPÔT          ┌───────────────────────────────────────────────────────┐
                 │ 4zrfphm5ts-del/atelier · branche main                  │
                 │ 32 fichiers · 2,31 Mo · 8 commits                      │
                 │ enseigne/ au-soleil/ drink-gamz/ piou-piou-express/    │
                 │ dada/ · index.html · sitemap.xml · .nojekyll           │
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

**Point important :** les deux premiers étages n'existent que sur le poste. Le dépôt
ne contient que le résultat et ne peut pas se reconstruire tout seul.

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

32 fichiers, 2,31 Mo, 4 236 lignes de code.

```
atelier/
├── index.html                    4 K    landing, 4 apps listées (dada absent)
├── sitemap.xml                   4 K    5 URL, lastmod 2026-07-07
├── .nojekyll                     0      sert les fichiers tels quels
│
├── enseigne/                            312 K
│   ├── index.html                48 K   735 lignes
│   ├── mentions-legales.html      8 K   69 lignes
│   └── img/
│       ├── og-enseigne.jpg              100 K
│       ├── apercu-dada-cafeteria.jpg     48 K
│       ├── apercu-le-matisse.jpg         48 K
│       └── apercu-le-saint-jean.jpg      52 K
│
├── au-soleil/                           56 K
│   ├── index.html                20 K   322 lignes
│   └── data.js                   32 K   209 terrasses (généré)
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
├── piou-piou-express/                   44 K
│   └── index.html                40 K   872 lignes
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
| Runtime | Leaflet 1.9.4 depuis unpkg + tuiles OpenStreetMap |

### 🍻 Drink Gamz' — `/drink-gamz/` · en ligne, PWA

La machine à jeux de soirée sur un seul téléphone. Plus gros fichier de l'atelier,
et seule app installable sur l'écran d'accueil.

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
| Poids | 872 lignes, 40 K, un seul fichier |
| Runtime | aucune dépendance réseau, pas de service worker |

### ☕ DADA — `/dada/` · lien direct, noindex

Seul site livré à un client : le café-cafétéria-bar DADA, 169 rue Pierre Mauroy à
Lille. Volontairement hors de la page d'accueil et du sitemap.

| | |
|---|---|
| Sections | le lieu · la carte (4 onglets : cafétéria, chaud, froid, alcool) · le brunch · ateliers · privatisation & événements · infos |
| Réservation | formulaire validé côté client, puis `mailto:` pré-rempli — aucun serveur |
| Balisage | JSON-LD `CafeOrCoffeeShop` : adresse, horaires, Instagram @dadacafeteria |
| Fichiers | `index.html` (515 l.) + `styles.css` (334 l.) + `main.js` (89 l.) + 10 médias (1,5 Mo) |
| Runtime | Google Fonts (Rubik, Antonio, Inter) |

---

## 5. Ce que le navigateur va chercher ailleurs

Aucun site n'a de serveur ni de base de données. Reste ce qui est chargé depuis
l'extérieur, et donc ce qui casse quand un tiers tombe.

| Site | Services tiers | Si le tiers tombe |
|---|---|---|
| L'Enseigne | `fonts.googleapis.com` | mise en page intacte, polices système |
| DADA | `fonts.googleapis.com` | mise en page intacte, polices système |
| Au Soleil | `unpkg.com` (Leaflet), `tile.openstreetmap.org` | sans unpkg : pas de carte du tout |
| Drink Gamz' | aucun | fonctionne hors ligne (service worker) |
| Piou Piou Express | aucun | tout est dans la page |

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

---

## 7. Points ouverts

Relevés en lisant les fichiers du dépôt. Rien n'est cassé, ce sont des bouts qui
pendent.

1. **Les scripts ne sont nulle part.** `build_public.py` et `fetch_osm.py` n'existent
   que sur le poste : le dépôt ne peut pas être reconstruit à partir de lui-même.
2. **L'email de DADA est un placeholder.** `main.js` porte encore
   `RESA_EMAIL = "contact@dadacafeteria.fr"` avec le commentaire « à remplacer par
   l'email réel ». Toutes les demandes de réservation partent là.
3. **Deux polices déclarées, jamais chargées.** Drink Gamz' demande Poppins et Piou
   Piou demande Baloo 2 sans jamais les inclure : les deux tournent en police système.
4. **Au Soleil dépend d'un CDN.** Leaflet vient d'unpkg ; copier le fichier (~150 K)
   dans `au-soleil/` supprimerait la dépendance.
5. **Le sitemap est figé.** Les 5 URL portent toutes `lastmod 2026-07-07`, y compris
   celles qui n'ont pas bougé depuis le 2 juillet.
6. **1,5 Mo de photos non optimisées.** Les médias de DADA sont en JPEG et PNG pleine
   taille (`equipe.jpg` 336 K, `logo-dada.png` 176 K) : pas de WebP, pas de vignettes.
