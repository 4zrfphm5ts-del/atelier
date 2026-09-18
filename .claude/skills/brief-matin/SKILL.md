---
name: brief-matin
description: Produit le brief du matin — mail, agenda et affaires en cours lus et résumés en une page, avec les brouillons prêts à valider. C'est le produit « Assistant, le brief du matin » appliqué au studio lui-même. Utiliser au démarrage de la journée ou sur déclenchement planifié.
---

# Le brief du matin

C'est la prestation vendue dès 590 €, exécutée pour le studio. Ce qui ne marche
pas ici ne se vend pas ailleurs.

## Périmètre

**Lecture seule partout.** La seule écriture autorisée est la création de
brouillons, dans la boîte mail, non envoyés. Aucun mail envoyé, aucune entrée
de CRM modifiée, aucune publication.

## 1. Lire

Dans l'ordre, sur les dernières 24 heures :

- **Mail** — les messages non traités. Repère ce qui vient d'un prospect ou
  d'un client, ce qui a une échéance, ce qui attend une réponse depuis plus de
  48 h ouvrées.
- **Agenda** — ce qui est prévu aujourd'hui et demain.
- **`cerveau/prive/pipeline.md`** s'il existe — les devis envoyés, les relances
  dues (J+7, J+21), ce qui dépasse le mois de validité.
- **Le dépôt** — pull requests ouvertes, intégration continue en échec.

## 2. Rendre

Une page, dans cet ordre. Le plus urgent en premier, jamais un ordre
chronologique.

**À faire aujourd'hui** — trois lignes maximum. Ce qui tombe si personne n'agit.

**Demandes entrantes** — une ligne par demande : qui, quoi, depuis combien de
temps, ce qui est prêt. Rappelle l'engagement des 48 h ouvrées si une demande
approche de la limite.

**Relances dues** — issues du pipeline, avec la date du dernier contact. On ne
relance jamais un non. Une à J+7, une à J+21, puis on laisse.

**Agenda** — l'heure, avec qui, ce qu'il faut avoir préparé.

**Brouillons prêts** — la liste de ce que tu as rédigé, avec le chemin ou le
lien du brouillon. Chacun porte ses `[à confirmer]`.

**Rien d'autre.** Si une section est vide, écris qu'elle est vide.

## 3. Les brouillons

Pour chaque demande entrante qui appelle une réponse simple, prépare le
brouillon en suivant la compétence `devis` si c'est un chiffrage, ou l'agent
`commercial` sinon.

Un brouillon qui repose sur une information que tu n'as pas s'arrête et
affiche `[à confirmer]`. Ne devine jamais un prix, un délai ou un engagement.

## 4. Journaliser

Ajoute une ligne à `journal/AAAA-MM.md` : date, heure, sources lues, nombre de
brouillons produits, actions proposées. C'est le « journal des exécutions »
promis aux clients. Il doit exister ici avant d'être vendu.

## Ce qui ne doit jamais arriver

- Un mail parti sans validation
- Un contenu de mail client recopié dans un fichier du dépôt public
- Un brief qui affirme une échéance ou un montant non vérifié
- Un brief de trois pages : s'il ne tient pas sur un écran, il a échoué
