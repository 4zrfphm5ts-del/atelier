---
name: carrousel
description: Produit un carrousel de publication Vasistas — texte et images, dans la voix et la direction artistique du studio. Utiliser pour toute publication sur les réseaux, en français ou en anglais.
---

# Produire un carrousel

Un carrousel Vasistas montre quelque chose de vrai. Il n'annonce pas, il ne
teasote pas, il ne demande pas de commenter un mot-clé pour recevoir un lien.

## 1. L'angle

Lis `cerveau/voix.md`, `cerveau/da.md`, `cerveau/garde-fous.md`.

Un carrousel = un sujet, un angle, un exemple réel. Les angles légitimes :

- Ce que le studio refuse de faire, et pourquoi
- La maquette avant paiement
- Pour un commerce, la fiche Google pèse souvent plus lourd que le site
- Le fichier Excel devenu ingérable
- Qui est propriétaire du code, du domaine, des données
- L'étymologie du nom — pas deux fois de suite
- Un système réel : VIGIE, DADA Cafétéria, Au Soleil

Pas de « 5 astuces pour ». Pas de chiffre de résultat. Pas de fausse promesse.

## 2. La structure

Six à huit vues. Une idée par vue, lisible en deux secondes.

| Vue | Rôle |
|---|---|
| 1 | L'accroche — une affirmation nette, pas une question |
| 2 | Le problème, tel que le client le vit |
| 3 à 6 | Ce qu'on fait, concrètement. Une chose par vue. |
| Avant-dernière | La limite, ce qu'on ne promet pas |
| Dernière | Ce qu'il faut faire ensuite. Sobre. |

La vue « limite » n'est pas optionnelle : c'est elle qui rend le reste crédible.

## 3. Les images

Format portrait 1080 × 1350. Écris une page HTML autonome par vue, avec les
variables de `studio/assets/site.css` : fond `--blanc` ou `--gris`, encre
`#0B0D12` pour les titres en Inter Tight, texte `#3E4553` en Inter, accent
`#2447F5` sur un seul élément par vue.

Capture chaque vue avec le script du dépôt, qui n'installe rien :

```sh
outils/capture.sh vue-1.html sorties/carrousel/2026-09-18-sujet/1.png 1080 1350
```

Si une vue montre un écran : heure 9:41, et le bandeau qui convient
(« Démo, données fictives » / « Client, en ligne » / maquette à nom inventé).

## 4. La légende

Trois à cinq phrases dans la voix. Elle redit l'essentiel pour qui ne fait pas
défiler. Elle finit par un moyen de contact simple, pas par un appel à commenter.

## 5. Contrôler

- [ ] Chaque vue est lisible sur un téléphone, à taille réelle
- [ ] Contraste du texte au moins 4,5:1
- [ ] Aucune couleur ni police hors des variables
- [ ] Aucun chiffre inventé ; toute démo est signalée comme fictive
- [ ] La vue « limite » est présente
- [ ] Aucun superlatif, aucun point d'exclamation, aucun emoji

## 6. Rendre

`sorties/carrousel/AAAA-MM-JJ-sujet/` avec les images numérotées et
`legende.md`. Donne le chemin. Ne publie rien.
