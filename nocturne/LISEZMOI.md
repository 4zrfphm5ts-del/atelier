# Nocturne — section Remote

Page autonome (un seul fichier, `index.html`) : toutes les options d'une lampe —
blanc, couleur, effets, modes — applicables **à toute la maison, à une pièce ou à
une lampe**.

## Le principe

Une seule notion commande tout : la **portée**, en haut de l'écran.

| Portée choisie | Ce que touchent les curseurs, presets, effets et modes |
| --- | --- |
| Toute la maison | les 15 lampes |
| Une pièce | les lampes de cette pièce |
| Une lampe | cette lampe seule |

Les réglages ne sont donc écrits qu'une fois : chaque pièce et chaque lampe
disposent exactement des mêmes options.

Le bouton **Appliquer à toute la maison** étend le réglage affiché à toutes les
lampes, quelle que soit la portée en cours ; **Tout éteindre** coupe tout.

## Ce que contient la page

- **Intensité** 1–100 %.
- **Blanc** 6500 K → 2000 K (curseur inversé, comme sur la télécommande).
- **Couleur** teinte 0–360°, saturation 0–100 %, plus 8 presets : Bougie, Ambre,
  Coucher de soleil, Rose, Violet, Bleu nuit, Glacier, Forêt.
- **Effets** Bougie, Flamme, Prisme, Étincelles, Opale, Scintillement, Sous l'eau,
  Cosmos, Rayon de soleil, Enchantement, Aucun.
- **Modes** 15 réglages complets (Réveil, Journée, Concentration, Lecture, Détente,
  Dîner, Cheminée, Cinéma, Soirée, Coucher de soleil, Aurore, Lagon, Cosmos,
  Veilleuse, Nuit) — un appui les applique à la portée en cours.
- **Aperçu** chaque pièce montre sa couleur, son intensité et son effet en direct.
- **Journal du pont** les dernières commandes émises, pour vérifier ce qui part.

L'état est conservé dans `localStorage` (`nocturne.remote.v1`).

## Adapter à votre installation

Deux listes en tête du `<script>` :

```js
const PIECES = [
  { id:'salon', nom:'Salon', emoji:'🛋️', lampes:['Lampadaire','Guirlande','Plafonnier'] },
  …
];
const MODES = [ … ];   // ajouter ou retirer un mode ici suffit
```

## Brancher les vraies lampes

Rien n'est envoyé sur le réseau : la page émet un évènement à chaque commande.

```js
document.addEventListener('nocturne:commande', ev => {
  // ev.detail = { horodatage, portee, lampes:[ids], reglages:{on,bri,mode,k,h,s,effet} }
  pont.envoyer(ev.detail);   // Hue, Home Assistant, MQTT…
});
```

`window.Nocturne` expose aussi `pieces`, `lampes`, `modes`, `presets`, `effets`,
`etat()` et `appliquerMode(idMode, portee)` — de quoi déclencher un mode depuis
le reste de l'app :

```js
Nocturne.appliquerMode('veilleuse', { type:'piece', piece:'chambre' });
Nocturne.appliquerMode('nuit');   // portée en cours
```

Page en `noindex`, hors accueil et hors `sitemap.xml`.
