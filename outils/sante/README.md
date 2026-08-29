# Reprise de l'historique Apple Santé — sans Mac

`sante.py` transforme l'export de l'app Santé en **un instantané par jour**,
prêt à être poussé vers NOCTURNE. Fichier unique, bibliothèque standard
uniquement : il tourne dans un terminal comme dans a-Shell sur iPhone/iPad.
Rien à installer.

Les données ne quittent jamais la machine où tourne le script, sauf au moment
explicite de la commande `pousse`.

---

## 1. Sortir les données de l'iPhone

App **Santé** → ta photo de profil en haut à droite → tout en bas →
**Exporter toutes les données santé** → confirmer.

L'iPhone travaille quelques minutes, puis propose une feuille de partage :
**Enregistrer dans Fichiers**. Tu obtiens `export.zip`.

Ça marche aussi depuis l'iPad en iPadOS 17 ou plus récent, les données Santé
étant synchronisées par iCloud.

## 2. Regarder ce qu'il y a dedans

```sh
python3 sante.py inspecte export.zip
```

Affiche la période couverte, le nombre d'enregistrements, **le nom exact de
chaque source** (il dépend de la langue et du nom donné à la montre), le
matériel identifié, et la liste des types de mesures avec leurs unités. Les
types précédés de `:` sont exploités, ceux précédés de `.` sont ignorés.

À faire en premier : c'est ce qui dit quoi demander à l'étape suivante.

## 3. Agréger en instantanés quotidiens

```sh
python3 sante.py agrege export.zip -o jours.json --csv jours.csv
```

| Option | Effet |
| --- | --- |
| `--source montre` | ne garder que l'Apple Watch (identifiée par son matériel, pas par son nom) |
| `--priorite montre` | en cas de recouvrement, la montre l'emporte sur l'iPhone (défaut) |
| `--depuis` / `--jusqu-a` | limiter la période, en `AAAA-MM-JJ` |
| `--sans-dedup` | somme brute, mémoire minimale — à réserver au cas où l'on filtre déjà sur une seule source |
| `--lisible` | JSON indenté |

| `--leger` | préréglage iPhone : montre seule, sans dédoublonnage, mémoire minimale |

**Mesures réelles**, sur un export synthétique de 1,18 Go et 3,3 millions
d'enregistrements — soit environ huit ans de port quotidien :

| Mode | Durée | Mémoire | Sortie |
| --- | --- | --- | --- |
| complet, avec dédoublonnage | 99 s | 107 Mo | 3 001 jours |
| `--leger` | 73 s | 32 Mo | 3 001 jours |
| une seule année | 28 s | 34 Mo | 366 jours |

Sur cet export, `--leger` donne exactement le même nombre de pas que le mode
complet : la montre couvre déjà tout, et les enregistrements de l'iPhone sont
intégralement recouverts. L'écart n'apparaît que si l'iPhone a bougé seul.

## 3 bis. Sur iPhone, sans aucun ordinateur

Installer **a-Shell mini** depuis l'App Store — moins de 250 Mo, et il contient
déjà Python 3.11 avec tout ce dont le script a besoin. L'a-Shell complet pèse
environ 2 Go : inutile ici, et malvenu sur un téléphone déjà chargé.

1. Déposer `sante.py` et `export.zip` dans **Fichiers → Sur mon iPhone → a-Shell**
   (ou utiliser `pickFolder` dans a-Shell pour aller les chercher ailleurs).
2. Dans a-Shell : `python3 sante.py agrege export.zip -o jours.json --leger`

Trois précautions qui évitent les échecs les plus courants :

- **Rapatrier le fichier avant.** Un `export.zip` qui vit dans iCloud Drive
  n'existe localement que sous forme de talon tant qu'on ne l'a pas touché dans
  l'app Fichiers. L'outil le détecte et le dit, mais autant l'éviter : touche le
  fichier, attends que l'icône de nuage disparaisse.
- **Ne pas quitter a-Shell pendant le traitement.** L'app ne demande aucun temps
  d'exécution en arrière-plan : passer sur une autre application suspend le
  script, et une app suspendue est la première que le système tue quand il
  manque de mémoire. L'écran, lui, ne s'éteindra pas tout seul.
- **Pas besoin de `unzip`.** Il n'est pas fourni avec a-Shell, et il ne sert à
  rien : le script lit l'archive en flux, sans jamais écrire le gigaoctet de XML
  sur le disque.

Si le traitement s'interrompt malgré tout, reprendre année par année avec
`--depuis` et `--jusqu-a`.

## 4. Pousser vers NOCTURNE

Toujours commencer par un essai à blanc, qui n'envoie rien et montre exactement
le corps de la requête :

```sh
python3 sante.py pousse jours.json --url https://.../health --essai
```

Puis, pour de vrai :

```sh
export NOCTURNE_JETON='...'
python3 sante.py pousse jours.json \
    --url https://.../health \
    --jeton-env NOCTURNE_JETON \
    --etat envoyes.json
```

| Option | Effet |
| --- | --- |
| `--forme jour` \| `lot` | une requête par jour, ou par paquets de `--taille-lot` |
| `--enveloppe health` | encapsule le corps : `{"health": {...}}` |
| `--champ-date jour` | renomme la clé `date` si l'API en attend une autre |
| `--entete "X-Truc: valeur"` | en-tête HTTP supplémentaire, répétable |
| `--etat envoyes.json` | mémorise les jours envoyés : relancer reprend où ça s'était arrêté |
| `--profil profil.json` | remet les instantanés à la forme attendue par l'API |

**Le profil d'envoi** évite d'avoir à toucher au script quand l'API attend
d'autres noms de champs. `python3 sante.py profil-exemple > profil.json` en
produit un modèle commenté ; toutes les clés sont facultatives :

```json
{
  "garder": ["date", "pas", "fc_repos", "sommeil"],
  "aplatir": { "sommeil": "sommeil_" },
  "renommer": { "pas": "steps", "fc_repos": "restingHeartRate" },
  "constantes": { "source": "apple-health-export" },
  "enveloppe": "health",
  "champ_date": "day"
}
```

`garder` filtre, `aplatir` fait remonter les sous-objets avec un préfixe,
`renommer` s'applique après, `constantes` ajoute des champs fixes. Vérifier le
résultat avec `--essai` avant d'envoyer quoi que ce soit.

Le jeton se passe par variable d'environnement, jamais en argument ni dans un
fichier : il n'a rien à faire dans un dépôt ni dans l'historique du shell.

Trois garde-fous sur le seul chemin où des données médicales quittent la machine :

- **`http://` refusé** pour tout hôte qui n'est pas la boucle locale. `https://`
  ou rien — `--autoriser-http` existe pour un serveur de test chez soi.
- **Redirections refusées.** Par défaut, urllib rejoue la requête à la nouvelle
  adresse avec tous les en-têtes, jeton compris. Une redirection est traitée ici
  comme une erreur, pas comme un détour.
- **Fichier de reprise écrit de façon atomique**, pour qu'une interruption ne
  laisse jamais un état tronqué — lequel ferait soit tout renvoyer, soit croire
  à tort que des jours sont partis.

En cas d'erreur réseau, chaque requête est retentée quatre fois (2 s, 4 s, 8 s,
16 s). Une erreur 4xx est définitive et arrête le traitement du lot.

## 5. Vérifier l'outil

```sh
python3 sante.py autotest
```

76 vérifications sur des exports synthétiques : dédoublonnage, minuit, fuseaux,
unités régionales, stades de sommeil, anciens formats, corrélations, saisies
manuelles, DTD démesurée ou malformée, export tronqué, en-tête absent, lecture
en flux depuis le zip — et un envoi réseau réel contre un serveur local
(transmission, jeton, reprise, lots, refus de redirection).

Un test mesure aussi le **pic mémoire** sur deux fichiers de tailles
différentes et vérifie qu'il ne suit pas la taille du fichier : c'est la
propriété qui décide si l'outil tourne sur un iPhone, et rien ne la protégeait.

Il a aussi été confronté à un véritable export Apple « HealthKit Export
Version 12 », dont la DTD est réellement corrompue et que tous les analyseurs
XML de la bibliothèque standard refusent (`ParseError: syntax error: line 155`) :
il le lit sans broncher.

L'outil a par ailleurs été soumis à 500 exports volontairement malformés
(dates impossibles, valeurs `NaN`, attributs manquants, corrélations imbriquées) :
aucun plantage, aucun JSON invalide.

---

## Ce que contient un instantané

```json
{
  "date": "2024-05-15",
  "pas": 8640,
  "distance_km": 6.312,
  "energie_active_kcal": 440.8,
  "energie_repos_kcal": 1652.0,
  "exercice_min": 42,
  "debout_h": 11,
  "fc_moy": 100.4, "fc_min": 48.0, "fc_max": 150.0, "fc_n": 288,
  "fc_repos": 54.0,
  "fc_marche": 96.2,
  "vfc_ms_moy": 42.1,
  "spo2_moy": 97.1,
  "respiration_moy": 14.2,
  "vo2max": 41.2,
  "temp_poignet_moy": 36.8,
  "sommeil": {
    "total_min": 455, "leger_min": 280, "profond_min": 80, "rem_min": 95,
    "eveil_min": 12, "au_lit_min": 480,
    "debut": "23:10", "fin": "06:57",
    "efficacite_pct": 97.4, "reveils": 1
  },
  "anneaux": { "energie_active_kcal": 496.0, "exercice_min": 26, "debout_h": 7 },
  "seances": [ { "type": "Running", "duree_min": 31.5 } ]
}
```

Une clé absente signifie « pas de mesure ce jour-là » — jamais zéro. Le document
complet porte en plus un bloc `meta` : période, volumétrie, sources rencontrées,
anomalies.

---

## Les décisions qui comptent

**Double comptage.** `export.xml` contient les enregistrements bruts de toutes
les sources, non dédoublonnés — contrairement à ce que l'app Santé affiche.
Sommer naïvement les pas quand l'iPhone est dans la poche et la montre au
poignet donne un total gonflé de près du double. L'outil traite les sources par
priorité et ne compte chaque enregistrement que sur la portion de temps
qu'aucune source plus prioritaire n'a déjà couverte, au prorata de sa durée.

**Minuit.** Un enregistrement de 23h50 à 00h10 est réparti entre les deux jours
au prorata de la durée, pas attribué en bloc au jour de début.

**Fuseaux.** Apple écrit l'heure *locale du lieu de la mesure*, suivie de son
décalage. Le jour calendaire est donc lu directement dans la chaîne, sans aucun
calcul : les données enregistrées en voyage tombent sur le bon jour, et les
changements d'heure ne posent pas de problème. Les heures de coucher et de lever
sont réaffichées dans le fuseau où la nuit a été vécue.

**Les nuits.** Les segments sont d'abord regroupés en **épisodes** — deux
périodes séparées par plus de trois heures sont deux sommeils distincts — puis
chaque épisode est rattaché au **jour du réveil**, comme dans l'app Santé. Une
sieste de l'après-midi tombe le même jour que la nuit achevée le matin : elle
sort sous `siestes`, sans fausser l'heure de coucher, l'efficacité ni le nombre
de réveils de la nuit.

Les segments qui se chevauchent — la montre en écrit beaucoup, une app tierce
peut écrire les siens — sont unis avant d'être comptés, jamais additionnés. Un
segment explicitement marqué « éveil » est **retranché** du sommeil, même si une
autre source a couvert la même plage d'un « endormi » grossier.

L'efficacité est le temps endormi rapporté au **temps passé au lit**, la
définition usuelle. À défaut d'enregistrement « au lit » — Apple n'en écrit plus
depuis watchOS 11 — elle retombe sur la durée de l'épisode.

Le filtre de période s'applique à la nuit de rattachement, pas au jour du
coucher : demander « depuis le 16 » conserve la nuit du 15 au 16.

**Unités.** Miles, pieds, livres, degrés Fahrenheit et kilojoules sont convertis.
L'unité dépend des réglages régionaux et peut changer au fil de l'historique.

**L'identification de la montre.** Elle se fait par l'attribut `device`, qui
contient `hardware:Watch`. Le repli sur le nom de la source n'intervient que
lorsque cet attribut manque — il manque réellement sur certains enregistrements
— et exige « apple watch » : se contenter de « watch » ferait passer pour une
Apple Watch n'importe quelle app tierce au nom bien choisi, et lui donnerait la
priorité sur les vraies mesures.

**Le nom du fichier.** Le XML n'est pas reconnu à son nom : celui-ci est
traduit selon la langue de l'iPhone. Il est reconnu à son contenu, en cherchant
l'élément racine `HealthData`. Cela écarte du même coup `export_cda.xml`, un
document clinique d'une autre nature et fréquemment malformé, ainsi que les
entrées parasites `__MACOSX` d'une archive re-zippée sur un Mac.

**La DTD.** Apple place en tête d'`export.xml` une déclaration `<!DOCTYPE>` de
plusieurs milliers de lignes qui ne sert à rien ici. L'outil la retire à la
volée. Effet de bord heureux : les exports d'iOS 16.0 et 16.1, dont la DTD
était elle-même malformée — déclaration non fermée, `>` en trop — et que
beaucoup de parseurs refusent, passent sans encombre.

**Les corrélations.** Apple écrit deux fois les mesures groupées — une tension
artérielle, un repas — une fois dans le `<Correlation>` et une fois au premier
niveau. C'est écrit noir sur blanc dans sa propre DTD. L'outil ne retient que la
copie de premier niveau.

**Les saisies manuelles.** L'app Santé classe les données saisies à la main
au-dessus de tous les appareils. L'outil fait pareil : une valeur corrigée à la
main l'emporte sur la mesure de la montre.

**Les pourcentages.** SpO2 et stabilité à la marche portent `unit="%"` mais
Apple y écrit une fraction (`0.97`), là où certaines apps tierces écrivent `97`.
Les deux sont ramenés à une échelle 0–100.

**Les anneaux.** Les `ActivitySummary` d'Apple sont conservés tels quels, à côté
des valeurs ré-agrégées. Les deux ne coïncident pas toujours : c'est normal, et
utile pour se contrôler. Leur unité d'énergie suit la région (kcal, Cal ou kJ)
et est convertie.

**L'export reste manuel.** Aucune action Raccourcis d'Apple ne déclenche
« Exporter toutes les données de santé », et HealthKit n'expose pas cette
archive : c'est une fonction de l'app Santé, pas du framework. Le rattrapage
historique passe donc forcément par l'export à la main — une fois.

**En revanche, la suite peut s'automatiser sans Mac.** Raccourcis sait lire
HealthKit nativement : les actions « Rechercher tous les échantillons de santé »
et « Calculer les statistiques » permettent de filtrer par type, par période et
par source, puis d'envoyer le résultat à une API. De quoi tenir le quotidien à
jour sans Xcode, en attendant `dailyHistory` dans NocturneKit. Une automatisation
programmée exige toutefois un iPhone déverrouillé : les données de santé sont
inaccessibles sur un appareil verrouillé.

**Ce que l'outil ne peut pas faire.** `export.xml` ne contient pas l'ordre de
priorité des sources configuré dans l'app Santé. Reproduire au chiffre près ce
qu'affiche l'app est donc structurellement impossible à partir du seul fichier.
L'ordre appliqué ici — saisie manuelle, puis montre, puis iPhone, puis apps
tierces — est le plus proche de celui d'Apple.
