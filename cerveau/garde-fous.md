# Garde-fous

**À lire avant toute production, sans exception.**

Cette fiche existe parce qu'une erreur ici ne coûte pas un mauvais texte : elle
coûte un engagement que le studio ne peut pas tenir, ou une donnée client
exposée.

## 1. Ce qu'on ne promet jamais

| Ne jamais écrire | Pourquoi | À écrire à la place |
|---|---|---|
| « Première place sur Google », « SEO garanti » | Dépend de la concurrence locale, invérifiable | « Le référencement technique est inclus. Personne ne peut honnêtement promettre la première place. » |
| Un délai de référencement | Varie selon les secteurs | Rien. Ne pas donner de durée. |
| « Devis sous 24 h » | L'engagement affiché est 48 h ouvrées | « Devis écrit sous 48 h ouvrées » |
| « Nous surveillons votre site après la mise en ligne » | Retiré du site en connaissance de cause | « Trente jours de questions inclus, puis un suivi si vous le souhaitez. » |
| Un déplacement sur place | Le studio travaille à distance | « À distance, par écrit et en visio. » |
| Une aide régionale obtenue ou son montant | Conditions et plafonds changent chaque année | « On regarde avec vous auprès de votre CCI ou de votre CMA, avant de signer. » |
| « +X % de chiffre d'affaires » | Aucun chiffre de résultat n'est vérifiable | Décrire ce que l'outil fait, pas ce qu'il rapporte. |
| Une astreinte, une réponse le week-end | Explicitement hors périmètre | « Pas d'astreinte la nuit ou le week-end. » |

## 2. Les prix

- **Aucun prix qui ne figure pas dans `offre.md`.** Si le cas n'y est pas, la
  réponse est « sur devis », pas une estimation inventée.
- Toujours « dès » devant un prix plancher.
- Toujours la mention « Prix nets, TVA non applicable, art. 293 B du CGI » sur
  une page ou un document qui affiche des prix.
- Les coûts externes (domaine, hébergement, API d'IA) sont payés par le client
  en direct, **sans marge**. Ne jamais les présenter comme inclus.

## 3. Les chiffres et les références

- Les démos utilisent des **données fictives**, et c'est écrit à l'écran. Ne
  jamais retirer cette mention, ne jamais présenter un chiffre de démo comme réel.
- Le Nuancier et Rive Blonde sont des **noms inventés**. Ne jamais les présenter
  comme des clients.
- Ne jamais inventer un client, un témoignage, un logo, un avis, un nombre de
  projets réalisés ou un chiffre d'affaires.
- Les seules références réelles utilisables sont listées dans `offre.md`.

## 4. Les écritures et les envois

- **Un agent rédige. Il n'envoie pas.** Mail, message, publication, mise à jour
  de CRM, commit poussé : tout passe par une validation humaine explicite.
- **Brouillon par défaut.** Pour le mail : créer un brouillon, jamais envoyer.
- **Lecture seule par défaut** sur les outils branchés. Une écriture doit être
  demandée nommément.
- Toute exécution automatique s'inscrit dans `journal/`.

## 5. Les données

- Ce dépôt est **public** (GitHub Pages). Rien de confidentiel n'y entre :
  ni nom de client réel, ni coordonnées de prospect, ni pipeline, ni tarif
  négocié, ni clé d'API, ni jeton.
- Le contenu sensible vit dans `cerveau/prive/`, qui est ignoré par git.
- L'adresse `benjamin.fieve@gmail.com` et le 06 10 12 68 50 sont déjà publics
  sur le site : ils peuvent rester dans le dépôt.
- Ne jamais copier le contenu d'un mail client dans un fichier du dépôt.

## 6. Le code

- Pas de build, pas de npm, pas de framework, pas de CDN. Voir `CLAUDE.md`.
- Une modification de contenu du studio se répercute dans les 4 langues.
- Une modification de fichier mis en cache impose d'incrémenter la version du
  cache dans le `sw.js` concerné.
- Une page ajoutée ou retirée se répercute dans `sitemap.xml`.

## 7. En cas de doute

Si une information n'est ni dans le cerveau, ni dans le dépôt, ni dans ce que
le client a écrit : **ne pas la produire**. Poser la question, ou laisser un
`[à confirmer]` visible dans le brouillon.

Un brouillon avec trois trous signalés est utile. Un brouillon complet dont
trois affirmations sont inventées est un piège.
