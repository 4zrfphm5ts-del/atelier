/* Comportements communs du site (16/09/2026). Aucune dépendance, aucun cookie,
   rien n'est stocké dans le navigateur. Le formulaire de devis envoie la demande au
   service d'envoi FormSubmit, qui la transmet par mail ; si l'envoi échoue, la demande
   reste affichée avec un envoi en un clic par mail ou WhatsApp : aucune demande perdue. */
(function(){
  'use strict';
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var reduit=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEL='33610126850', MAIL=(document.getElementById('form-devis')||{dataset:{}}).dataset.courriel||'';

  /* ---------------------------------------------------------- navigation */
  var haut=$('#haut'),prog=$('.prog'),dernier=0,barre=$('.barre-m'),devis=$('#devis'),hero=$('.hero');
  function surDefilement(){
    var y=window.scrollY||0,h=document.documentElement.scrollHeight-innerHeight;
    if(haut){haut.classList.toggle('fond',y>8);
      var menuOuvert=$('.nav-liens.ouvert');
      if(!menuOuvert)haut.classList.toggle('cache',y>500&&y>dernier+4);
      if(y<dernier-4)haut.classList.remove('cache');}
    if(prog)prog.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
    if(barre){
      var seuil=hero?hero.offsetTop+hero.offsetHeight*.7:500,dansDevis=false;
      if(devis){var r=devis.getBoundingClientRect();dansDevis=r.top<innerHeight*.85&&r.bottom>0;}
      barre.classList.toggle('visible',y>seuil&&!dansDevis);
    }
    dernier=y;
  }
  var tic=false;addEventListener('scroll',function(){if(!tic){tic=true;requestAnimationFrame(function(){surDefilement();tic=false})}},{passive:true});
  surDefilement();

  var burger=$('.burger'),liens=$('.nav-liens');
  function fermerMenu(){if(!liens)return;liens.classList.remove('ouvert');burger&&burger.setAttribute('aria-expanded','false')}
  if(burger&&liens){
    burger.addEventListener('click',function(){var o=!liens.classList.contains('ouvert');liens.classList.toggle('ouvert',o);burger.setAttribute('aria-expanded',o);if(o)haut.classList.remove('cache')});
    $$('a',liens).forEach(function(a){a.addEventListener('click',fermerMenu)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')fermerMenu()});
  }

  /* ---------------------------------------------------------- apparitions */
  var rv=$$('.rv');
  if('IntersectionObserver' in window&&!reduit){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    rv.forEach(function(el){io.observe(el)});
  } else rv.forEach(function(el){el.classList.add('vu')});

  /* ---------------------------------------------------------- onglets */
  $$('[role="tablist"]').forEach(function(liste){
    var tabs=$$('[role="tab"]',liste);
    function choisir(t,focus){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;var p=document.getElementById(x.getAttribute('aria-controls'));if(p)p.hidden=!on});if(focus)t.focus()}
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){choisir(t)});
      t.addEventListener('keydown',function(e){var k=e.key,j=k==='ArrowRight'?i+1:k==='ArrowLeft'?i-1:k==='Home'?0:k==='End'?tabs.length-1:null;if(j===null)return;e.preventDefault();choisir(tabs[(j+tabs.length)%tabs.length],true)});
    });
    liste._choisir=function(id){var t=document.getElementById(id);if(t)choisir(t)};
  });
  $$('[data-onglet]').forEach(function(a){a.addEventListener('click',function(){var t=document.getElementById(a.dataset.onglet);if(t)t.click()})});

  /* ---------------------------------------------------------- langues */
  // Sélecteur : ferme la liste au clic ailleurs ou sur Échap.
  $$('details.langue').forEach(function(d){
    document.addEventListener('click',function(e){if(d.open&&!d.contains(e.target))d.open=false});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')d.open=false});
  });
  // Suggestion de langue, sans redirection (Google doit pouvoir lire chaque version) et sans
  // rien stocker : proposée seulement à l'arrivée depuis un autre site, si la langue du
  // navigateur existe et diffère de la page.
  (function(){
    var racine=document.documentElement,page=racine.lang,liens={};
    try{liens=JSON.parse(racine.getAttribute('data-langues')||'{}')}catch(e){}
    var venuDuSite=document.referrer&&document.referrer.indexOf(location.origin)===0;
    if(venuDuSite||/[?&]lang=/.test(location.search))return;
    var pref=((navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''])
      .map(function(l){return String(l).slice(0,2).toLowerCase()}).filter(function(l){return liens[l]})[0]);
    if(!pref||pref===page)return;
    var M={fr:['Ce site existe en français.','Voir en français','Fermer'],en:['This site is available in English.','View in English','Close'],
      es:['Este sitio está disponible en español.','Ver en español','Cerrar'],de:['Diese Website gibt es auf Deutsch.','Auf Deutsch ansehen','Schließen']}[pref];
    if(!M)return;
    var b=document.createElement('div');b.className='suggestion';b.setAttribute('role','region');b.setAttribute('aria-label',M[0]);b.lang=pref;
    b.innerHTML='<span>'+M[0]+'</span><a href="'+liens[pref]+'">'+M[1]+'</a><button type="button" aria-label="'+M[2]+'">×</button>';
    b.querySelector('button').addEventListener('click',function(){b.remove()});
    document.body.insertBefore(b,document.body.firstChild.nextSibling);
  })();

  /* ---------------------------------------------------------- formulaire de devis */
  var form=$('#form-devis');
  if(!form)return;
  var L={};try{L=JSON.parse(form.dataset.i18n||'{}')}catch(e){}
  function tr(k,def){return L[k]||def}
  var SEP=document.documentElement.lang==='fr'?' : ':': ';
  var LIB=L.libelles||['Projet','Vous êtes','Budget','Pour quand','Nom','Mail','Téléphone','Entreprise ou site','Réponse préférée','Message'];
  var etapes=$$('[data-etape]',form),pas=1,total=etapes.length;
  var bRetour=$('[data-retour]',form),bSuivant=$('[data-suivant]',form),bEnvoyer=$('[data-envoyer]',form),manque=$('[data-manque]',form);
  var libPas=$('[data-pas]',form),piste=$('.piste i',form);

  function val(n){var el=form.querySelector('[name="'+n+'"]:checked')||form.querySelector('input[name="'+n+'"]:not([type=radio]),textarea[name="'+n+'"]');return el?String(el.value||'').trim():''}
  function montrer(n,focus){
    pas=n;etapes.forEach(function(f){f.hidden=+f.dataset.etape!==n});
    bRetour.hidden=n===1;bSuivant.hidden=n===total;bEnvoyer.hidden=n!==total;manque.textContent='';
    if(libPas)libPas.textContent=tr('etape','Étape {n} sur {t}').replace('{n}',n).replace('{t}',total);
    if(piste)piste.style.width=(n/total*100)+'%';
    if(focus){var l=$('legend',etapes[n-1]);if(l){l.tabIndex=-1;l.focus({preventScroll:true})}}
  }
  function valide(n){
    if(n===1&&!val('projet')){manque.textContent=tr('choisir','Choisissez le type de projet (ou « Autre chose »).');return false}
    if(n===3){
      var ok=true,nom=$('[name="nom"]',form),mail=$('[name="email"]',form),tel=$('[name="telephone"]',form);
      [nom,mail,tel].forEach(function(el){el.removeAttribute('aria-invalid')});
      $$('.err',form).forEach(function(e){e.textContent=''});
      if(!nom.value.trim()){nom.setAttribute('aria-invalid','true');$('#err-nom').textContent=tr('nom','Votre nom, pour savoir à qui répondre.');ok=false}
      var m=mail.value.trim(),t=tel.value.replace(/[^\d+]/g,'');
      if(m&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)){mail.setAttribute('aria-invalid','true');$('#err-email').textContent=tr('mail_incomplet','Adresse mail incomplète.');ok=false}
      if(!m&&t.length<9){mail.setAttribute('aria-invalid','true');$('#err-email').textContent=tr('joindre','Un mail ou un téléphone, pour vous répondre.');ok=false}
      if(!ok){manque.textContent=tr('manque','Il manque une information pour vous répondre.');var inv=$('[aria-invalid="true"]',form);inv&&inv.focus()}
      return ok;
    }
    return true;
  }
  bSuivant.addEventListener('click',function(){if(valide(pas))montrer(pas+1,true)});
  bRetour.addEventListener('click',function(){montrer(pas-1,true)});
  $$('input[name="projet"]',form).forEach(function(r){r.addEventListener('change',function(){if(pas===1)setTimeout(function(){montrer(2,true)},reduit?0:260)})});
  form.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&pas<total){e.preventDefault();bSuivant.click()}});

  function preselection(projet){
    var r=$$('input[name="projet"]',form).filter(function(x){return x.value===projet})[0];
    if(r){r.checked=true;montrer(2)}
  }
  $$('[data-projet]').forEach(function(a){a.addEventListener('click',function(){preselection(a.dataset.projet)})});
  var q=/[?&]projet=([^&#]+)/.exec(location.search);if(q)preselection(decodeURIComponent(q[1].replace(/\+/g,' ')));

  function recap(){
    var champs=['projet','structure','budget','delai','nom','email','telephone','entreprise','canal','message'];
    var lignes=champs.map(function(c,i){return [LIB[i],val(c)]});
    return lignes.filter(function(l){return l[1]}).map(function(l){return l[0]+SEP+l[1]}).join('\n');
  }
  function liensSecours(){
    var texte=tr('bonjour','Bonjour Benjamin, voici ma demande de devis.')+'\n\n'+recap();
    $('[data-recap]',form).textContent=recap();
    $('[data-mail]',form).href='mailto:'+MAIL+'?subject='+encodeURIComponent(tr('sujet','Demande de devis')+SEP+(val('projet')||''))+'&body='+encodeURIComponent(texte).replace(/%0A/g,'%0D%0A');
    $('[data-wa]',form).href='https://wa.me/'+TEL+'?text='+encodeURIComponent(texte);
  }
  var copier=$('[data-copier]',form);
  if(copier)copier.addEventListener('click',function(){
    var t=tr('sujet','Demande de devis')+'\n\n'+recap();
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){copier.textContent=tr('copie','Copié')},function(){});
  });

  var envoiEnCours=false;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(envoiEnCours||!valide(3))return;
    envoiEnCours=true;bEnvoyer.disabled=true;bEnvoyer.textContent=tr('envoi','Envoi en cours…');
    var fin=function(ok){
      envoiEnCours=false;
      $('[data-etapes]',form).hidden=true;$('.navig',form).hidden=true;$('.avance',form).hidden=true;var c=$('.consent',form);if(c)c.hidden=true;
      var bloc=ok?$('[data-ok]',form):$('[data-echec]',form);
      if(ok){var p=$('[data-prenom]',bloc);if(p)p.textContent=val('nom').split(' ')[0];var ad=$('[data-adresse]',bloc);if(ad)ad.textContent=val('email')||(tr('au','au')+' '+val('telephone'))}
      else liensSecours();
      bloc.hidden=false;bloc.focus({preventScroll:true});
      var r=form.getBoundingClientRect();if(r.top<0||r.top>innerHeight*.4)window.scrollTo({top:scrollY+r.top-90,behavior:reduit?'auto':'smooth'});
    };
    if($('[name="_honey"]',form).value){fin(true);return}
    var donnees={
      _subject:'['+document.documentElement.lang.toUpperCase()+'] Devis '+(val('projet')||'projet')+' · '+val('nom'),
      _template:'table',_captcha:'false',
      'Langue du visiteur':document.documentElement.lang,
      'Projet':val('projet'),'Vous êtes':val('structure')||'non précisé','Budget':val('budget')||'non précisé','Pour quand':val('delai')||'non précisé',
      'Nom':val('nom'),'Mail':val('email')||'non fourni','Téléphone':val('telephone')||'non fourni','Entreprise ou site':val('entreprise')||'non précisé',
      'Réponse préférée':val('canal')||'non précisée','Message':val('message')||'(vide)','Page':location.href.split('#')[0]
    };
    if(val('email'))donnees._replyto=val('email');
    var ctrl='AbortController' in window?new AbortController():null,minuteur=setTimeout(function(){ctrl&&ctrl.abort()},15000);
    fetch(form.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(donnees),signal:ctrl?ctrl.signal:undefined})
      .then(function(r){return r.json().catch(function(){return {}})})
      .then(function(j){clearTimeout(minuteur);fin(j&&(j.success===true||j.success==='true'))})
      .catch(function(){clearTimeout(minuteur);fin(false)});
  });
  montrer(pas);
})();
