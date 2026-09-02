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
- **Langue** bascule **FR / EN** en haut à droite.

L'état est conservé dans `localStorage` (`nocturne.remote.v1`), la langue dans
`nocturne.langue.v1`.

## Français et anglais

Toute la page bascule : les libellés fixes, mais aussi les noms des pièces et des
lampes, les presets, les effets, les modes et leurs descriptions, les phrases
construites (« 3 lampes · éteinte » → « 3 lights · off ») et le journal du pont,
relu à l'affichage. `<html lang>`, le `<title>` et la meta `description` suivent.

Au premier passage, la langue vient du navigateur : français si `navigator.language`
commence par `fr`, anglais sinon. Dès qu'un bouton est touché, le choix est mémorisé
et prime sur le navigateur.

Les noms d'effets reprennent ceux de la télécommande : Bougie → Candle, Flamme →
Fire, Étincelles → Sparkle, Scintillement → Glisten, Rayon de soleil → Sunbeam,
Enchantement → Enchant.

### Ajouter ou corriger une traduction

Le **français est la source** : il est écrit en clair dans le markup (attribut
`data-t` sur l'élément) et dans les listes `PIECES`, `PRESETS`, `EFFETS`, `MODES`.
L'**anglais est un calque** posé par-dessus, indexé par les mêmes identifiants :

```js
const EN = {
  ui:      { portee:'Scope', maison:'Your home', … },   // clés = data-t du markup
  pieces:  { salon:'Living room', … },
  lampes:  { 'salon:0':'Floor lamp', … },               // clé = identifiant de lampe
  presets: { bougie:'Candle', … },
  effets:  { bougie:'Candle', … },
  modes:   { reveil:{ nom:'Wake-up', desc:'Soft white that wakes you gently' }, … },
};
```

Une entrée absente du calque retombe sur le français : rien ne casse, la ligne
reste simplement en français. Les phrases qui portent une valeur ou un pluriel
(« 3 lampes », « Réglages · … ») n'existent pas dans le markup : elles sont dans
`PHRASES.fr` / `PHRASES.en`.

Ajouter une troisième langue = un objet de la même forme qu'`EN`, une entrée dans
`PHRASES`, son code dans `LANGUES` et un bouton `data-langue` dans l'en-tête.

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

Côté langue :

```js
Nocturne.langues;                  // ['fr','en']
Nocturne.langue();                 // 'fr'
Nocturne.setLangue('en');          // bascule et mémorise ; false si code inconnu
Nocturne.nom.mode('cheminee');     // 'Fireplace' en anglais, 'Cheminée' en français
Nocturne.nom.piece('sdb');         // idem pour piece, lampe, preset, effet, descMode
```

Les listes `pieces`, `modes`… restent en français ; `Nocturne.nom.*` donne le nom
tel qu'il est affiché. Dans l'évènement `nocturne:commande`, `portee` est un
libellé figé dans la langue du moment de l'envoi ; `lampes` (les identifiants)
est la donnée stable sur laquelle s'appuyer.

Page en `noindex`, hors accueil et hors `sitemap.xml`.
