/* =========================================================
   DADA Cafétéria — interactions
   ========================================================= */

/* ⚙️ À CONFIGURER : adresse de réception des demandes de réservation.
   Remplacer par l'email réel de DADA quand il sera connu. */
const RESA_EMAIL = "contact@dadacafeteria.fr";

document.addEventListener("DOMContentLoaded", () => {

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

  /* ---------- Formulaire de réservation ---------- */
  const form = document.getElementById("resa-form");

  function buildMailto(data) {
    const subject = `Demande DADA — ${data.type || "Réservation"}${data.pax ? ` (${data.pax} pers.)` : ""}`;
    const lines = [
      `Nom : ${data.nom || "-"}`,
      `Email : ${data.email || "-"}`,
      `Téléphone : ${data.tel || "-"}`,
      `Type d'événement : ${data.type || "-"}`,
      `Nombre de personnes : ${data.pax || "-"}`,
      `Date souhaitée : ${data.date || "-"}`,
      `Créneau : ${data.creneau || "-"}`,
      "",
      "Message :",
      data.message || "-",
      "",
      "— Envoyé depuis le site DADA",
    ];
    return `mailto:${RESA_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());

      // validation minimale
      let ok = true;
      ["nom", "email", "type"].forEach(name => {
        const field = form.elements[name];
        const empty = !data[name] || !String(data[name]).trim();
        field.classList.toggle("invalid", empty);
        if (empty) ok = false;
      });
      if (!ok) { form.querySelector(".invalid")?.focus(); return; }

      window.location.href = buildMailto(data);
    });

    // lien "écrire directement"
    const direct = document.querySelector("[data-resa-mail]");
    if (direct) {
      direct.addEventListener("click", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        window.location.href = buildMailto(Object.fromEntries(fd.entries()));
      });
    }
  }
});
