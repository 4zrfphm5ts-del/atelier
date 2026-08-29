#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sante.py — reprise de l'historique Apple Sante / Apple Watch, sans Mac.

Fichier unique, bibliotheque standard uniquement : il tourne aussi bien dans un
terminal que dans a-Shell sur iPhone/iPad. Aucune dependance a installer.

  1. inspecte  : dit ce que contient l'export (sources, types, periode, volumes)
  2. agrege    : transforme export.zip en un instantane par jour (JSON compact)
  3. pousse    : envoie ces instantanes vers l'API de NOCTURNE
  4. autotest  : verifie l'outil sur des exports synthetiques

Les donnees de sante ne sortent jamais de la machine ou tourne ce script, sauf
au moment explicite de la commande « pousse ».
"""

from __future__ import annotations

import argparse
import array
import csv
import datetime as dt
import io
import json
import math
import os
import re
import sys
import unicodedata
import zipfile
from collections import defaultdict

VERSION = "1.0"

# --------------------------------------------------------------------------
# Table des metriques
# --------------------------------------------------------------------------
# mode :
#   "somme"   -> grandeur cumulative sur un intervalle (pas, calories...).
#                Dedoublonnage par intervalles, prorata a cheval sur minuit.
#   "moyenne" -> mesure instantanee (frequence cardiaque...). On sort la
#                moyenne, le min, le max et le nombre de mesures.
#   "unique"  -> une valeur deja quotidienne (FC de repos, VO2Max). On prend
#                la moyenne des valeurs du jour, ce qui vaut la valeur elle-meme
#                quand il n'y en a qu'une.

class Metrique:
    __slots__ = ("cle", "mode", "unite", "facteur", "decimales")

    def __init__(self, cle, mode, unite=None, facteur=1.0, decimales=2):
        self.cle = cle            # nom de la cle dans le JSON de sortie
        self.mode = mode
        self.unite = unite        # unite attendue dans l'export (informative)
        self.facteur = facteur    # conversion eventuelle
        self.decimales = decimales


Q = "HKQuantityTypeIdentifier"
C = "HKCategoryTypeIdentifier"

METRIQUES = {
    # --- cumulatifs -------------------------------------------------------
    Q + "StepCount":                   Metrique("pas", "somme", "count", decimales=0),
    Q + "DistanceWalkingRunning":      Metrique("distance_km", "somme", "km", decimales=3),
    Q + "DistanceCycling":             Metrique("velo_km", "somme", "km", decimales=3),
    Q + "DistanceSwimming":            Metrique("nage_km", "somme", "km", decimales=3),
    Q + "FlightsClimbed":              Metrique("etages", "somme", "count", decimales=0),
    Q + "ActiveEnergyBurned":          Metrique("energie_active_kcal", "somme", "kcal", decimales=1),
    Q + "BasalEnergyBurned":           Metrique("energie_repos_kcal", "somme", "kcal", decimales=1),
    Q + "AppleExerciseTime":           Metrique("exercice_min", "somme", "min", decimales=0),
    Q + "AppleMoveTime":               Metrique("mouvement_min", "somme", "min", decimales=0),
    Q + "AppleStandTime":              Metrique("debout_min", "somme", "min", decimales=0),
    Q + "TimeInDaylight":              Metrique("lumiere_min", "somme", "min", decimales=0),
    Q + "RunningGroundContactTime":    Metrique("_ignore_", "moyenne"),

    # --- instantanes ------------------------------------------------------
    Q + "HeartRate":                   Metrique("fc", "moyenne", "count/min", decimales=1),
    Q + "HeartRateVariabilitySDNN":    Metrique("vfc_ms", "moyenne", "ms", decimales=1),
    Q + "OxygenSaturation":            Metrique("spo2", "moyenne", "%", decimales=1),
    Q + "RespiratoryRate":             Metrique("respiration", "moyenne", "count/min", decimales=1),
    Q + "BodyMass":                    Metrique("poids_kg", "moyenne", "kg", decimales=2),
    Q + "AppleSleepingWristTemperature": Metrique("temp_poignet", "moyenne", "degC", decimales=2),
    Q + "EnvironmentalAudioExposure":  Metrique("bruit_db", "moyenne", "dBASPL", decimales=1),

    # --- deja quotidiens --------------------------------------------------
    Q + "RestingHeartRate":            Metrique("fc_repos", "unique", "count/min", decimales=1),
    Q + "WalkingHeartRateAverage":     Metrique("fc_marche", "unique", "count/min", decimales=1),
    Q + "VO2Max":                      Metrique("vo2max", "unique", "mL/min·kg", decimales=1),
    Q + "AppleWalkingSteadiness":      Metrique("stabilite_pct", "unique", "%", decimales=1),
}

SOMMEIL = C + "SleepAnalysis"
HEURE_DEBOUT = C + "AppleStandHour"

# Mesures qu'Apple ecrit en fraction 0-1 bien qu'elles portent unit="%".
CLES_FRACTION = ("spo2", "stabilite_pct")

# Valeurs de l'attribut value pour le sommeil, toutes generations d'iOS
STADES_SOMMEIL = {
    "HKCategoryValueSleepAnalysisInBed":            "au_lit",
    "HKCategoryValueSleepAnalysisAsleep":           "endormi",   # ancien iOS, non detaille
    "HKCategoryValueSleepAnalysisAsleepUnspecified": "endormi",
    "HKCategoryValueSleepAnalysisAsleepCore":       "leger",
    "HKCategoryValueSleepAnalysisAsleepDeep":       "profond",
    "HKCategoryValueSleepAnalysisAsleepREM":        "rem",
    "HKCategoryValueSleepAnalysisAwake":            "eveil",
}
STADES_ENDORMI = ("endormi", "leger", "profond", "rem")

# Une nuit qui commence apres cette heure locale est rattachee au jour suivant,
# ce qui reproduit l'affichage « nuit du ... » de l'app Sante.
HEURE_BASCULE_NUIT = 18

# Au-dela, un intervalle est considere comme aberrant plutot que reparti.
SPAN_MAX_JOURS = 31

# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------

FORMATS_DATE = (
    "%Y-%m-%d %H:%M:%S %z",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M %z",
)


def parser_date(txt):
    """Convertit « 2024-03-15 07:23:45 +0100 » en datetime conscient du fuseau."""
    if not txt:
        return None
    for fmt in FORMATS_DATE:
        try:
            d = dt.datetime.strptime(txt, fmt)
        except ValueError:
            continue
        if d.tzinfo is None:
            d = d.replace(tzinfo=dt.timezone.utc)
        return d
    return None


def jour_local(txt):
    """Date calendaire locale, lue directement dans la chaine.

    Apple ecrit l'heure LOCALE du lieu de la mesure, suivie de son decalage.
    Prendre les dix premiers caracteres donne donc le bon jour sans aucun
    calcul de fuseau, y compris pour des donnees enregistrees en voyage.
    """
    return txt[:10] if txt and len(txt) >= 10 else None


def sans_accent(txt):
    return "".join(c for c in unicodedata.normalize("NFD", txt or "")
                   if unicodedata.category(c) != "Mn").lower()


def arrondir(valeur, decimales):
    if valeur is None:
        return None
    v = round(float(valeur), decimales)
    return int(v) if decimales == 0 else v


def nombre(txt):
    """Convertit en flottant, en rejetant NaN et l'infini.

    Un « NaN » ou un « 1e309 » glisse sans bruit jusqu'au JSON de sortie, ou il
    produit un document que la plupart des analyseurs refusent. On l'arrete ici.
    """
    try:
        v = float(txt)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


# --------------------------------------------------------------------------
# Lecture du fichier d'export
# --------------------------------------------------------------------------

NOMS_XML = ("apple_health_export/export.xml", "export.xml")


def verifier_presence(chemin):
    """Distingue « fichier absent » de « fichier encore dans le nuage ».

    Sur iPhone, un fichier d'iCloud Drive qui n'a pas ete rapatrie n'existe
    localement que sous la forme d'un talon nomme « .export.zip.icloud ».
    L'erreur qui en decoule est incomprehensible si on ne la nomme pas.
    """
    if os.path.exists(chemin):
        return
    dossier = os.path.dirname(os.path.abspath(chemin))
    nom = os.path.basename(chemin)
    talon = os.path.join(dossier, "." + nom + ".icloud")
    if os.path.exists(talon):
        raise SystemExit(
            "%s n'est pas encore telecharge : il n'existe que dans iCloud.\n"
            "Ouvre l'app Fichiers, touche le fichier pour le rapatrier (l'icone\n"
            "de nuage doit disparaitre), attends la fin, puis relance." % nom)
    raise SystemExit("Fichier introuvable : %s" % chemin)


def ouvrir_export(chemin):
    """Renvoie (flux binaire sur export.xml, description).

    Accepte un export.zip (lu en flux, sans decompression sur le disque), un
    export.xml deja extrait, ou le dossier apple_health_export.
    """
    verifier_presence(chemin)
    if os.path.isdir(chemin):
        for nom in ("export.xml", os.path.join("apple_health_export", "export.xml")):
            candidat = os.path.join(chemin, nom)
            if os.path.exists(candidat):
                return open(candidat, "rb"), candidat
        raise SystemExit("Aucun export.xml trouve dans %s" % chemin)

    if zipfile.is_zipfile(chemin):
        z = zipfile.ZipFile(chemin)
        noms = z.namelist()
        for attendu in NOMS_XML:
            if attendu in noms:
                return z.open(attendu, "r"), "%s!%s" % (chemin, attendu)
        for nom in noms:
            if nom.endswith("export.xml") and "cda" not in nom.lower():
                return z.open(nom, "r"), "%s!%s" % (chemin, nom)
        raise SystemExit("export.xml introuvable dans l'archive %s" % chemin)

    return open(chemin, "rb"), chemin


class FiltreDTD(io.RawIOBase):
    """Neutralise la DTD interne en tete d'export.xml.

    Apple place une declaration <!DOCTYPE HealthData [ ... ]> de plusieurs
    milliers de lignes. Elle est valide, mais certains parseurs la refusent et
    elle ne sert a rien ici. On la remplace par un DOCTYPE nu, a la volee, sans
    charger le fichier en memoire.
    """

    def __init__(self, source):
        self._source = source
        self._tampon = b""
        self._entete_traitee = False
        self._fini = False

    def readable(self):
        return True

    PLAFOND_ENTETE = 16 * 1024 * 1024

    def _lire_entete(self):
        debut = self._source.read(256 * 1024)
        i = debut.find(b"<!DOCTYPE")
        if i == -1:
            self._tampon = debut
            return
        # La DTD d'Apple fait quelques dizaines de kilo-octets, mais rien ne le
        # garantit : on continue de lire jusqu'a en trouver la fin plutot que de
        # parier sur une taille de tampon.
        j = debut.find(b"]>", i)
        while j == -1 and len(debut) < self.PLAFOND_ENTETE:
            morceau = self._source.read(256 * 1024)
            if not morceau:
                break
            recherche = max(i, len(debut) - 1)
            debut += morceau
            j = debut.find(b"]>", recherche)
        if j == -1:
            # DOCTYPE sans sous-ensemble interne : <!DOCTYPE HealthData>
            k = debut.find(b">", i)
            self._tampon = debut if k == -1 else debut[:i] + debut[k + 1:]
            return
        self._tampon = debut[:i] + debut[j + 2:]

    def readinto(self, cible):
        if not self._entete_traitee:
            self._lire_entete()
            self._entete_traitee = True
        if not self._tampon and not self._fini:
            morceau = self._source.read(len(cible))
            if not morceau:
                self._fini = True
            self._tampon = morceau
        if not self._tampon:
            return 0
        n = min(len(cible), len(self._tampon))
        cible[:n] = self._tampon[:n]
        self._tampon = self._tampon[n:]
        return n


def elements(flux, balises, sur_progression=None):
    """Parcourt l'XML en flux et rend les elements demandes.

    Le piege classique du streaming XML est que la racine conserve une
    reference vers chacun de ses enfants : vider l'element courant ne suffit
    pas, il faut aussi vider la racine, sinon la memoire enfle jusqu'a la
    taille du fichier. On fait les deux.
    """
    import xml.etree.ElementTree as ET

    tampon = io.BufferedReader(FiltreDTD(flux), buffer_size=1 << 20)
    contexte = ET.iterparse(tampon, events=("start", "end"))
    racine = None
    lus = 0
    dans_correlation = 0
    for evenement, element in contexte:
        if racine is None:
            racine = element
            continue
        if evenement == "start":
            # Apple le dit dans sa propre DTD : « Any Records that appear as
            # children of a correlation also appear as top-level records in
            # this document. » Un repas ou une tension arterielle apparait donc
            # deux fois. Comme iterparse remonte l'enfant AVANT son parent, il
            # faut savoir qu'on est a l'interieur d'une correlation pour ne
            # retenir que la copie de premier niveau.
            if element.tag == "Correlation":
                dans_correlation += 1
            continue
        if element.tag == "Correlation":
            dans_correlation -= 1
        elif element.tag in balises and dans_correlation == 0:
            yield element
            lus += 1
            if sur_progression and lus % 200000 == 0:
                sur_progression(lus)
        else:
            # Enfant d'un element encore ouvert (MetadataEntry,
            # InstantaneousBeatsPerMinute...) : le vider maintenant effacerait
            # des attributs dont le parent a besoin. Il sera libere avec lui.
            continue
        element.clear()
        if racine is not None:
            racine.clear()


# --------------------------------------------------------------------------
# Identification des sources
# --------------------------------------------------------------------------

def est_montre(source_nom, device):
    """Vrai si l'enregistrement vient d'une Apple Watch.

    On ne peut pas se fier au seul sourceName : il vaut le nom que l'utilisateur
    a donne a sa montre, dans sa langue (« Apple Watch de Test », « Montre
    de Ben »...). L'attribut device est bien plus fiable, il contient
    « name:Apple Watch » et « hardware:Watch6,2 ».
    """
    d = device or ""
    if "hardware:Watch" in d or "name:Apple Watch" in d:
        return True
    if re.search(r"model:Watch\b", d):
        return True
    n = sans_accent(source_nom)
    return "watch" in n or "montre" in n


def est_telephone(source_nom, device):
    d = device or ""
    if "hardware:iPhone" in d or "name:iPhone" in d:
        return True
    return "iphone" in sans_accent(source_nom)


def saisie_manuelle(element):
    """Vrai si l'enregistrement a ete saisi a la main dans l'app Sante."""
    for meta in element.findall("MetadataEntry"):
        if meta.get("key") == "HKWasUserEntered" and meta.get("value") in ("1", "YES", "true"):
            return True
    return False


def rang_source(source_nom, device, priorite):
    """Plus le rang est petit, plus la source est prioritaire au dedoublonnage.

    L'app Sante classe d'abord les donnees saisies a la main, puis les
    appareils Apple, puis les apps tierces. On reprend cet ordre, en tranchant
    entre montre et telephone que l'app place, elle, au meme niveau.
    """
    if priorite == "montre":
        if est_montre(source_nom, device):
            return 0
        return 2 if est_telephone(source_nom, device) else 1
    if priorite == "telephone":
        if est_telephone(source_nom, device):
            return 0
        return 2 if est_montre(source_nom, device) else 1
    return 1


# --------------------------------------------------------------------------
# Accumulateurs
# --------------------------------------------------------------------------

def _bloc():
    return array.array("d")


class AccMoyenne:
    __slots__ = ("n", "somme", "mini", "maxi")

    def __init__(self):
        self.n = 0
        self.somme = 0.0
        self.mini = None
        self.maxi = None

    def ajouter(self, v):
        self.n += 1
        self.somme += v
        if self.mini is None or v < self.mini:
            self.mini = v
        if self.maxi is None or v > self.maxi:
            self.maxi = v

    @property
    def moyenne(self):
        return self.somme / self.n if self.n else None


def decouper_par_jour(debut, fin, valeur):
    """Repartit un intervalle sur les jours locaux qu'il traverse.

    Un enregistrement d'energie active de 23h50 a 00h10 appartient pour moitie
    a chaque jour : on le decoupe au prorata de la duree plutot que de tout
    attribuer au jour de debut.
    """
    if fin is None or fin <= debut:
        yield (debut.strftime("%Y-%m-%d"), debut, debut, valeur)
        return
    # Une date corrompue peut produire un intervalle de plusieurs siecles : le
    # decoupage jour par jour tournerait alors des millions de fois. Au-dela
    # d'un mois, l'enregistrement n'est de toute facon plus credible, on le
    # rattache en bloc a son jour de debut.
    if (fin - debut).days > SPAN_MAX_JOURS:
        yield (debut.strftime("%Y-%m-%d"), debut, debut, valeur)
        return
    total = (fin - debut).total_seconds()
    curseur = debut
    while curseur < fin:
        try:
            minuit = (curseur.replace(hour=0, minute=0, second=0, microsecond=0)
                      + dt.timedelta(days=1))
        except (OverflowError, ValueError):
            yield (curseur.strftime("%Y-%m-%d"), curseur, fin, valeur)
            return
        borne = fin if fin < minuit else minuit
        part = (borne - curseur).total_seconds() / total
        yield (curseur.strftime("%Y-%m-%d"), curseur, borne, valeur * part)
        curseur = borne


def fusionner(intervalles):
    """Union d'intervalles (debut, fin) qui peuvent se chevaucher."""
    if not intervalles:
        return []
    ordonnes = sorted(intervalles)
    sortie = [list(ordonnes[0])]
    for debut, fin in ordonnes[1:]:
        if debut <= sortie[-1][1]:
            if fin > sortie[-1][1]:
                sortie[-1][1] = fin
        else:
            sortie.append([debut, fin])
    return [(a, b) for a, b in sortie]


def duree_union(intervalles):
    return sum(b - a for a, b in fusionner(intervalles))


def parties_libres(debut, fin, couvert):
    """Portions de [debut, fin] qui ne sont pas deja couvertes."""
    libres = []
    curseur = debut
    for a, b in couvert:
        if b <= curseur:
            continue
        if a >= fin:
            break
        if a > curseur:
            libres.append((curseur, min(a, fin)))
        curseur = max(curseur, b)
        if curseur >= fin:
            break
    if curseur < fin:
        libres.append((curseur, fin))
    return libres


def resoudre_somme(entrees):
    """Total d'une metrique cumulative pour un jour, sans double comptage.

    entrees : array('d') de quadruplets a plat
    (rang_source, debut_ts, fin_ts, valeur), ou une liste de tels quadruplets.

    Les sources sont traitees par priorite decroissante. Chaque enregistrement
    ne compte que sur la portion de temps qu'aucune source plus prioritaire n'a
    deja couverte, au prorata de sa duree. C'est ce qui evite le total gonfle
    quand l'iPhone dans la poche et la montre au poignet comptent les memes pas.
    """
    if isinstance(entrees, array.array):
        # La conversion en tuples ne concerne qu'un seul jour a la fois : le pic
        # de memoire reste celui du stockage compact.
        entrees = [tuple(entrees[i:i + 4]) for i in range(0, len(entrees), 4)]
    total = 0.0
    couvert = []
    ponctuels = set()
    for rang, debut, fin, valeur in sorted(entrees, key=lambda e: (e[0], e[1], e[2])):
        if fin <= debut:
            cle = (debut, round(valeur, 6))
            if cle in ponctuels:
                continue
            if any(a <= debut < b for a, b in couvert):
                continue
            ponctuels.add(cle)
            total += valeur
            continue
        libres = parties_libres(debut, fin, couvert)
        if not libres:
            continue
        duree = fin - debut
        gagne = sum(b - a for a, b in libres)
        total += valeur * (gagne / duree)
        couvert = fusionner(couvert + libres)
    return total


# --------------------------------------------------------------------------
# Agregation
# --------------------------------------------------------------------------

class Agregateur:

    SEUIL_ALERTE = 3000000

    def __init__(self, priorite="montre", filtre_source=None,
                 depuis=None, jusqu_a=None, dedup=True):
        self.priorite = priorite
        self.filtre_source = filtre_source     # None | "montre" | "telephone" | texte libre
        self.depuis = depuis
        self.jusqu_a = jusqu_a
        self.dedup = dedup

        # Un tuple Python de quatre flottants coute environ 130 octets une fois
        # range dans une liste ; le meme quadruplet dans un array('d') en coute
        # 32. Sur un export de plusieurs annees, l'ecart se compte en centaines
        # de mega-octets — et sur iPhone, c'est la difference entre traiter le
        # fichier et se faire tuer par le systeme.
        self.sommes = defaultdict(_bloc)      # (jour, cle) -> quadruplets a plat
        self.sommes_directes = defaultdict(float)
        self.moyennes = defaultdict(AccMoyenne)
        self.uniques = defaultdict(AccMoyenne)
        self.sommeil = defaultdict(list)       # nuit -> (stade, debut_ts, fin_ts)
        self.anneaux = {}
        self.seances = defaultdict(list)
        self.heures_debout = defaultdict(int)

        self.export_date = None
        self.sources_vues = defaultdict(int)
        self.types_vus = defaultdict(int)
        self.types_ignores = defaultdict(int)
        self.unites_vues = defaultdict(set)
        self.lus = 0
        self.retenus = 0
        self.erreur_lecture = None
        self.entrees_bufferisees = 0
        self.alerte_memoire_dite = False
        self.anomalies = defaultdict(int)

    # -- filtres ----------------------------------------------------------

    def _dans_periode(self, jour):
        if self.depuis and jour < self.depuis:
            return False
        if self.jusqu_a and jour > self.jusqu_a:
            return False
        return True

    def _source_acceptee(self, nom, device):
        f = self.filtre_source
        if not f:
            return True
        if f == "montre":
            return est_montre(nom, device)
        if f == "telephone":
            return est_telephone(nom, device)
        return sans_accent(f) in sans_accent(nom)

    # -- ingestion --------------------------------------------------------

    def ingerer_record(self, el):
        a = el.attrib
        type_ = a.get("type", "")
        self.lus += 1
        self.types_vus[type_] += 1
        nom = a.get("sourceName", "")
        device = a.get("device", "")
        self.sources_vues[nom] += 1

        debut_txt = a.get("startDate")
        jour = jour_local(debut_txt)
        if not jour or not self._dans_periode(jour):
            return
        if not self._source_acceptee(nom, device):
            return

        if type_ == SOMMEIL:
            self._ingerer_sommeil(a)
            self.retenus += 1
            return

        if type_ == HEURE_DEBOUT:
            # Un enregistrement par heure de la journee, « Stood » ou « Idle ».
            if a.get("value", "").endswith("Stood"):
                self.heures_debout[jour] += 1
            self.retenus += 1
            return

        metrique = METRIQUES.get(type_)
        if metrique is None or metrique.cle == "_ignore_":
            self.types_ignores[type_] += 1
            return

        valeur = nombre(a.get("value"))
        if valeur is None:
            self.anomalies["valeur_non_numerique"] += 1
            return
        unite = a.get("unit")
        if unite:
            self.unites_vues[type_].add(unite)
        valeur = self._convertir(metrique, unite, valeur)
        if valeur is None:
            return

        self.retenus += 1

        if metrique.mode == "somme":
            debut = parser_date(debut_txt)
            fin = parser_date(a.get("endDate")) or debut
            if debut is None:
                self.anomalies["date_illisible"] += 1
                return
            if fin is not None and fin.utcoffset() != debut.utcoffset():
                fin = fin.astimezone(debut.tzinfo)
            rang = rang_source(nom, device, self.priorite)
            if saisie_manuelle(el):
                rang = -1
            try:
                morceaux = list(decouper_par_jour(debut, fin, valeur))
            except (OverflowError, ValueError, OSError):
                self.anomalies["intervalle_aberrant"] += 1
                return
            for j, d, f, v in morceaux:
                if not self._dans_periode(j):
                    continue
                if self.dedup:
                    try:
                        bornes = (d.timestamp(), f.timestamp())
                    except (OverflowError, ValueError, OSError):
                        self.anomalies["date_hors_limites"] += 1
                        continue
                    self.sommes[(j, metrique.cle)].extend(
                        (float(rang), bornes[0], bornes[1], v))
                    self.entrees_bufferisees += 1
                    if (self.entrees_bufferisees == self.SEUIL_ALERTE
                            and not self.alerte_memoire_dite):
                        self.alerte_memoire_dite = True
                        sys.stderr.write(
                            "\n  Beaucoup de donnees a dedoublonner. Si le traitement\n"
                            "  s'interrompt faute de memoire, relance annee par annee\n"
                            "  (--depuis / --jusqu-a) ou ajoute --leger.\n")
                else:
                    self.sommes_directes[(j, metrique.cle)] += v
        elif metrique.mode == "moyenne":
            self.moyennes[(jour, metrique.cle)].ajouter(valeur)
        else:
            self.uniques[(jour, metrique.cle)].ajouter(valeur)

    def _convertir(self, metrique, unite, valeur):
        """Normalise les unites qui varient selon les reglages regionaux."""
        if not unite:
            return valeur
        u = unite.strip()
        if metrique.cle.endswith("_km"):
            if u == "mi":
                return valeur * 1.609344
            if u == "m":
                return valeur / 1000.0
            if u == "ft":
                return valeur * 0.0003048
            return valeur
        if metrique.cle.startswith("temp_") and u in ("degF", "F"):
            return (valeur - 32.0) * 5.0 / 9.0
        if metrique.cle == "poids_kg":
            if u == "lb":
                return valeur * 0.45359237
            if u == "st":
                return valeur * 6.35029318
            return valeur
        if metrique.cle.endswith("_kcal") and u in ("Cal", "kJ"):
            return valeur / 4.184 if u == "kJ" else valeur
        # Apple ecrit ces mesures en FRACTION (0,97) avec pourtant unit="%",
        # alors que certaines apps tierces ecrivent 97. On ramene tout a une
        # echelle 0-100 : au-dela de 1,5 la valeur est deja un pourcentage.
        if metrique.cle in CLES_FRACTION and 0.0 < valeur <= 1.5:
            return valeur * 100.0
        return valeur

    def _ingerer_sommeil(self, a):
        stade = STADES_SOMMEIL.get(a.get("value", ""))
        if stade is None:
            # Tres anciens exports : la valeur peut etre un entier (0/1/2).
            brut = a.get("value", "")
            stade = {"0": "au_lit", "1": "endormi", "2": "eveil"}.get(brut)
            if stade is None:
                self.anomalies["stade_sommeil_inconnu"] += 1
                return
        debut = parser_date(a.get("startDate"))
        fin = parser_date(a.get("endDate"))
        if debut is None or fin is None or fin < debut:
            self.anomalies["sommeil_dates_invalides"] += 1
            return
        try:
            nuit = debut.date()
            if debut.hour >= HEURE_BASCULE_NUIT:
                nuit = nuit + dt.timedelta(days=1)
            bornes = (debut.timestamp(), fin.timestamp())
        except (OverflowError, ValueError, OSError):
            self.anomalies["date_hors_limites"] += 1
            return
        if (fin - debut).days > 2:
            self.anomalies["nuit_invraisemblable"] += 1
            return
        decalage = int((debut.utcoffset() or dt.timedelta()).total_seconds())
        self.sommeil[nuit.strftime("%Y-%m-%d")].append(
            (stade, bornes[0], bornes[1], decalage))

    def ingerer_anneaux(self, el):
        a = el.attrib
        jour = a.get("dateComponents")
        if not jour or not self._dans_periode(jour):
            return
        # L'unite d'energie des anneaux est portee par son propre attribut et
        # suit la region : kcal, Cal (= kcal) ou kJ.
        unite = a.get("activeEnergyBurnedUnit") or "kcal"
        facteur = 1.0 / 4.184 if unite == "kJ" else 1.0

        def energie(txt):
            v = nombre(txt)
            return None if v is None else v * facteur

        self.anneaux[jour] = {
            "energie_active_kcal": arrondir(energie(a.get("activeEnergyBurned")), 1),
            "objectif_energie_kcal": arrondir(energie(a.get("activeEnergyBurnedGoal")), 1),
            "exercice_min": arrondir(nombre(a.get("appleExerciseTime")), 0),
            "objectif_exercice_min": arrondir(nombre(a.get("appleExerciseTimeGoal")), 0),
            "mouvement_min": arrondir(nombre(a.get("appleMoveTime")), 0),
            "debout_h": arrondir(nombre(a.get("appleStandHours")), 0),
            "objectif_debout_h": arrondir(nombre(a.get("appleStandHoursGoal")), 0),
        }

    def ingerer_seance(self, el):
        a = el.attrib
        jour = jour_local(a.get("startDate"))
        if not jour or not self._dans_periode(jour):
            return
        duree = nombre(a.get("duration")) or 0.0
        if (a.get("durationUnit") or "min") == "sec":
            duree /= 60.0
        type_ = (a.get("workoutActivityType") or "").replace("HKWorkoutActivityType", "")
        self.seances[jour].append({"type": type_, "duree_min": arrondir(duree, 1)})

    # -- restitution ------------------------------------------------------

    def _resumer_nuit(self, segments):
        par_stade = defaultdict(list)
        decalages = {}
        for stade, debut, fin, decalage in segments:
            if fin > debut:
                par_stade[stade].append((debut, fin))
                decalages.setdefault(debut, decalage)

        endormi = []
        for stade in STADES_ENDORMI:
            endormi.extend(par_stade.get(stade, []))
        endormi = fusionner(endormi)
        if not endormi and not par_stade.get("au_lit"):
            return None

        total_min = sum(b - a for a, b in endormi) / 60.0
        resume = {"total_min": arrondir(total_min, 0)}
        for stade, cle in (("leger", "leger_min"), ("profond", "profond_min"),
                           ("rem", "rem_min"), ("eveil", "eveil_min"),
                           ("au_lit", "au_lit_min")):
            if par_stade.get(stade):
                resume[cle] = arrondir(duree_union(par_stade[stade]) / 60.0, 0)

        reference = endormi or fusionner(par_stade.get("au_lit", []))
        if reference:
            debut = reference[0][0]
            fin = reference[-1][1]
            # On reaffiche dans le fuseau ou la nuit a ete vecue, pas dans
            # celui de la machine qui fait le calcul.
            fuseau = dt.timezone(dt.timedelta(
                seconds=decalages.get(debut, next(iter(decalages.values()), 0))))
            resume["debut"] = dt.datetime.fromtimestamp(debut, fuseau).strftime("%H:%M")
            resume["fin"] = dt.datetime.fromtimestamp(fin, fuseau).strftime("%H:%M")
            fenetre = fin - debut
            if fenetre > 0:
                resume["efficacite_pct"] = arrondir(100.0 * (total_min * 60.0) / fenetre, 1)
            # Un reveil = une interruption entre deux blocs de sommeil.
            resume["reveils"] = max(0, len(endormi) - 1)
        return resume

    def finaliser(self):
        par_cle = {}
        for metrique in METRIQUES.values():
            par_cle[metrique.cle] = metrique

        jours = defaultdict(dict)

        source_sommes = self.sommes if self.dedup else None
        if source_sommes is not None:
            for (jour, cle), entrees in self.sommes.items():
                metrique = par_cle.get(cle)
                jours[jour][cle] = arrondir(resoudre_somme(entrees),
                                            metrique.decimales if metrique else 2)
        else:
            for (jour, cle), total in self.sommes_directes.items():
                metrique = par_cle.get(cle)
                jours[jour][cle] = arrondir(total, metrique.decimales if metrique else 2)

        for (jour, cle), acc in self.moyennes.items():
            metrique = par_cle.get(cle)
            d = metrique.decimales if metrique else 2
            jours[jour][cle + "_moy"] = arrondir(acc.moyenne, d)
            jours[jour][cle + "_min"] = arrondir(acc.mini, d)
            jours[jour][cle + "_max"] = arrondir(acc.maxi, d)
            jours[jour][cle + "_n"] = acc.n

        for (jour, cle), acc in self.uniques.items():
            metrique = par_cle.get(cle)
            jours[jour][cle] = arrondir(acc.moyenne, metrique.decimales if metrique else 2)

        for nuit, segments in self.sommeil.items():
            resume = self._resumer_nuit(segments)
            if resume:
                jours[nuit]["sommeil"] = resume

        for jour, n in self.heures_debout.items():
            jours[jour]["debout_h"] = n

        for jour, anneau in self.anneaux.items():
            jours[jour]["anneaux"] = {k: v for k, v in anneau.items() if v is not None}

        for jour, seances in self.seances.items():
            jours[jour]["seances"] = seances

        sortie = []
        for jour in sorted(jours):
            instantane = {"date": jour}
            for cle in sorted(jours[jour]):
                valeur = jours[jour][cle]
                if valeur is not None:
                    instantane[cle] = valeur
            sortie.append(instantane)
        return sortie

    def meta(self, description, jours):
        principales = sorted(self.sources_vues.items(), key=lambda kv: -kv[1])[:12]
        return {
            "outil": "sante.py",
            "version": VERSION,
            "fichier": os.path.basename(description.split("!")[0]),
            "export_date": self.export_date,
            "priorite_source": self.priorite,
            "filtre_source": self.filtre_source or "toutes",
            "dedoublonnage": "intervalles" if self.dedup else "aucun",
            "enregistrements_lus": self.lus,
            "enregistrements_retenus": self.retenus,
            "premier_jour": jours[0]["date"] if jours else None,
            "dernier_jour": jours[-1]["date"] if jours else None,
            "nb_jours": len(jours),
            "sources": dict(principales),
            "anomalies": dict(self.anomalies),
            "erreur_lecture": self.erreur_lecture,
        }


def analyser(chemin, agregateur, avec_seances=True, silencieux=False):
    flux, description = ouvrir_export(chemin)
    balises = {"Record", "ActivitySummary", "ExportDate"}
    if avec_seances:
        balises.add("Workout")

    def progression(n):
        if not silencieux:
            sys.stderr.write("\r  %s enregistrements lus..." % f"{n:,}".replace(",", " "))
            sys.stderr.flush()

    import xml.etree.ElementTree as ET

    try:
        for el in elements(flux, balises, progression):
            if el.tag == "Record":
                agregateur.ingerer_record(el)
            elif el.tag == "ActivitySummary":
                agregateur.ingerer_anneaux(el)
            elif el.tag == "Workout":
                agregateur.ingerer_seance(el)
            elif el.tag == "ExportDate":
                agregateur.export_date = el.attrib.get("value")
    except ET.ParseError as e:
        # Export tronque ou corrompu, typiquement un transfert interrompu.
        # Mieux vaut rendre les jours deja lus que rien du tout.
        agregateur.anomalies["fichier_tronque"] = 1
        agregateur.erreur_lecture = str(e)
        if not silencieux:
            sys.stderr.write(
                "\n  Attention : le fichier s'interrompt avant la fin (%s).\n"
                "  Les %s enregistrements deja lus sont conserves ; relance\n"
                "  l'export depuis l'iPhone pour recuperer la suite.\n"
                % (e, f"{agregateur.lus:,}".replace(",", " ")))
    finally:
        flux.close()
    if not silencieux:
        sys.stderr.write("\r" + " " * 48 + "\r")
    return description


# --------------------------------------------------------------------------
# Commande : inspecte
# --------------------------------------------------------------------------

def cmd_inspecte(args):
    """Dresse l'etat des lieux du fichier sans rien agreger."""
    flux, description = ouvrir_export(args.export)
    types = defaultdict(int)
    sources = defaultdict(int)
    unites = defaultdict(set)
    appareils = defaultdict(int)
    premier = None
    dernier = None
    export_date = None
    total = 0

    try:
        for el in elements(flux, {"Record", "ExportDate", "ActivitySummary", "Workout"},
                           lambda n: sys.stderr.write("\r  %d enregistrements..." % n)):
            if el.tag == "ExportDate":
                export_date = el.attrib.get("value")
                continue
            if el.tag != "Record":
                types["<%s>" % el.tag] += 1
                continue
            a = el.attrib
            total += 1
            types[a.get("type", "?")] += 1
            sources[a.get("sourceName", "?")] += 1
            if a.get("unit"):
                unites[a.get("type", "?")].add(a["unit"])
            d = a.get("device") or ""
            if d:
                m = re.search(r"hardware:([^,>]+)", d)
                appareils[m.group(1).strip() if m else "inconnu"] += 1
            j = jour_local(a.get("startDate"))
            if j:
                if premier is None or j < premier:
                    premier = j
                if dernier is None or j > dernier:
                    dernier = j
    finally:
        flux.close()
    sys.stderr.write("\r" + " " * 48 + "\r")

    print("Fichier          : %s" % description)
    print("Date d'export    : %s" % (export_date or "inconnue"))
    print("Periode couverte : %s -> %s" % (premier or "?", dernier or "?"))
    print("Enregistrements  : %s" % f"{total:,}".replace(",", " "))
    print()
    print("Sources (nom tel qu'ecrit par Apple) :")
    for nom, n in sorted(sources.items(), key=lambda kv: -kv[1]):
        print("  %8s  %s" % (f"{n:,}".replace(",", " "), nom))
    if appareils:
        print()
        print("Materiels identifies :")
        for nom, n in sorted(appareils.items(), key=lambda kv: -kv[1]):
            print("  %8s  %s" % (f"{n:,}".replace(",", " "), nom))
    print()
    print("Types de mesures (: reconnu par l'outil, . ignore) :")
    for type_, n in sorted(types.items(), key=lambda kv: -kv[1]):
        connu = ":" if (type_ in METRIQUES or type_ == SOMMEIL
                        or type_.startswith("<")) else "."
        court = type_.replace(Q, "").replace(C, "")
        u = ",".join(sorted(unites.get(type_, ()))) or ""
        print("  %s %8s  %-38s %s" % (connu, f"{n:,}".replace(",", " "), court, u))
    return 0


# --------------------------------------------------------------------------
# Commande : agrege
# --------------------------------------------------------------------------

def cmd_agrege(args):
    if args.leger:
        args.source = args.source or "montre"
        args.sans_dedup = True
    agregateur = Agregateur(
        priorite=args.priorite,
        filtre_source=args.source,
        depuis=args.depuis,
        jusqu_a=args.jusqu_a,
        dedup=not args.sans_dedup,
    )
    description = analyser(args.export, agregateur, silencieux=args.silencieux)
    jours = agregateur.finaliser()
    document = {"meta": agregateur.meta(description, jours), "jours": jours}

    with open(args.sortie, "w", encoding="utf-8") as f:
        json.dump(document, f, ensure_ascii=False, indent=1 if args.lisible else None)
        f.write("\n")

    if args.csv:
        colonnes = ["date"]
        for jour in jours:
            for cle in jour:
                if cle not in colonnes and not isinstance(jour[cle], (dict, list)):
                    colonnes.append(cle)
        colonnes += ["sommeil_total_min", "sommeil_profond_min", "sommeil_rem_min"]
        with open(args.csv, "w", encoding="utf-8", newline="") as f:
            ecrivain = csv.DictWriter(f, fieldnames=colonnes, extrasaction="ignore")
            ecrivain.writeheader()
            for jour in jours:
                ligne = {k: v for k, v in jour.items() if not isinstance(v, (dict, list))}
                s = jour.get("sommeil") or {}
                ligne["sommeil_total_min"] = s.get("total_min")
                ligne["sommeil_profond_min"] = s.get("profond_min")
                ligne["sommeil_rem_min"] = s.get("rem_min")
                ecrivain.writerow(ligne)

    m = document["meta"]
    taille = os.path.getsize(args.sortie)
    print("%s jours agreges, du %s au %s" % (m["nb_jours"], m["premier_jour"], m["dernier_jour"]))
    print("%s enregistrements lus, %s retenus" % (
        f"{m['enregistrements_lus']:,}".replace(",", " "),
        f"{m['enregistrements_retenus']:,}".replace(",", " ")))
    print("Ecrit dans %s (%.1f Ko)" % (args.sortie, taille / 1024.0))
    if args.csv:
        print("Version tableur : %s" % args.csv)
    if m["anomalies"]:
        print("Anomalies rencontrees : %s" % m["anomalies"])
    return 0


# --------------------------------------------------------------------------
# Commande : pousse
# --------------------------------------------------------------------------

def _charger_jours(chemin):
    with open(chemin, "r", encoding="utf-8") as f:
        document = json.load(f)
    if isinstance(document, list):
        return document, {}
    return document.get("jours", []), document.get("meta", {})


def _envoyer(url, corps, entetes, essai, timeout=30):
    import urllib.error
    import urllib.request

    donnees = json.dumps(corps, ensure_ascii=False).encode("utf-8")
    if essai:
        return 200, "(essai) %d octets non envoyes" % len(donnees)
    requete = urllib.request.Request(url, data=donnees, method="POST")
    requete.add_header("Content-Type", "application/json")
    for cle, valeur in entetes.items():
        requete.add_header(cle, valeur)
    try:
        with urllib.request.urlopen(requete, timeout=timeout) as reponse:
            return reponse.status, (reponse.read(400) or b"").decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, (e.read(400) or b"").decode("utf-8", "replace")
    except Exception as e:                      # reseau coupe, DNS, TLS...
        return 0, str(e)


PROFIL_EXEMPLE = {
    "_lisez_moi": "Adapte les instantanes a ce qu'attend l'API. Toutes les cles "
                  "sont facultatives.",
    "champ_date": "date",
    "enveloppe": None,
    "garder": ["date", "pas", "fc_repos", "sommeil"],
    "renommer": {"pas": "steps", "fc_repos": "restingHeartRate",
                 "sommeil": "sleep", "energie_active_kcal": "activeEnergy"},
    "aplatir": {"sommeil": "sommeil_"},
    "constantes": {"source": "apple-health-export"},
}


def appliquer_profil(jour, profil):
    """Remet un instantane a la forme attendue par l'API.

    Sans profil, l'instantane part tel quel. Avec, on peut ne garder que
    certaines cles, les renommer, aplatir les sous-objets et ajouter des
    champs fixes — sans toucher au script.
    """
    if not profil:
        return jour
    sortie = dict(jour)

    for cle, prefixe in (profil.get("aplatir") or {}).items():
        sous = sortie.pop(cle, None)
        if isinstance(sous, dict):
            for k, v in sous.items():
                sortie[prefixe + k] = v

    garder = profil.get("garder")
    if garder:
        # Correspondance exacte pour « garder », et prefixes uniquement pour les
        # cles nees d'un aplatissement : sans quoi « garder: [sommeil] » laisserait
        # aussi passer tout ce qui commence par « sommeil ».
        prefixes = tuple(p for p in (profil.get("aplatir") or {}).values()
                         if isinstance(p, str))
        garder = set(garder)
        sortie = {k: v for k, v in sortie.items()
                  if k in garder or (prefixes and k.startswith(prefixes))}

    for ancien, neuf in (profil.get("renommer") or {}).items():
        if ancien in sortie:
            sortie[neuf] = sortie.pop(ancien)

    sortie.update(profil.get("constantes") or {})
    return sortie


def cmd_profil_exemple(args):
    print(json.dumps(PROFIL_EXEMPLE, ensure_ascii=False, indent=2))
    return 0


def cmd_pousse(args):
    import time

    profil = None
    if args.profil:
        with open(args.profil, "r", encoding="utf-8") as f:
            profil = json.load(f)
        if profil.get("champ_date") and args.champ_date == "date":
            args.champ_date = profil["champ_date"]
        if profil.get("enveloppe") and not args.enveloppe:
            args.enveloppe = profil["enveloppe"]

    jours, _ = _charger_jours(args.jours)
    if args.depuis:
        jours = [j for j in jours if j["date"] >= args.depuis]
    if args.jusqu_a:
        jours = [j for j in jours if j["date"] <= args.jusqu_a]

    deja = set()
    if args.etat and os.path.exists(args.etat):
        with open(args.etat, "r", encoding="utf-8") as f:
            deja = set(json.load(f).get("envoyes", []))
        jours = [j for j in jours if j["date"] not in deja]

    if not jours:
        print("Rien a envoyer.")
        return 0

    entetes = {}
    for brut in args.entete or []:
        if ":" not in brut:
            raise SystemExit("En-tete mal formee : %r (attendu « Nom: valeur »)" % brut)
        cle, valeur = brut.split(":", 1)
        entetes[cle.strip()] = valeur.strip()
    if args.jeton_env:
        jeton = os.environ.get(args.jeton_env)
        if not jeton:
            raise SystemExit(
                "La variable d'environnement %s est vide. "
                "Definis-la avant d'envoyer (le jeton ne doit jamais etre ecrit "
                "dans un fichier versionne)." % args.jeton_env)
        entetes["Authorization"] = args.prefixe_jeton + jeton

    def preparer(charge):
        if isinstance(charge, dict):
            charge = appliquer_profil(charge, profil)
        elif isinstance(charge, list):
            charge = [appliquer_profil(j, profil) for j in charge]
        if args.champ_date != "date" and isinstance(charge, dict) and "date" in charge:
            charge = dict(charge)
            charge[args.champ_date] = charge.pop("date")
        if args.enveloppe:
            return {args.enveloppe: charge}
        return charge

    lots = []
    if args.forme == "jour":
        lots = [preparer(j) for j in jours]
    else:
        taille = max(1, args.taille_lot)
        for i in range(0, len(jours), taille):
            tranche = jours[i:i + taille]
            lots.append(preparer([dict(j) for j in tranche]))

    print("%d jours -> %d requete(s) vers %s%s"
          % (len(jours), len(lots), args.url, "  [ESSAI]" if args.essai else ""))
    if args.essai:
        print("\nCorps de la premiere requete :")
        print(json.dumps(lots[0], ensure_ascii=False, indent=1)[:2000])
        if entetes:
            print("\nEn-tetes : %s" % {k: ("***" if k.lower() == "authorization" else v)
                                       for k, v in entetes.items()})
        return 0

    envoyes = list(deja)
    echecs = 0
    for i, corps in enumerate(lots, 1):
        attente = 2.0
        for tentative in range(1, 5):
            code, texte = _envoyer(args.url, corps, entetes, args.essai)
            if 200 <= code < 300:
                break
            if code in (400, 401, 403, 404, 422):
                print("  requete %d : erreur definitive %s — %s" % (i, code, texte[:200]))
                break
            if tentative < 4:
                time.sleep(attente)
                attente *= 2
        if 200 <= code < 300:
            if args.forme == "jour":
                envoyes.append(jours[i - 1]["date"])
            else:
                taille = max(1, args.taille_lot)
                envoyes.extend(j["date"] for j in jours[(i - 1) * taille:i * taille])
        else:
            echecs += 1
            if echecs >= 3:
                print("Trois echecs consecutifs, arret.")
                break
        if i % 20 == 0 or i == len(lots):
            print("  %d/%d" % (i, len(lots)))

    if args.etat:
        with open(args.etat, "w", encoding="utf-8") as f:
            json.dump({"envoyes": sorted(set(envoyes))}, f)
        print("Etat enregistre dans %s (reprise possible)" % args.etat)
    print("Termine : %d requete(s) en echec." % echecs)
    return 1 if echecs else 0


# --------------------------------------------------------------------------
# Commande : autotest
# --------------------------------------------------------------------------

ENTETE_SYNTHETIQUE = '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate, Me, (Record|Workout|ActivitySummary)*)>
<!ATTLIST HealthData locale CDATA #REQUIRED>
<!ELEMENT ExportDate EMPTY>
<!ATTLIST ExportDate value CDATA #REQUIRED>
<!ELEMENT Me EMPTY>
<!ELEMENT Record (MetadataEntry|HeartRateVariabilityMetadataList)*>
<!ELEMENT MetadataEntry EMPTY>
<!ELEMENT Workout (MetadataEntry|WorkoutEvent|WorkoutStatistics)*>
<!ELEMENT ActivitySummary EMPTY>
]>
<HealthData locale="fr_FR">
 <ExportDate value="2026-08-29 09:00:00 +0200"/>
 <Me HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"/>
'''

MONTRE = ('&lt;&lt;HKDevice: 0x2823cc1e0&gt;, name:Apple Watch, manufacturer:Apple Inc., '
          'model:Watch, hardware:Watch6,2, software:10.1&gt;')
TELEPHONE = ('&lt;&lt;HKDevice: 0x2823cc900&gt;, name:iPhone, manufacturer:Apple Inc., '
             'model:iPhone, hardware:iPhone14,2, software:17.1&gt;')


def _rec(type_, valeur, debut, fin=None, source="Apple Watch de Test",
         device=MONTRE, unit="count"):
    return (' <Record type="%s" sourceName="%s" sourceVersion="10.1" device="%s" '
            'unit="%s" creationDate="%s" startDate="%s" endDate="%s" value="%s"/>\n'
            % (type_, source, device, unit, debut, debut, fin or debut, valeur))


def _cat(valeur, debut, fin, source="Apple Watch de Test", device=MONTRE):
    return (' <Record type="%s" sourceName="%s" device="%s" creationDate="%s" '
            'startDate="%s" endDate="%s" value="%s"/>\n'
            % (SOMMEIL, source, device, debut, debut, fin, valeur))


def _construire(corps):
    return ENTETE_SYNTHETIQUE + corps + "</HealthData>\n"


def _agreger_texte(xml, **kwargs):
    import tempfile
    chemin = os.path.join(tempfile.mkdtemp(), "export.xml")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(xml)
    agregateur = Agregateur(**kwargs)
    analyser(chemin, agregateur, silencieux=True)
    return {j["date"]: j for j in agregateur.finaliser()}, agregateur


def _chrono():
    import time
    return time.monotonic()


def cmd_autotest(args):
    echecs = []
    faits = []

    def verifier(nom, condition, detail=""):
        (faits if condition else echecs).append(nom)
        print("  %s %s%s" % ("ok  " if condition else "ECHEC", nom,
                             "" if condition else "  -> " + str(detail)))

    print("Autotest sante.py v%s" % VERSION)
    print()
    print("Dedoublonnage entre montre et telephone")

    # Recouvrement total : le telephone ne doit rien ajouter.
    xml = _construire(
        _rec(Q + "StepCount", 1000, "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100")
        + _rec(Q + "StepCount", 900, "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100",
               source="iPhone de Test", device=TELEPHONE))
    jours, _ = _agreger_texte(xml)
    verifier("recouvrement total : 1000 pas et non 1900",
             jours["2024-03-15"]["pas"] == 1000, jours["2024-03-15"].get("pas"))

    # Recouvrement partiel : moitie de la contribution du telephone.
    xml = _construire(
        _rec(Q + "StepCount", 600, "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100")
        + _rec(Q + "StepCount", 600, "2024-03-15 08:30:00 +0100", "2024-03-15 09:30:00 +0100",
               source="iPhone de Test", device=TELEPHONE))
    jours, _ = _agreger_texte(xml)
    verifier("recouvrement partiel : 900 pas", jours["2024-03-15"]["pas"] == 900,
             jours["2024-03-15"].get("pas"))

    # Doublon strictement identique.
    ligne = _rec(Q + "StepCount", 500, "2024-03-15 10:00:00 +0100", "2024-03-15 10:30:00 +0100")
    jours, _ = _agreger_texte(_construire(ligne + ligne))
    verifier("doublon identique compte une seule fois",
             jours["2024-03-15"]["pas"] == 500, jours["2024-03-15"].get("pas"))

    print()
    print("Frontieres de jour et fuseaux")

    xml = _construire(_rec(Q + "ActiveEnergyBurned", 100, "2024-03-15 23:00:00 +0100",
                           "2024-03-16 01:00:00 +0100", unit="kcal"))
    jours, _ = _agreger_texte(xml)
    verifier("intervalle a cheval sur minuit reparti au prorata",
             jours["2024-03-15"]["energie_active_kcal"] == 50.0
             and jours["2024-03-16"]["energie_active_kcal"] == 50.0,
             {k: v.get("energie_active_kcal") for k, v in jours.items()})

    xml = _construire(_rec(Q + "StepCount", 700, "2024-03-15 08:00:00 +0900",
                           "2024-03-15 09:00:00 +0900"))
    jours, _ = _agreger_texte(xml)
    verifier("heure locale du voyage : jour du 15 et non decale",
             "2024-03-15" in jours and jours["2024-03-15"]["pas"] == 700, list(jours))

    print()
    print("Unites")

    xml = _construire(_rec(Q + "DistanceWalkingRunning", 3.0, "2024-03-15 08:00:00 +0100",
                           "2024-03-15 09:00:00 +0100", unit="mi"))
    jours, _ = _agreger_texte(xml)
    verifier("miles convertis en kilometres",
             abs(jours["2024-03-15"]["distance_km"] - 4.828) < 0.01,
             jours["2024-03-15"].get("distance_km"))

    xml = _construire(_rec(Q + "AppleSleepingWristTemperature", 98.6,
                           "2024-03-15 03:00:00 +0100", unit="degF"))
    jours, _ = _agreger_texte(xml)
    verifier("degres Fahrenheit convertis",
             abs(jours["2024-03-15"]["temp_poignet_moy"] - 37.0) < 0.05,
             jours["2024-03-15"].get("temp_poignet_moy"))

    print()
    print("Frequence cardiaque")

    xml = _construire(
        _rec(Q + "HeartRate", 60, "2024-03-15 08:00:00 +0100", unit="count/min")
        + _rec(Q + "HeartRate", 80, "2024-03-15 12:00:00 +0100", unit="count/min")
        + _rec(Q + "HeartRate", 130, "2024-03-15 18:00:00 +0100", unit="count/min")
        + _rec(Q + "RestingHeartRate", 54, "2024-03-15 23:00:00 +0100", unit="count/min"))
    jours, _ = _agreger_texte(xml)
    j = jours["2024-03-15"]
    verifier("moyenne, min, max et nombre de mesures",
             j["fc_moy"] == 90.0 and j["fc_min"] == 60.0 and j["fc_max"] == 130.0
             and j["fc_n"] == 3, j)
    verifier("frequence cardiaque de repos", j["fc_repos"] == 54.0, j.get("fc_repos"))

    print()
    print("Sommeil")

    nuit = (
        _cat("HKCategoryValueSleepAnalysisInBed", "2024-03-15 23:00:00 +0100", "2024-03-16 07:00:00 +0100")
        + _cat("HKCategoryValueSleepAnalysisAsleepCore", "2024-03-15 23:30:00 +0100", "2024-03-16 02:00:00 +0100")
        + _cat("HKCategoryValueSleepAnalysisAsleepDeep", "2024-03-16 02:00:00 +0100", "2024-03-16 03:30:00 +0100")
        + _cat("HKCategoryValueSleepAnalysisAsleepREM", "2024-03-16 03:30:00 +0100", "2024-03-16 05:00:00 +0100")
        + _cat("HKCategoryValueSleepAnalysisAwake", "2024-03-16 05:00:00 +0100", "2024-03-16 05:15:00 +0100")
        + _cat("HKCategoryValueSleepAnalysisAsleepCore", "2024-03-16 05:15:00 +0100", "2024-03-16 06:45:00 +0100"))
    jours, _ = _agreger_texte(_construire(nuit))
    s = jours.get("2024-03-16", {}).get("sommeil", {})
    verifier("nuit rattachee au jour du reveil", "2024-03-16" in jours, list(jours))
    verifier("duree totale de sommeil = 420 min", s.get("total_min") == 420, s)
    verifier("stades detailles", s.get("profond_min") == 90 and s.get("rem_min") == 90, s)
    verifier("un reveil compte", s.get("reveils") == 1, s.get("reveils"))
    verifier("heures affichees dans le fuseau vecu",
             s.get("debut") == "23:30" and s.get("fin") == "06:45", s)

    # Deux sources qui ecrivent la meme nuit ne doivent pas doubler le total.
    jours, _ = _agreger_texte(_construire(
        nuit + nuit.replace("Apple Watch de Test", "AutoSleep").replace(MONTRE, "")))
    s = jours.get("2024-03-16", {}).get("sommeil", {})
    verifier("deux sources sur la meme nuit : total inchange",
             s.get("total_min") == 420, s.get("total_min"))

    # Ancien format (iOS < 16) sans stades detailles.
    jours, _ = _agreger_texte(_construire(
        _cat("HKCategoryValueSleepAnalysisAsleep", "2019-05-02 23:00:00 +0200",
             "2019-05-03 06:00:00 +0200")))
    s = jours.get("2019-05-03", {}).get("sommeil", {})
    verifier("ancien format « Asleep » reconnu", s.get("total_min") == 420, s)

    print()
    print("Autres elements")

    xml = _construire(' <ActivitySummary dateComponents="2024-03-15" '
                      'activeEnergyBurned="512.3" activeEnergyBurnedGoal="500" '
                      'appleExerciseTime="42" appleExerciseTimeGoal="30" '
                      'appleStandHours="11" appleStandHoursGoal="12"/>\n')
    jours, _ = _agreger_texte(xml)
    verifier("anneaux d'activite lus",
             jours["2024-03-15"]["anneaux"]["exercice_min"] == 42,
             jours.get("2024-03-15"))

    xml = _construire(' <Workout workoutActivityType="HKWorkoutActivityTypeRunning" '
                      'duration="31.5" durationUnit="min" sourceName="Apple Watch de Test" '
                      'startDate="2024-03-15 18:00:00 +0100" endDate="2024-03-15 18:31:00 +0100"/>\n')
    jours, _ = _agreger_texte(xml)
    verifier("seance d'entrainement lue",
             jours["2024-03-15"]["seances"][0]["type"] == "Running",
             jours.get("2024-03-15"))

    print()
    print("Filtres et robustesse")

    xml = _construire(
        _rec(Q + "StepCount", 1000, "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100")
        + _rec(Q + "StepCount", 900, "2024-03-15 14:00:00 +0100", "2024-03-15 15:00:00 +0100",
               source="iPhone de Test", device=TELEPHONE))
    jours, _ = _agreger_texte(xml, filtre_source="montre")
    verifier("filtre « montre » : seuls les pas de la montre",
             jours["2024-03-15"]["pas"] == 1000, jours["2024-03-15"].get("pas"))

    jours, _ = _agreger_texte(xml, depuis="2024-04-01")
    verifier("filtre de periode : rien avant la date demandee", jours == {}, list(jours))

    xml = _construire(
        _rec(Q + "StepCount", "", "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100")
        + _rec(Q + "StepCount", 300, "2024-03-15 10:00:00 +0100", "2024-03-15 11:00:00 +0100")
        + ' <Record type="HKQuantityTypeIdentifierInexistant" sourceName="X" '
          'startDate="2024-03-15 10:00:00 +0100" endDate="2024-03-15 10:00:00 +0100" value="1"/>\n')
    jours, agregateur = _agreger_texte(xml)
    verifier("valeur vide ignoree sans planter",
             jours["2024-03-15"]["pas"] == 300
             and agregateur.anomalies.get("valeur_non_numerique") == 1, dict(agregateur.anomalies))
    verifier("type inconnu compte comme ignore",
             sum(agregateur.types_ignores.values()) == 1, dict(agregateur.types_ignores))

    # Lecture directe depuis une archive zip, sans decompression.
    import tempfile
    dossier = tempfile.mkdtemp()
    chemin_zip = os.path.join(dossier, "export.zip")
    with zipfile.ZipFile(chemin_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("apple_health_export/export.xml", _construire(
            _rec(Q + "StepCount", 4242, "2024-03-15 08:00:00 +0100",
                 "2024-03-15 09:00:00 +0100")))
        z.writestr("apple_health_export/export_cda.xml", "<ClinicalDocument/>")
    agregateur = Agregateur()
    analyser(chemin_zip, agregateur, silencieux=True)
    resultat = {j["date"]: j for j in agregateur.finaliser()}
    verifier("lecture en flux depuis export.zip",
             resultat["2024-03-15"]["pas"] == 4242, resultat)
    verifier("date d'export relevee",
             agregateur.export_date == "2026-08-29 09:00:00 +0200", agregateur.export_date)

    # DTD demesuree : elle doit etre retiree quelle que soit sa taille.
    grosse_dtd = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE HealthData [\n'
                  + '<!-- %s -->\n' % ("x" * 90) * 8000
                  + '<!ELEMENT HealthData (ExportDate, Me, (Record)*)>\n]>\n'
                  + '<HealthData locale="fr_FR">\n <ExportDate value="2026-01-01 00:00:00 +0100"/>\n'
                  + ' <Me/>\n'
                  + _rec(Q + "StepCount", 321, "2024-03-15 08:00:00 +0100",
                         "2024-03-15 09:00:00 +0100")
                  + '</HealthData>\n')
    jours, _ = _agreger_texte(grosse_dtd)
    verifier("DTD de 700 Ko neutralisee sans casse",
             jours.get("2024-03-15", {}).get("pas") == 321, list(jours))

    # DOCTYPE sans sous-ensemble interne.
    sans_sous_ensemble = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                          '<!DOCTYPE HealthData>\n<HealthData locale="fr_FR">\n'
                          + _rec(Q + "StepCount", 123, "2024-03-15 08:00:00 +0100",
                                 "2024-03-15 09:00:00 +0100")
                          + '</HealthData>\n')
    jours, _ = _agreger_texte(sans_sous_ensemble)
    verifier("DOCTYPE sans sous-ensemble interne",
             jours.get("2024-03-15", {}).get("pas") == 123, list(jours))

    # Export tronque : on garde ce qui a ete lu au lieu de tout perdre.
    complet = _construire(
        "".join(_rec(Q + "StepCount", 10, "2024-03-1%d 08:00:00 +0100" % (d % 10),
                     "2024-03-1%d 09:00:00 +0100" % (d % 10)) for d in range(1, 10)))
    tronque = complet[:len(complet) - 260]
    dossier = tempfile.mkdtemp()
    chemin = os.path.join(dossier, "export.xml")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(tronque)
    agregateur = Agregateur()
    analyser(chemin, agregateur, silencieux=True)
    partiel = agregateur.finaliser()
    verifier("export tronque : les jours deja lus sont conserves",
             len(partiel) >= 1 and agregateur.anomalies.get("fichier_tronque") == 1,
             (len(partiel), dict(agregateur.anomalies)))

    # Regressions trouvees par fuzzing sur des exports malformes.
    jours, agregateur = _agreger_texte(_construire(
        _rec(Q + "DistanceWalkingRunning", "NaN", "2024-03-15 08:00:00 +0100",
             "2024-03-15 09:00:00 +0100", unit="mi")
        + _rec(Q + "StepCount", "1e309", "2024-03-15 08:00:00 +0100",
               "2024-03-15 09:00:00 +0100")
        + _rec(Q + "StepCount", 250, "2024-03-15 10:00:00 +0100",
               "2024-03-15 11:00:00 +0100")))
    serialisable = True
    try:
        json.dumps(jours, allow_nan=False)
    except ValueError:
        serialisable = False
    verifier("NaN et infini rejetes, JSON toujours valide",
             serialisable and jours["2024-03-15"]["pas"] == 250
             and "distance_km" not in jours["2024-03-15"], jours.get("2024-03-15"))

    debut_chrono = _chrono()
    jours, agregateur = _agreger_texte(_construire(
        _rec(Q + "StepCount", 400, "2024-03-15 08:00:00 +0100",
             "9999-12-31 23:00:00 +0100")))
    verifier("intervalle aberrant borne au lieu de boucler",
             _chrono() - debut_chrono < 2.0
             and jours.get("2024-03-15", {}).get("pas") == 400,
             (round(_chrono() - debut_chrono, 2), list(jours)))

    print()
    print("Pieges du format Apple")

    # Apple duplique les Record enfants d'une Correlation au premier niveau.
    interieur = _rec(Q + "BodyMass", 72.5, "2024-03-15 08:00:00 +0100", unit="kg")
    xml = _construire(
        "  <Correlation type=\"HKCorrelationTypeIdentifierBloodPressure\" "
        "sourceName=\"Sante\" startDate=\"2024-03-15 08:00:00 +0100\" "
        "endDate=\"2024-03-15 08:00:00 +0100\">\n" + interieur + "  </Correlation>\n"
        + interieur)
    jours, agregateur = _agreger_texte(xml)
    verifier("Record d'une Correlation compte une seule fois",
             jours["2024-03-15"]["poids_kg_n"] == 1, jours["2024-03-15"].get("poids_kg_n"))

    # Une saisie manuelle prime sur la montre, comme dans l'app Sante.
    xml = _construire(
        _rec(Q + "StepCount", 1000, "2024-03-15 08:00:00 +0100", "2024-03-15 09:00:00 +0100")
        + '  <Record type="%sStepCount" sourceName="Sante" unit="count" '
          'startDate="2024-03-15 08:00:00 +0100" endDate="2024-03-15 09:00:00 +0100" '
          'value="1500"><MetadataEntry key="HKWasUserEntered" value="1"/></Record>\n' % Q)
    jours, _ = _agreger_texte(xml)
    verifier("saisie manuelle prioritaire sur la montre",
             jours["2024-03-15"]["pas"] == 1500, jours["2024-03-15"].get("pas"))

    # SpO2 : Apple ecrit une fraction malgre unit="%".
    xml = _construire(_rec(Q + "OxygenSaturation", 0.97, "2024-03-15 08:00:00 +0100", unit="%")
                      + _rec(Q + "OxygenSaturation", 96, "2024-03-15 09:00:00 +0100", unit="%"))
    jours, _ = _agreger_texte(xml)
    verifier("SpO2 en fraction ramene a une echelle 0-100",
             jours["2024-03-15"]["spo2_moy"] == 96.5, jours["2024-03-15"].get("spo2_moy"))

    # Heures debout : une categorie horaire, pas une quantite.
    debout = "".join(
        '  <Record type="%s" sourceName="Apple Watch de Test" device="%s" '
        'startDate="2024-03-15 %02d:00:00 +0100" endDate="2024-03-15 %02d:59:00 +0100" '
        'value="HKCategoryValueAppleStandHour%s"/>\n'
        % (HEURE_DEBOUT, MONTRE, h, h, "Stood" if h % 2 else "Idle")
        for h in range(8, 20))
    jours, _ = _agreger_texte(_construire(debout))
    verifier("heures debout comptees, « Idle » exclu",
             jours["2024-03-15"]["debout_h"] == 6, jours["2024-03-15"].get("debout_h"))

    # Anneaux exprimes en kilojoules dans certaines regions.
    xml = _construire(' <ActivitySummary dateComponents="2024-03-15" '
                      'activeEnergyBurned="2092" activeEnergyBurnedUnit="kJ" '
                      'appleExerciseTime="30"/>\n')
    jours, _ = _agreger_texte(xml)
    verifier("anneaux en kJ convertis en kcal",
             abs(jours["2024-03-15"]["anneaux"]["energie_active_kcal"] - 500.0) < 0.5,
             jours["2024-03-15"]["anneaux"])

    print()
    print("Mise en forme pour l'API")

    instantane = {"date": "2024-03-15", "pas": 8640, "fc_repos": 54.0,
                  "energie_active_kcal": 440.8, "fc_n": 288,
                  "sommeil": {"total_min": 455, "profond_min": 80}}
    forme = appliquer_profil(instantane, {
        "garder": ["date", "pas", "fc_repos"],
        "aplatir": {"sommeil": "sommeil_"},
        "renommer": {"pas": "steps", "fc_repos": "restingHeartRate"},
        "constantes": {"source": "apple-health-export"},
    })
    verifier("profil : selection, aplatissement, renommage, constantes",
             forme == {"date": "2024-03-15", "steps": 8640, "restingHeartRate": 54.0,
                       "sommeil_total_min": 455, "sommeil_profond_min": 80,
                       "source": "apple-health-export"}, forme)
    verifier("profil absent : instantane inchange",
             appliquer_profil(instantane, None) == instantane, "")

    print()
    print("%d verifications passees, %d en echec." % (len(faits), len(echecs)))
    return 1 if echecs else 0


# --------------------------------------------------------------------------
# Ligne de commande
# --------------------------------------------------------------------------

def construire_parseur():
    p = argparse.ArgumentParser(
        prog="sante.py",
        description="Reprise de l'historique Apple Sante / Apple Watch, sans Mac.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Exemples :
  python3 sante.py inspecte export.zip
  python3 sante.py agrege export.zip -o jours.json --csv jours.csv
  python3 sante.py agrege export.zip -o 2024.json --depuis 2024-01-01 --jusqu-a 2024-12-31
  python3 sante.py pousse jours.json --url https://.../health --essai
  python3 sante.py autotest
""")
    p.add_argument("--version", action="version", version="sante.py " + VERSION)
    sous = p.add_subparsers(dest="commande", required=True)

    i = sous.add_parser("inspecte", help="dit ce que contient l'export")
    i.add_argument("export", help="export.zip, export.xml ou dossier apple_health_export")
    i.set_defaults(fonction=cmd_inspecte)

    a = sous.add_parser("agrege", help="produit un instantane par jour")
    a.add_argument("export", help="export.zip, export.xml ou dossier apple_health_export")
    a.add_argument("-o", "--sortie", default="jours.json", help="fichier JSON de sortie")
    a.add_argument("--csv", help="ecrit aussi une version tableur")
    a.add_argument("--source", help="ne garder qu'une source : montre, telephone, ou un nom")
    a.add_argument("--priorite", default="montre", choices=["montre", "telephone", "aucune"],
                   help="source qui l'emporte en cas de recouvrement (defaut : montre)")
    a.add_argument("--depuis", help="date de debut incluse, AAAA-MM-JJ")
    a.add_argument("--jusqu-a", dest="jusqu_a", help="date de fin incluse, AAAA-MM-JJ")
    a.add_argument("--leger", action="store_true",
                   help="preregle pour telephone : montre seule, sans dedoublonnage, "
                        "memoire minimale")
    a.add_argument("--sans-dedup", action="store_true",
                   help="somme brute, sans dedoublonnage : beaucoup moins de memoire, "
                        "a reserver au cas ou l'on filtre deja sur une seule source")
    a.add_argument("--lisible", action="store_true", help="JSON indente")
    a.add_argument("--silencieux", action="store_true")
    a.set_defaults(fonction=cmd_agrege)

    q = sous.add_parser("pousse", help="envoie les instantanes vers une API")
    q.add_argument("jours", help="fichier produit par « agrege »")
    q.add_argument("--url", required=True, help="URL de l'endpoint")
    q.add_argument("--forme", default="jour", choices=["jour", "lot"],
                   help="une requete par jour, ou par paquets")
    q.add_argument("--taille-lot", dest="taille_lot", type=int, default=30)
    q.add_argument("--enveloppe", help="encapsule le corps sous cette cle, ex. « health »")
    q.add_argument("--champ-date", dest="champ_date", default="date",
                   help="renomme la cle « date » attendue par l'API")
    q.add_argument("--entete", action="append",
                   help="en-tete HTTP supplementaire, « Nom: valeur » (repetable)")
    q.add_argument("--jeton-env", dest="jeton_env",
                   help="nom de la variable d'environnement contenant le jeton")
    q.add_argument("--prefixe-jeton", dest="prefixe_jeton", default="Bearer ")
    q.add_argument("--depuis")
    q.add_argument("--jusqu-a", dest="jusqu_a")
    q.add_argument("--etat", help="fichier de reprise : les jours deja envoyes sont sautes")
    q.add_argument("--profil", help="fichier JSON decrivant la forme attendue par l'API")
    q.add_argument("--essai", action="store_true",
                   help="n'envoie rien, affiche la requete qui serait faite")
    q.set_defaults(fonction=cmd_pousse)

    e = sous.add_parser("profil-exemple",
                        help="affiche un profil d'envoi commente, a adapter")
    e.set_defaults(fonction=cmd_profil_exemple)

    t = sous.add_parser("autotest", help="verifie l'outil sur des exports synthetiques")
    t.set_defaults(fonction=cmd_autotest)

    return p


def main(argv=None):
    args = construire_parseur().parse_args(argv)
    try:
        return args.fonction(args)
    except KeyboardInterrupt:
        sys.stderr.write("\nInterrompu.\n")
        return 130
    except BrokenPipeError:
        return 0


if __name__ == "__main__":
    sys.exit(main())
