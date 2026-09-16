/* Comportements communs du site (16/09/2026). Aucune dépendance, aucun cookie,
   rien n'est stocké dans le navigateur. Le formulaire de devis envoie la demande au
   service d'envoi FormSubmit, qui la transmet par mail ; si l'envoi échoue, la demande
   reste affichée avec un envoi en un clic par mail ou WhatsApp : aucune demande perdue. */
(function(){
  'use strict';
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var racine=document.documentElement;
  var mqReduit=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
  var reduit=!!(mqReduit&&mqReduit.matches);
  var TEL='33610126850', MAIL=(document.getElementById('form-devis')||{dataset:{}}).dataset.courriel||'';

  /* ==========================================================================
     Mouvement. Le défilement reste natif : jamais détourné, jamais lissé.
     · .mo-tl : le navigateur connaît animation-timeline, le CSS fait tout le lié-au-défilement
       sur le fil du compositeur ; ce script ne gère que les états discrets.
     · .mo-js : repli. Les mêmes animations CSS sont en pause et ce script règle leur currentTime.
     Dans les deux cas : un seul requestAnimationFrame par salve d'événements scroll (passifs),
     rien ne tourne quand rien ne bouge. ?mo=js force le repli (contrôle qualité).
     ========================================================================== */
  var IO='IntersectionObserver' in window;
  var mouvement=!reduit&&IO;
  var natif=mouvement&&!!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline: view()'))&&!/[?&]mo=js\b/.test(location.search);
  if(mouvement){racine.classList.add('mo');racine.classList.add(natif?'mo-tl':'mo-js')}
  var H=function(){return window.innerHeight||racine.clientHeight};
  var borner=function(v){return v<0?0:v>1?1:v};

  /* ---------------------------------------------------------- titre du hero, mot à mot
     Seulement si le titre est encore invisible (son animation CSS attend) : sinon on n'y touche
     pas, il finit son entrée d'un bloc. Aucun changement de coupure : les espaces restent. */
  (function(){
    var h=mouvement&&$('.hero h1.entree');
    if(!h||getComputedStyle(h).opacity!=='0')return;
    var i=0;
    (function decouper(n){
      Array.prototype.slice.call(n.childNodes).forEach(function(c){
        if(c.nodeType===3){
          var f=document.createDocumentFragment();
          c.nodeValue.split(/([ \t\n\r\f]+)/).forEach(function(m){
            if(!m)return;
            if(/^[ \t\n\r\f]+$/.test(m)){f.appendChild(document.createTextNode(m));return}
            var s=document.createElement('span');s.className='mot';s.style.setProperty('--i',i++);s.textContent=m;f.appendChild(s);
          });
          n.replaceChild(f,c);
        } else if(c.nodeType===1&&!/^(svg|br|img)$/i.test(c.nodeName))decouper(c);
      });
    })(h);
    h.classList.add('mots');
    setTimeout(function(){h.classList.add('mots-fini')},140+i*46+1200);
  })();

  /* ---------------------------------------------------------- navigation */
  var haut=$('#haut'),prog=$('.prog'),barre=$('.barre-m'),devis=$('#devis'),hero=$('.hero'),liens=$('.nav-liens'),burger=$('.burger');
  var dernier=window.scrollY||0,sens=0,pivot=dernier;
  // Fond flouté après quelques pixels ; la barre se rétracte vers le bas et revient vers le haut,
  // avec une petite hystérésis pour ne pas clignoter sur les fins de défilement doux.
  function nav(y){
    if(!haut)return;
    haut.classList.toggle('fond',y>8);
    if(y>dernier+.5){if(sens!==1){sens=1;pivot=dernier}}
    else if(y<dernier-.5){if(sens!==-1){sens=-1;pivot=dernier}}
    if(y<120||(liens&&liens.classList.contains('ouvert')))haut.classList.remove('cache');
    else if(sens===1&&y-pivot>32)haut.classList.add('cache');
    else if(sens===-1&&pivot-y>14)haut.classList.remove('cache');
  }
  function progression(y){
    if(!prog||natif)return;
    var h=racine.scrollHeight-H();
    prog.style.transform='scaleX('+(h>0?borner(y/h):0).toFixed(4)+')';
  }
  function barreMobile(y){
    if(!barre)return;
    var seuil=hero?hero.offsetTop+hero.offsetHeight*.7:500,dansDevis=false;
    if(devis){var r=devis.getBoundingClientRect();dansDevis=r.top<H()*.85&&r.bottom>0}
    barre.classList.toggle('visible',y>seuil&&!dansDevis);
  }

  function fermerMenu(){if(!liens)return;liens.classList.remove('ouvert');burger&&burger.setAttribute('aria-expanded','false')}
  if(burger&&liens){
    burger.addEventListener('click',function(){var o=!liens.classList.contains('ouvert');liens.classList.toggle('ouvert',o);burger.setAttribute('aria-expanded',o);if(o)haut.classList.remove('cache')});
    $$('a',liens).forEach(function(a){a.addEventListener('click',fermerMenu)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')fermerMenu()});
  }

  // Section active dans le menu : celle qui traverse une ligne fine à 40 % de la hauteur.
  (function(){
    if(!liens||!IO)return;
    var paires=[];
    $$('a[href^="#"]',liens).forEach(function(a){
      if(a.classList.contains('seul-m'))return;
      var s=document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if(s)paires.push({a:a,s:s,dedans:false});
    });
    if(!paires.length)return;
    var obs=new IntersectionObserver(function(es){
      es.forEach(function(e){paires.forEach(function(p){if(p.s===e.target)p.dedans=e.isIntersecting})});
      var ici=null;paires.forEach(function(p){if(p.dedans)ici=p});
      paires.forEach(function(p){p.a.classList.toggle('ici',p===ici)});
    },{rootMargin:'-40% 0px -58% 0px'});
    paires.forEach(function(p){obs.observe(p.s)});
  })();

  /* ---------------------------------------------------------- apparitions en cascade */
  var CIBLES='.preuves li,.grille-prix .prix,.bon,.garanties li,.faq details,.faq-grille .tete,#devis .tete,.aside-devis .carte-s,.autres a,.pied-grille>div';
  var ioVivant=false;
  function reveler(el,d){
    if(el.classList.contains('vu'))return;
    d=d||0;
    el.style.setProperty('--rv-d',d.toFixed(2)+'s');
    el.classList.add('rv-anim');el.classList.add('vu');
    var fini=false;
    function fin(){if(fini)return;fini=true;el.classList.remove('rv-anim');el.removeEventListener('transitionend',surFin)}
    function surFin(ev){if(ev.target===el&&ev.propertyName==='translate')fin()}
    el.addEventListener('transitionend',surFin);
    setTimeout(fin,(d+1.6)*1000);
    compter(el,d+.2);
  }

  // Compteurs du bandeau de preuves : chaque nombre entier (2 à 6 chiffres, sans séparateur)
  // défile jusqu'à sa valeur, une seule fois, puis le texte d'origine est remis tel quel.
  function preparerCompteurs(){
    $$('.preuves li').forEach(function(li){
      var marche=document.createTreeWalker(li,4,null),textes=[],t;
      while((t=marche.nextNode()))textes.push(t);
      textes.forEach(function(t){
        var s=t.nodeValue,re=/\d+/g,m,f=null,dep=0;
        while((m=re.exec(s))){
          var fin=m.index+m[0].length;
          if(m[0].length<2||m[0].length>6||/\d[\s.,]$/.test(s.slice(0,m.index))||/^[\s.,]\d/.test(s.slice(fin)))continue;
          f=f||document.createDocumentFragment();
          f.appendChild(document.createTextNode(s.slice(dep,m.index)));
          var c=document.createElement('data');c.className='compte';c.value=m[0];c.setAttribute('data-v',m[0]);
          c.innerHTML='<i class="compte-fin"></i><i class="compte-vif" aria-hidden="true">0</i>';
          c.firstChild.textContent=m[0];f.appendChild(c);dep=fin;
        }
        if(f){f.appendChild(document.createTextNode(s.slice(dep)));t.parentNode.replaceChild(f,t)}
      });
    });
  }
  function compter(el,d){
    var cs=$$('.compte',el);
    if(!cs.length||el.getAttribute('data-compte'))return;
    el.setAttribute('data-compte','1');
    setTimeout(function(){
      var t0=0,duree=1500;
      function pas(t){
        if(!t0)t0=t;
        var k=Math.min(1,(t-t0)/duree),e=k>=1?1:1-Math.pow(2,-10*k);
        cs.forEach(function(c){c.lastChild.textContent=String(Math.round(+c.getAttribute('data-v')*e))});
        if(k<1){requestAnimationFrame(pas);return}
        cs.forEach(function(c){if(c.parentNode)c.parentNode.replaceChild(document.createTextNode(c.getAttribute('data-v')),c)});
        el.normalize();el.removeAttribute('data-compte');
      }
      requestAnimationFrame(pas);
    },(d||0)*1000);
  }

  if(mouvement){
    // 16/09/2026 : plus d'animation des prix (« 0 € » transitoire, € renvoyé à la ligne).
    // Des conteneurs animés d'un bloc passent en cascade : leurs enfants prennent le relais.
    var enfantsCaches=$$('.faq.rv details,.garanties.rv li');
    $$('.faq.rv,.garanties.rv').forEach(function(el){el.classList.remove('rv')});
    // Cibles ajoutées ici : déjà à l'écran au démarrage, elles restent visibles (pas de clignotement).
    var cibles=$$(CIBLES).filter(function(el){return !el.classList.contains('rv')&&!(el.parentElement&&el.parentElement.closest('.rv'))});
    var aLEcran=cibles.map(function(el){if(enfantsCaches.indexOf(el)>=0)return false;var r=el.getBoundingClientRect();return !!(r.width||r.height)&&r.top<H()&&r.bottom>0});
    cibles.forEach(function(el,i){el.classList.add('rv');if(aLEcran[i]){el.classList.add('vu');compter(el,.9)}});
    var obsRv=new IntersectionObserver(function(es){
      ioVivant=true;
      var vues=es.filter(function(e){return e.isIntersecting});
      vues.sort(function(a,b){var ra=a.boundingClientRect,rb=b.boundingClientRect;return (Math.round(ra.top/60)-Math.round(rb.top/60))||(ra.left-rb.left)});
      vues.forEach(function(e,i){obsRv.unobserve(e.target);reveler(e.target,Math.min(i,6)*.07)});
    },{rootMargin:'0px 0px -10% 0px'});
    $$('.rv:not(.vu)').forEach(function(el){obsRv.observe(el)});
    // Sécurité : après le chargement, tout ce qui est à l'écran ou déjà dépassé apparaît ;
    // si l'observateur n'a jamais répondu, tout apparaît.
    var secours=function(){
      $$('.rv:not(.vu)').forEach(function(el){var r=el.getBoundingClientRect();if(!ioVivant||((r.width||r.height)&&r.top<H()))reveler(el,0)});
    };
    if(document.readyState==='complete')setTimeout(secours,1500);else addEventListener('load',function(){setTimeout(secours,1500)});
    addEventListener('beforeprint',function(){$$('.rv').forEach(function(el){el.classList.add('vu')})});
  } else $$('.rv').forEach(function(el){el.classList.add('vu')});

  /* ---------------------------------------------------------- récit : la méthode, épinglée
     Ordinateur assez haut (voir site.css) : la section s'allonge, son contenu reste épinglé et
     les étapes s'allument une à une. Barre de progression : CSS (view-timeline) ou repli JS. */
  var recit=null,mqEpingle=window.matchMedia?matchMedia('screen and (min-width: 981px) and (min-height: 700px)'):null;
  function initRecit(){
    var sec=$('#methode'),liste=sec&&$('.etapes',sec),cartes=liste?$$('.etape',liste):[];
    if(!mouvement||!mqEpingle||cartes.length<3||cartes.length>6)return;
    sec.classList.add('recit');
    var rail=document.createElement('div');rail.className='recit-rail';rail.setAttribute('aria-hidden','true');
    rail.innerHTML='<span class="recit-piste"><i></i></span><span class="recit-num"></span>';
    liste.parentNode.insertBefore(rail,liste.nextSibling);
    var modele='';try{modele=JSON.parse($('#form-devis').getAttribute('data-i18n')).etape}catch(e){}
    modele=modele||({fr:'Étape {n} sur {t}',en:'Step {n} of {t}',es:'Paso {n} de {t}',de:'Schritt {n} von {t}'})[racine.lang]||'{n} / {t}';
    recit={sec:sec,wrap:liste.parentNode,cartes:cartes,fil:rail.querySelector('i'),num:rail.querySelector('.recit-num'),modele:modele,pas:-1,visible:false,epingle:false};
    recit.num.textContent=modele.replace('{n}',1).replace('{t}',cartes.length);
    new IntersectionObserver(function(es){recit.visible=es[es.length-1].isIntersecting;if(recit.visible)demander()}).observe(sec);
    evaluerEpingle();
  }
  function evaluerEpingle(){
    if(!recit)return;
    recit.sec.classList.remove('recit-libre');
    var ok=mouvement&&mqEpingle.matches&&recit.wrap.scrollHeight<=H()+2;   // le contenu doit tenir dans l'écran
    recit.sec.classList.toggle('recit-libre',!ok);
    if(!ok)recit.cartes.forEach(function(c){c.classList.remove('fait');c.classList.remove('actif')});
    recit.epingle=ok;recit.pas=-1;
  }
  function recitMaj(){
    if(!recit||!recit.visible||!recit.epingle)return;
    var r=recit.sec.getBoundingClientRect(),V=H(),long=r.height-V;
    if(long<=0)return;
    var q=borner(-r.top/long/.92),n=recit.cartes.length;
    var pas=r.top>V*.3?0:Math.min(n,Math.floor(q*n)+1);
    if(!natif)recit.fil.style.transform='scaleX('+q.toFixed(4)+')';
    if(pas===recit.pas)return;
    recit.pas=pas;
    // Contenu épinglé : ce qui est sous la ligne de déclenchement ne remonterait jamais, on le révèle ici.
    if(pas>0)$$('.rv:not(.vu)',recit.sec).forEach(function(el,i){reveler(el,Math.min(i,6)*.07)});
    recit.cartes.forEach(function(c,i){c.classList.toggle('fait',i<pas-1);c.classList.toggle('actif',i===pas-1)});
    recit.num.textContent=recit.modele.replace('{n}',Math.max(1,pas)).replace('{t}',n);
  }

  /* ---------------------------------------------------------- repli JS des animations liées au défilement
     Plages identiques à celles de site.css (animation-range). Sujet : l'élément dont la position
     sert de repère ; pour une scène qui s'anime elle-même, son parent (qui, lui, ne bouge pas). */
  var PLAGES={
    'h-lueur':{racine:1},'h-groupe':{racine:.9},'h-avant':{racine:.9},'h-devant':{racine:.9},
    'hm-groupe':{sujet:'.scene-app,.visuel-page',parent:1,de:['entry',0],a:['cover',50]},
    'hm-avant':{sujet:'.scene-app,.visuel-page',parent:1,de:['entry',0],a:['cover',50]},
    'par-mac':{sujet:'.visuel',de:['entry',0],a:['cover',45]},
    'par-doux':{sujet:'.visuel',de:['cover',0],a:['cover',100]},
    'par-fort':{sujet:'.visuel',de:['cover',0],a:['cover',100]},
    'par-inverse':{sujet:'.visuel',de:['cover',0],a:['cover',100]},
    'par-badge':{sujet:'.portrait',de:['cover',0],a:['cover',100]}
  };
  var repli=[],obsSujets=null;
  function scannerRepli(){
    repli=[];
    if(obsSujets){obsSujets.disconnect();obsSujets=null}
    if(natif||!mouvement||!document.getAnimations)return;
    document.getAnimations().forEach(function(a){
      var p=PLAGES[a.animationName],cible=a.effect&&a.effect.target,s=null;
      if(!p||!cible)return;
      if(p.sujet){s=cible.closest(p.sujet);if(s&&p.parent)s=s.parentElement;if(!s)return}
      repli.push({a:a,p:p,s:s});
    });
    obsSujets=new IntersectionObserver(function(es){es.forEach(function(e){e.target.moVu=e.isIntersecting});demander()},{rootMargin:'20% 0px'});
    repli.forEach(function(it){if(it.s){it.s.moVu=true;obsSujets.observe(it.s)}});
  }
  function point(nom,pct,h,V){   // position du haut du sujet (dans l'écran) à ce point de plage
    var a,b;
    if(nom==='entry'){a=V;b=h<=V?V-h:0}
    else if(nom==='exit'){a=h<=V?0:V-h;b=-h}
    else if(nom==='contain'){a=h<=V?V-h:0;b=h<=V?0:V-h}
    else{a=V;b=-h}
    return a+(b-a)*pct/100;
  }
  function repliMaj(y){
    if(!repli.length)return;
    var V=H(),vals=repli.map(function(it){          // lectures d'abord…
      if(it.p.racine)return borner(y/(it.p.racine*V));
      if(!it.s.moVu)return null;
      var r=it.s.getBoundingClientRect(),t0=point(it.p.de[0],it.p.de[1],r.height,V),t1=point(it.p.a[0],it.p.a[1],r.height,V);
      return t0===t1?1:borner((t0-r.top)/(t0-t1));
    });
    repli.forEach(function(it,i){if(vals[i]!==null)it.a.currentTime=vals[i]*1000});   // …écritures ensuite
  }

  /* ---------------------------------------------------------- une image par salve de scroll */
  var enAttente=false,minuteurTaille=0;
  function image(){
    enAttente=false;
    var y=window.scrollY||racine.scrollTop||0;
    nav(y);progression(y);barreMobile(y);recitMaj();repliMaj(y);
    // Bas de page atteint : ce qui reste sous la ligne de déclenchement ne pourra plus monter.
    if(mouvement&&y>dernier&&y>=racine.scrollHeight-H()-2)$$('.rv:not(.vu)').forEach(function(el){var r=el.getBoundingClientRect();if((r.width||r.height)&&r.top<H())reveler(el,0)});
    dernier=y;
  }
  function demander(){if(!enAttente){enAttente=true;requestAnimationFrame(image)}}
  addEventListener('scroll',demander,{passive:true});
  addEventListener('resize',function(){clearTimeout(minuteurTaille);minuteurTaille=setTimeout(function(){evaluerEpingle();scannerRepli();demander()},160)},{passive:true});
  if(mqReduit&&mqReduit.addEventListener)mqReduit.addEventListener('change',function(e){
    if(!e.matches)return;                           // on coupe en cours de visite, on ne relance pas
    mouvement=false;natif=false;
    racine.classList.remove('mo');racine.classList.remove('mo-tl');racine.classList.remove('mo-js');
    $$('.rv').forEach(function(el){el.classList.add('vu')});
    evaluerEpingle();scannerRepli();demander();
  });
  initRecit();
  scannerRepli();
  image();

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
      else manque.textContent='';
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
