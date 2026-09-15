/* ÉLAN — comportements communs. Aucune dépendance, aucun traceur. */
(function () {
  'use strict';

  /* --- barre de navigation : fond au défilement, masquage vers le bas --- */
  var nav = document.getElementById('nav');
  var progress = document.getElementById('progress');
  var dernier = 0;
  function auDefilement() {
    var y = window.scrollY || 0;
    if (nav) {
      nav.classList.toggle('scrolled', y > 24);
      nav.classList.toggle('masquee', y > 400 && y > dernier && !nav.querySelector('.ouvert'));
    }
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    dernier = y;
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  auDefilement();

  /* --- menu mobile --- */
  var burger = document.getElementById('burger');
  var liens = document.getElementById('navlinks');
  if (burger && liens) {
    burger.addEventListener('click', function () {
      var ouvert = liens.classList.toggle('ouvert');
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
    liens.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        liens.classList.remove('ouvert');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- apparition au défilement --- */
  var cibles = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && cibles.length) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    cibles.forEach(function (c) { io.observe(c); });
  } else {
    cibles.forEach(function (c) { c.classList.add('in'); });
  }

  /* --- lien de section actif (page d'accueil) --- */
  var ancres = [].slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if ('IntersectionObserver' in window && ancres.length) {
    var spy = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        ancres.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ancres.forEach(function (a) {
      var s = document.getElementById(a.getAttribute('href').slice(1));
      if (s) spy.observe(s);
    });
  }

  /* --- formulaire de brief : validation puis email pré-rempli (aucun envoi serveur) --- */
  var form = document.getElementById('brief');
  if (form) {
    var DEST = form.dataset.dest || 'benjamin.fieve@gmail.com';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      [].slice.call(form.querySelectorAll('[required]')).forEach(function (ch) {
        var vide = !ch.value.trim();
        var mauvaisMail = ch.type === 'email' && ch.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ch.value);
        ch.closest('.champ').classList.toggle('ko', vide || mauvaisMail);
        if (vide || mauvaisMail) ok = false;
      });
      if (!ok) {
        var premier = form.querySelector('.champ.ko input, .champ.ko select, .champ.ko textarea');
        if (premier) premier.focus();
        return;
      }
      var v = function (n) { var c = form.elements[n]; return c ? c.value.trim() : ''; };
      var corps = [
        'Société : ' + v('societe'),
        'Contact : ' + v('nom'),
        'Email : ' + v('email'),
        'Téléphone : ' + (v('tel') || '—'),
        'Nature de la mission : ' + v('pole'),
        'Budget envisagé : ' + (v('budget') || '—'),
        'Échéance : ' + (v('echeance') || '—'),
        '',
        'Le besoin :',
        v('besoin'),
        '',
        '— envoyé depuis le site ÉLAN'
      ].join('\n');
      var sujet = 'Demande — ' + (v('pole') || 'mission') + ' — ' + v('societe');
      window.location.href = 'mailto:' + DEST +
        '?subject=' + encodeURIComponent(sujet) +
        '&body=' + encodeURIComponent(corps);
      var etat = document.getElementById('brief-etat');
      if (etat) {
        etat.textContent = 'Votre logiciel de messagerie s’ouvre avec le message pré-rempli. Il ne part qu’une fois que vous l’envoyez.';
        etat.hidden = false;
      }
    });
    form.addEventListener('input', function (e) {
      var ch = e.target.closest('.champ');
      if (ch) ch.classList.remove('ko');
    });
  }

  /* --- année courante dans le pied de page --- */
  var an = document.getElementById('annee');
  if (an) an.textContent = new Date().getFullYear();
})();
