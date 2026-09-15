# ÉLAN — ce qu'il reste à valider

Le site entreprise `/elan/` est en ligne avec des valeurs de départ que **toi seul peux
confirmer**. Rien de ce qui suit n'est bloquant pour la mise en ligne, mais chaque point
engage soit ton prix, soit ta parole devant un client. Relis-les avant de diffuser l'adresse.

## 1. Les prix affichés

Ils sont cohérents entre eux et avec le marché lillois, mais ils sortent d'une hypothèse,
pas de ta facturation réelle. Ils apparaissent à trois endroits : la section « Formats
d'intervention » de l'accueil, les pages `conseil.html` et `studio.html`, et le balisage
JSON-LD en bas de chaque page (à corriger aussi si tu changes un montant).

| Format | Prix affiché | Page |
|---|---|---|
| Diagnostic & cadrage (2 semaines) | 2 400 € | accueil, conseil |
| Mission de conseil au forfait | dès 6 000 € | accueil, conseil |
| Data & pilotage / Acquisition & growth | dès 6 000 € | conseil |
| IA & automatisation | dès 4 800 € | conseil |
| Temps partagé | dès 1 900 €/mois | accueil, conseil |
| Journée d'expertise | 650 €/jour | conseil |
| Conception & design | dès 3 900 € | accueil, studio |
| Site ou produit sur mesure | dès 6 900 € | accueil, studio |
| Outils internes & automatisations | dès 2 400 € | studio |
| Mise en ligne & référencement | dès 1 200 € | studio |
| Suivi & évolutions | 90 €/h (forfait dès 180 €/mois) | accueil, studio |

## 2. Le plafond de la micro-entreprise

Les mentions légales annoncent « TVA non applicable, art. 293 B du CGI », ce qui est exact
aujourd'hui. Avec les prix ci-dessus, le plafond de franchise de TVA puis le plafond de
chiffre d'affaires de la micro-entreprise arrivent vite : **deux ou trois missions de
conseil dans l'année suffisent**. Le jour où tu passes au réel ou en société, il faut
reprendre, dans `elan/mentions-legales.html` et `enseigne/mentions-legales.html` :

- la ligne TVA (taux, mention sur les devis et factures) ;
- la forme juridique et le capital si tu crées une société ;
- les prix affichés, qui deviennent des montants HT.

## 3. Les promesses chiffrées

Elles sont tenables mais ce sont des engagements publics. Elles figurent dans les bandeaux
de hero, la section « Nos engagements » et les FAQ :

- devis écrit **sous 48 h** après le premier échange ;
- diagnostic livré en **deux semaines**, restitution comprise ;
- démarrage sous **une à trois semaines** ;
- **deux allers-retours** inclus à chaque palier, **30 jours** de corrections après livraison ;
- demandes de suivi traitées **sous 3 jours ouvrés** ;
- point de suivi **à 30 jours** inclus après une mission de conseil.

## 4. Ce qui n'est volontairement pas écrit

Aucun nom de client (hors DADA, déjà public), aucun chiffre de résultat, aucun logo de
référence, aucune ancienneté affichée : rien de tout cela n'a été inventé. Quand tu auras
l'accord d'un client pour être cité, la section « Réalisations » de l'accueil est prête à
recevoir une carte de plus (`elan/index.html`, bloc `.travaux`).

La phrase de L'Enseigne « ÉLAN, studio data & growth qui travaille pour des fonds
d'investissement et des scale-ups » est **ton texte d'origine**, conservé tel quel et
maintenant lié vers `/elan/`. Si elle anticipe sur la réalité, c'est le moment de la
reformuler — elle est à la ligne « Du sérieux derrière » de `enseigne/index.html`.

## 5. L'équipe

Le site dit que tu diriges la maison et que tu réunis des spécialistes **selon les
missions**, sans jamais laisser croire à un effectif salarié. C'est le positionnement
« entreprise » sans mensonge sur la taille. À revoir le jour où tu recrutes ou où tu
t'associes durablement à des indépendants : la section « La maison » pourra alors nommer
les personnes.

## 6. Suite logique

1. **Nom de domaine** — le site est prêt à passer sur `elan-studio.fr` (ou autre) : la
   marche à suivre est dans [`nom-de-domaine.md`](nom-de-domaine.md). Toutes les URL
   absolues à reprendre alors : `canonical`, `og:url`, `og:image`, JSON-LD, `sitemap.xml`.
2. **Photo du dirigeant** — la carte d'identité de la section « La maison » tient sans
   photo, mais une vraie photo la crédibilise. Format conseillé : 800×800, JPEG, < 120 Ko.
3. **Adresse de contact** — tout part aujourd'hui sur `benjamin.fieve@gmail.com`. Une
   adresse au nom du domaine (`contact@…`) fait une différence nette en B2B ; elle se
   change à un seul endroit par page (`data-dest` du formulaire, liens `mailto:`).
4. **Preuve** — un seul cas client détaillé (contexte, ce qui a été fait, résultat) vaut
   plus que dix lignes d'arguments. À écrire dès qu'un client accepte d'être cité.
