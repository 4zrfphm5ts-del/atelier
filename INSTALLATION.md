# Installer le système sur votre machine

Ce dépôt contient un cerveau (`cerveau/`), quatre agents (`.claude/agents/`) et
trois compétences (`.claude/skills/`). Tout est fait pour tourner en local.

## Pourquoi en local plutôt qu'ici

La session distante où ce système a été écrit est un conteneur éphémère : il est
réinitialisé, et le cerveau doit au contraire s'enrichir semaine après semaine.
En local, quatre choses changent :

- Le cerveau privé reste sur votre disque, jamais sur GitHub.
- Les agents voient vos vrais fichiers : devis, factures, exports de caisse.
- Vous pouvez planifier une exécution à 7 h 30 sans dépendre d'un service tiers.
- C'est exactement ce que Vasistas vend : *« l'assistant tourne sur votre Mac,
  rien sur nos serveurs »*. Le système sert alors de démonstration de l'offre.

## Prérequis

- **Node.js 18 ou plus** — `node --version`
- **git** — `git --version`
- **Claude Code** — `npm install -g @anthropic-ai/claude-code`, puis `claude`
  une première fois pour vous connecter.

Sur **macOS** et **Linux**, rien de particulier.
Sur **Windows**, Claude Code fonctionne nativement ; si vous rencontrez des
comportements étranges avec les chemins ou les scripts shell, passez par WSL 2,
qui reste le terrain le plus balisé.

## Installation

```sh
git clone https://github.com/4zrfphm5ts-del/atelier.git
cd atelier
git checkout claude/instagram-system-compatibility-z78y9f
```

Puis créez le cerveau privé depuis les modèles :

```sh
cd cerveau/prive
for f in *.exemple.md; do cp "$f" "${f%.exemple.md}.md"; done
cd ../..
```

Sur Windows PowerShell :

```powershell
Get-ChildItem cerveau\prive\*.exemple.md | ForEach-Object {
  Copy-Item $_ ($_.FullName -replace '\.exemple\.md$', '.md')
}
```

Vérifiez que rien de privé ne peut partir :

```sh
git status --porcelain cerveau/prive/
# ne doit lister que LISEZMOI.md et les *.exemple.md
```

Enfin, lancez `claude` depuis le dossier `atelier`. Le fichier `CLAUDE.md` est
lu automatiquement.

## Vérifier que ça marche

Dans Claude Code :

```
> Lis cerveau/offre.md et dis-moi le prix d'un menu QR.
```

Réponse attendue : *dès 290 €*. Si le prix est inventé ou approximatif, le
cerveau n'est pas chargé — vérifiez que vous êtes bien dans le dossier `atelier`.

Puis essayez un agent et une compétence :

```
> Utilise l'agent commercial pour préparer une réponse à cette demande : [collez la demande]
> /devis
> /carrousel
> /brief-matin
```

## Produire une image

Aucune dépendance à installer : le script utilise le Chrome ou le Chromium déjà
présent sur votre machine.

```sh
outils/capture.sh ma-page.html sorties/visuel/image.png 1080 1350
```

Il cherche, dans l'ordre, le Chromium du conteneur, puis Google Chrome,
Chromium ou Edge sur macOS, puis les mêmes sur Linux. Si rien n'est trouvé, il
le dit et s'arrête.

Sur **Windows**, le script shell ne s'exécute pas tel quel. Soit vous passez par
WSL 2, soit vous appelez Chrome directement :

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless --disable-gpu --hide-scrollbars `
  --force-device-scale-factor=2 --window-size=1080,1350 `
  --screenshot=sortie.png "file:///C:/chemin/vers/page.html"
```

## Brancher vos outils

Le brief du matin a besoin de votre mail et de votre agenda. Ajoutez les
connecteurs depuis Claude Code (`/mcp`) ou dans les réglages de votre compte.

Deux règles, reprises de `cerveau/garde-fous.md` :

- **Lecture seule par défaut.** N'accordez l'écriture que pour la création de
  brouillons.
- **Rien ne part sans vous.** `git push` et `rm -rf` sont refusés dans
  `.claude/settings.json`, ainsi que la lecture des fichiers `.env`, `.key`
  et `.pem`.

Vos réglages personnels vont dans `.claude/settings.local.json`, qui est ignoré
par git. Ne mettez jamais de clé d'API dans `.claude/settings.json`.

### Le cas de `git push`, en connaissance de cause

L'interdiction de `git push` est un choix, pas un oubli, et elle a un coût réel :
l'agent ne peut pas livrer seul. Elle a d'ailleurs bloqué la session qui a écrit
ce système, qui a dû passer par l'API GitHub pour livrer.

Gardez-la. Ce dépôt est publié sur GitHub Pages : un `push` met en ligne, devant
vos clients, sans repasser par vous. C'est précisément le genre d'action que le
reste du système protège — *« rien ne part sans votre validation »*. En pratique,
l'agent prépare et commite, vous relisez le diff et vous poussez :

```sh
git log --oneline -3
git show --stat HEAD
git push
```

Si vous voulez malgré tout l'autonomie complète sur un dépôt qui n'est pas
public, retirez la ligne `"Bash(git push:*)"` du bloc `deny`. Ne le faites pas
sur celui-ci.

## Planifier le brief du matin

C'est la partie « ça tourne pendant que vous dormez ». Claude Code s'exécute
sans interface avec `claude -p "…"`. Vérifiez les options disponibles avec
`claude --help` avant de figer une ligne de commande : elles évoluent.

**macOS et Linux**, `crontab -e` :

```
30 7 * * 1-5 cd ~/atelier && /usr/local/bin/claude -p "/brief-matin" >> journal/cron.log 2>&1
```

Le chemin absolu vers `claude` est nécessaire : cron n'a pas votre `PATH`.
Trouvez-le avec `which claude`.

Sur macOS, le Terminal (ou l'outil qui lance la tâche) doit être autorisé dans
*Réglages Système → Confidentialité et sécurité → Accès complet au disque*,
sinon la tâche échouera silencieusement.

**Windows**, Planificateur de tâches : action « Démarrer un programme »,
programme `claude`, arguments `-p "/brief-matin"`, dossier de départ le chemin
du dépôt.

Commencez par un déclenchement manuel une semaine durant avant d'automatiser.
Une tâche planifiée qui produit des brouillons faux chaque matin est pire que
pas de tâche du tout.

## Faire vivre le cerveau

C'est la seule partie qui demande de la discipline, et c'est elle qui fait la
différence entre un gadget et un système.

- Après chaque projet livré, ajoutez une ligne dans `cerveau/prive/clients.md`.
- Après chaque objection entendue, une ligne dans `cerveau/prive/retours.md`.
- Quand une formulation marche deux fois, elle monte dans `cerveau/voix.md`.
- Quand un prix change sur le site, il change dans `cerveau/offre.md` **le même
  jour**. Un cerveau qui ment sur les prix est dangereux.
- Relisez le journal en fin de semaine pour repérer ce qui tourne à vide.

## Ce qui reste à faire

- Remplir `cerveau/prive/` avec vos vraies données : le système est prêt, il est
  vide.
- Décider si le cerveau public reste dans ce dépôt, qui est **public**. Voir
  la section correspondante du LISEZMOI privé.
- Une fois le brief du matin stable, le proposer aux clients : il est vendu
  dès 590 €, et il tournera d'abord chez vous.
