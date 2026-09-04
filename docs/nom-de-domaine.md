# Mettre un nom de domaine sur les sites

Aujourd'hui tout est publié par GitHub Pages sous
`https://4zrfphm5ts-del.github.io/atelier/`. C'est une adresse de dépôt : elle
fonctionne, mais elle ne se dicte pas au téléphone et elle n'inspire pas
confiance sur une carte de visite.

L'achat du domaine se fait chez un bureau d'enregistrement (registrar) avec une
carte bancaire — c'est à toi de le faire, je n'ai pas de moyen de paiement. Une
fois le nom acheté, la mise en service ci-dessous prend une dizaine de minutes.

## 1. Choisir la portée

**Un domaine pour l'atelier entier** (ex. `studio-bfieve.fr`)
Le domaine remplace `4zrfphm5ts-del.github.io/atelier`. Les pages gardent leur
chemin : `studio-bfieve.fr/dada/`, `studio-bfieve.fr/enseigne/`, etc. Un seul
domaine à payer, une seule configuration.

**Un domaine par site client** (ex. `dadacafeteria.fr`)
C'est ce qu'il faut pour le référencement local de DADA : le nom du commerce
dans l'adresse, à la racine. Techniquement, un dépôt GitHub Pages ne porte
**qu'un seul** domaine, appliqué à tout le dépôt — avec l'organisation actuelle,
`dadacafeteria.fr` mènerait à `dadacafeteria.fr/dada/`, ce qui n'a pas de sens.
Il faut alors sortir `dada/` dans son propre dépôt (je peux le faire, en gardant
l'historique) et lui donner le domaine.

Les deux peuvent coexister : un domaine d'atelier ici, un domaine dédié pour
chaque site client sorti dans son dépôt.

## 2. Acheter le nom

N'importe quel registrar sérieux fait l'affaire (OVH, Gandi, Infomaniak,
Cloudflare Registrar…). Pour un `.fr`, compte une quinzaine d'euros par an.
Deux points à vérifier au moment de payer : que la protection des données
personnelles (WHOIS) soit incluse, et le tarif de **renouvellement**, souvent
plus élevé que la première année.

## 3. Configurer le DNS

Chez le registrar, dans la zone DNS du domaine :

| Type  | Nom   | Valeur                |
|-------|-------|-----------------------|
| A     | `@`   | `185.199.108.153`     |
| A     | `@`   | `185.199.109.153`     |
| A     | `@`   | `185.199.110.153`     |
| A     | `@`   | `185.199.111.153`     |
| AAAA  | `@`   | `2606:50c0:8000::153` |
| AAAA  | `@`   | `2606:50c0:8001::153` |
| AAAA  | `@`   | `2606:50c0:8002::153` |
| AAAA  | `@`   | `2606:50c0:8003::153` |
| CNAME | `www` | `4zrfphm5ts-del.github.io.` |

Adresses relevées le 04/09/2026 sur les serveurs de GitHub ; l'écran
*Settings → Pages* du dépôt affiche celles en vigueur si jamais elles changent.

La propagation DNS prend de quelques minutes à quelques heures.

## 4. Brancher le dépôt

1. Dépôt GitHub → **Settings → Pages → Custom domain** : saisir le domaine et
   valider. GitHub crée un fichier `CNAME` à la racine du dépôt.
2. Attendre que le contrôle DNS passe au vert, puis cocher **Enforce HTTPS**
   (certificat Let's Encrypt automatique et gratuit).

## 5. Ce qu'il reste à reprendre dans le code

Les adresses absolues pointent encore vers `github.io`. Une fois le domaine
actif, il faut les remplacer partout :

- `<link rel="canonical">` de chaque page ;
- balises `og:url`, `og:image` ;
- `url`, `image` et `hasMenu` du bloc JSON-LD de `dada/index.html` ;
- `sitemap.xml` et `robots.txt`.

C'est mécanique : donne-moi le nom de domaine et je passe le tout en un commit.

## 6. Et le référencement, alors ?

Le domaine aide, mais pour un commerce il pèse moins lourd que ces trois-là,
dans l'ordre :

1. **La fiche Google Business Profile** — c'est elle qui place DADA dans le
   bloc carte quand quelqu'un cherche « café Lille » depuis son téléphone.
   Photos, horaires à jour, avis : c'est le premier levier, et il est gratuit.
2. **La cohérence nom / adresse / téléphone** entre la fiche, le site et les
   annuaires (le site expose déjà ces données en JSON-LD, ce qui aide Google à
   les recouper).
3. **Le domaine propre**, qui crédibilise les partages et les liens entrants.

Une fois le domaine en place, inscrire le site dans la Google Search Console et
y déposer le `sitemap.xml` accélère l'indexation.
