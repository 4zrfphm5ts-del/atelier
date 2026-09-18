# Direction artistique

Source de vérité : `studio/assets/site.css` (bloc `:root`) et
`studio/assets/appareils.css` (cadres d'appareils). En cas de désaccord entre
cette fiche et le CSS, **le CSS a raison** — et cette fiche est à corriger.

## Palette

```css
/* Neutres */
--blanc:#FFFFFF;  --gris:#F5F7FA;  --gris-2:#ECEFF4;  --gris-3:#E2E6ED;
--encre:#0B0D12;  --texte:#3E4553;  --doux:#5F6675;

/* Bleu — la couleur de la marque */
--bleu:#2447F5;       --bleu-fonce:#1A36D6;  --bleu-nuit:#14259E;
--bleu-pale:#EEF2FF;  --bleu-ligne:rgba(36,71,245,.24);

/* États */
--ok:#0F7A4A;  --ok-pale:#E8F5EE;  --ambre:#9A5B00;  --rouge:#C0341D;
--wa:#1F7A4D;  /* WhatsApp */

/* Traits */
--ligne:rgba(11,13,18,.08);  --ligne-2:rgba(11,13,18,.14);
```

Le bleu `#2447F5` est franc, presque électrique. Il porte l'action : boutons
principaux, liens, accents. **Il ne sert pas de fond de grande surface.** Les
fonds sont blancs ou `--gris`. L'encre `#0B0D12` n'est pas un noir pur : ne pas
la remplacer par `#000`.

Le texte courant est `--texte:#3E4553`, pas l'encre. L'encre est réservée aux
titres.

La page d'entrée `index.html` à la racine fait exception : fond sombre
`#26221C`, accent terre cuite `#C1502E`. C'est l'atelier, pas le studio. Ne pas
uniformiser les deux.

## Typographie

Deux familles, servies en local depuis `studio/assets/fonts/` :

```css
--ff-d:'Inter Tight',system-ui,-apple-system,'Segoe UI',sans-serif;  /* titres */
--ff:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;          /* texte */
```

`inter-latin.woff2` et `inter-tight-latin.woff2`. **Jamais de Google Fonts en
ligne, jamais de CDN** : la police est un fichier du dépôt.

**Les apostrophes sont droites (`'`), pas courbes (`’`).** Le site n'en contient
pas une seule courbe : c'est une convention, pas un oubli. La respecter évite un
mélange visible quand un texte généré est collé à côté d'un texte existant.

Les titres sont en Inter Tight, serrés, avec un point final. C'est une marque de
fabrique du site : *« Ce que nous construisons pour vous . »*,
*« Des prix affichés. Un devis écrit pour le reste. »*

## Formes et mouvement

```css
--r:16px;        /* rayon des cartes */
--r-btn:11px;    /* rayon des boutons */
--maxw:1240px;
--pad:clamp(1.1rem,4vw,3.5rem);
--sec:clamp(4rem,8vw,6.5rem);   /* respiration entre sections */
--ease:cubic-bezier(.2,.7,.2,1);
--vite:.18s;  --moyen:.32s;
```

Quatre niveaux d'ombre, `--o-1` à `--o-4`, plus `--o-bleu` pour les boutons
principaux. Les ombres sont doubles (un liseré net + une diffusion large) et
très peu opaques. Ne pas inventer de `box-shadow` : réutiliser les variables.

Le mouvement est discret et court. Rien ne rebondit. Rien ne clignote.
Respecter `prefers-reduced-motion`.

## Les captures d'écran

Convention constante sur tout le site, à ne pas casser :

- L'heure affichée est toujours **9:41**, dans la barre d'état comme dans le
  chrome Safari. (C'est l'heure des présentations Apple.)
- Les écrans sont présentés dans un cadre d'appareil — voir
  `studio/assets/appareils.css`.
- Une capture de démo porte le bandeau **« Démo, données fictives »**.
  Une capture de client en ligne porte **« Client, en ligne »**.
  Une maquette porte **« Maquettes »** et le nom est signalé comme inventé.
- Format `.webp` pour les captures (`ecran-nuancier.webp`,
  `ecran-deux-terrils.webp`).

## Pour produire un visuel

1. Lis d'abord cette fiche et `voix.md`.
2. Écris une page HTML autonome qui utilise les variables ci-dessus. Pas de
   Tailwind, pas de librairie de composants.
3. Pour en sortir une image : `outils/capture.sh page.html sortie.png 1080 1350`.
   Le script trouve tout seul le Chromium ou le Chrome de la machine et capture
   en 2x. **Aucune dépendance à installer**, conformément à la règle du dépôt.
4. Formats utiles : carré 1080×1080 (publication), portrait 1080×1350
   (carrousel), 1200×630 (Open Graph).

## Ce qui n'est pas la marque

- Les dégradés violet-rose « IA », les fonds spatiaux, les néons cyan, les
  interfaces façon HUD de science-fiction. C'est exactement ce que le studio ne
  vend pas : on vend des outils sobres qui marchent.
- Les icônes en 3D, les illustrations génériques d'entreprise, les photos de
  poignées de main.
- Le mode sombre sur le site du studio. Le site est clair, assumé.
