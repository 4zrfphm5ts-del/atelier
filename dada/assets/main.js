/* =========================================================
   DADA Cafétéria — interactions
   ========================================================= */

/* Le formulaire de réservation a été retiré le 04/09/2026 (décision Benj) : le site
   renvoie vers un mailto et Instagram. Plus aucun JS de formulaire ici. */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Éléments événementiels temporaires ----------
     data-until = premier jour où l'élément ne doit PLUS s'afficher (date locale).
     Passée cette date il se cache seul (bandeau, tampon, ligne horaires) ;
     à retirer du HTML ensuite. */
  document.querySelectorAll("[data-until]").forEach(b => {
    const [y, m, d] = b.dataset.until.split("-").map(Number);
    if (new Date() >= new Date(y, m - 1, d)) b.hidden = true;
  });

  /* ---------- Menu mobile (burger) ---------- */
  const nav = document.querySelector(".nav");
  const burger = document.getElementById("burger");
  if (burger) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav__links a, .btn--nav").forEach(a =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- Onglets de la carte ---------- */
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle("is-active", t === tab));
      panels.forEach(p => p.classList.toggle("is-active", p.dataset.panel === key));
    });
  });

});
