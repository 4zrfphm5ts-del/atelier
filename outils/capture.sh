#!/bin/sh
# Capture une page HTML en PNG, sans aucune dépendance à installer.
# Utilise le Chromium/Chrome déjà présent sur la machine.
#
#   outils/capture.sh page.html sortie.png [largeur] [hauteur]
#
# Par défaut 1080x1350 (carrousel portrait), capturé en 2x.

set -eu

[ $# -ge 2 ] || { echo "usage: $0 page.html sortie.png [largeur] [hauteur]" >&2; exit 2; }

PAGE=$1
OUT=$2
W=${3:-1080}
H=${4:-1350}

trouver_navigateur() {
  # Conteneur de session distante
  for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  # macOS
  for c in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  # Linux
  for c in chromium chromium-browser google-chrome google-chrome-stable microsoft-edge; do
    command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return; }
  done
  return 1
}

CHROME=$(trouver_navigateur) || {
  echo "Aucun Chromium ou Chrome trouve." >&2
  echo "macOS : installez Google Chrome. Linux : apt install chromium." >&2
  exit 1
}

# Chemin absolu en file:// — Chromium refuse les chemins relatifs
case "$PAGE" in
  /*) ABS=$PAGE ;;
  *)  ABS=$(cd "$(dirname "$PAGE")" && pwd)/$(basename "$PAGE") ;;
esac

mkdir -p "$(dirname "$OUT")"

"$CHROME" \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size="$W,$H" \
  --screenshot="$OUT" \
  "file://$ABS" 2>/dev/null

[ -f "$OUT" ] || { echo "La capture a echoue." >&2; exit 1; }
echo "$OUT ($((W*2))x$((H*2)))"
