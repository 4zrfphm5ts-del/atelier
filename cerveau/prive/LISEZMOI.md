# Le cerveau privé

Ce dossier est **ignoré par git** (voir `.gitignore` à la racine). Rien de ce
qu'il contient ne part sur GitHub, donc rien n'est publié par GitHub Pages.

C'est ici que vivent les informations qui ne doivent jamais devenir publiques :

| Fichier | Contenu |
|---|---|
| `clients.md` | Clients réels : qui, quoi, quand, combien, où ça en est |
| `pipeline.md` | Affaires en cours, devis envoyés, relances à faire |
| `tarifs-negocies.md` | Remises accordées, conditions particulières, marges |
| `partenaires.md` | Agences, sous-traitants, conditions de marque blanche |
| `retours.md` | Ce qui a marché ou raté en prospection, objections entendues |

Seul ce `LISEZMOI.md` et les fichiers `*.exemple.md` sont versionnés.

## Mise en route

Copie les modèles et remplis-les :

```sh
cd cerveau/prive
for f in *.exemple.md; do cp "$f" "${f%.exemple.md}.md"; done
```

## Vérifier qu'il n'y a pas de fuite

Avant chaque commit :

```sh
git status --porcelain cerveau/prive/   # ne doit rien afficher
                                        # sauf LISEZMOI.md et *.exemple.md
```

## Si le dépôt devient privé un jour

Rien ne change : garder cette séparation reste une bonne idée. Elle permet de
partager le cerveau public avec un partenaire, ou de le publier comme exemple,
sans trier fichier par fichier.
