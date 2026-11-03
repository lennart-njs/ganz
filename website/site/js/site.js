/* machs.io · Startseite
   Kein Tracking, keine Cookies, keine Verbindungen zu Dritten.
   Alle Inhalte stehen im HTML. Dieses Skript steuert nur Bewegung und Bedienung. */
(function(){
  "use strict";
  var doc=document.documentElement;doc.classList.add("js");
  var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var mq=window.matchMedia("(prefers-reduced-motion: reduce)"),reduced=mq.matches;
  function setRM(){doc.classList.toggle("rm",reduced)}setRM();
  if(mq.addEventListener)mq.addEventListener("change",function(e){reduced=e.matches;setRM()});
  var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};

  function go(){requestAnimationFrame(function(){doc.classList.add("ready")})}
  if(reduced)doc.classList.add("ready");
  else if(document.fonts&&document.fonts.load){var d=false,f=function(){if(!d){d=true;go()}};document.fonts.load('700 1em "Schibsted Grotesk"').then(f,f);setTimeout(f,700)}else go();

  /* ——— Navigation: Kapsel öffnet sich ——— */
  var pill=$("#pill"),menuBtn=$("#menuBtn"),burger=$("#burger"),open=false;
  function closedW(){pill.style.width="";return pill.offsetWidth}
  var cw=0;
  function measure(){var o=open;pill.classList.remove("open");pill.style.transition="none";cw=closedW();if(o)pill.classList.add("open");pill.style.width=(typeof mini!=="undefined"&&mini?56:o?openW():cw)+"px";void pill.offsetWidth;pill.style.transition=""}
  function openW(){return window.innerWidth<=760?cw:Math.max(cw,Math.min(520,window.innerWidth-24))}
  function setOpen(v){
    open=v;pill.classList.toggle("open",v);
    pill.style.width=(v?openW():cw)+"px";
    [menuBtn,burger].forEach(function(b){b.setAttribute("aria-expanded",v?"true":"false")});
    burger.setAttribute("aria-label",v?"Menü schließen":"Menü öffnen");
    $$(".pmenu-list a").forEach(function(a,k){a.style.transitionDelay=v?(80+k*35)+"ms":"0ms";a.tabIndex=v?0:-1});
  }
  measure();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  window.addEventListener("resize",measure);
  $$(".pmenu-list a").forEach(function(a){a.tabIndex=-1});
  menuBtn.addEventListener("click",function(){setOpen(!open)});
  burger.addEventListener("click",function(){setOpen(!open)});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&open){setOpen(false);(window.innerWidth<=760?burger:menuBtn).focus()}});
  document.addEventListener("click",function(e){if(open&&!pill.contains(e.target))setOpen(false)});
  $$(".pmenu-list a").forEach(function(a){a.addEventListener("click",function(){var i=a.getAttribute("data-open");setOpen(false);if(i!==null)openRow(+i)})});

  /* ——— Navigation: beim Runterscrollen wird die Kapsel zum Zeichen „m’“ ———
     Runter: klein. Hoch oder Tippen auf das Zeichen: wieder die volle Leiste.
     Nach dem Aufklappen bleibt sie groß, bis wieder ein Stück nach unten gescrollt wird. */
  var mark=$("#pmark"),row=$(".pill-row",pill),mini=false,lastY=window.scrollY,turnY=lastY,navTick=false;
  var MINI=56,TOP=120,RUN=48;
  function setMini(v){
    if(v===mini)return;
    if(v&&open)setOpen(false);
    mini=v;pill.classList.toggle("zeichen",v);
    pill.style.width=(v?MINI:(open?openW():cw))+"px";
    row.inert=v;
    mark.tabIndex=v?0:-1;mark.setAttribute("aria-hidden",v?"false":"true");
  }
  setMini(false);mark.setAttribute("aria-hidden","true");
  function navScroll(){
    navTick=false;
    var y=Math.max(0,window.scrollY),d=y-lastY;
    if(y<TOP)setMini(false);
    else if(d<0){turnY=y;setMini(false)}
    else if(d>0&&y-turnY>RUN&&!open)setMini(true);
    if(d<0)turnY=y;
    lastY=y;
  }
  window.addEventListener("scroll",function(){if(!navTick){navTick=true;requestAnimationFrame(navScroll)}},{passive:true});
  mark.addEventListener("click",function(e){
    turnY=window.scrollY;setMini(false);
    /* Per Tastatur: Fokus auf den ersten Eintrag der Leiste */
    if(e.detail===0){var first=$(".pwm",pill);if(first)first.focus()}
  });

  /* ——— App-Beispiel im Hero: Screens stehen im HTML ——— */
  var LABELS=["Anleitung","Fachkraft","Reparatur"];
  var dScr=$$("#phone .scr");
  var rw=$("#rw"),rwEls=[].slice.call(rw.children);
  /* Reihenfolge der Wörter im HTML: Reparatur, Anleitung, Fachkraft. Reihenfolge der Screens: Anleitung, Fachkraft, Reparatur */
  var rwMap=[1,2,0];
  var dsteps=$("#dsteps");
  var dBtns=LABELS.map(function(l,i){var b=document.createElement("button");b.type="button";b.innerHTML='<span>'+l+'</span><i></i>';b.addEventListener("click",function(){show(i,true)});dsteps.appendChild(b);return b});
  var di=2,playing=!reduced,dt0=0,DUR=3400,heroVisible=true,startAt=0;
  function sizeRW(i){var el=rwEls[rwMap[i]];rw.style.width=el.offsetWidth+"px"}
  function snap(el,cls){el.style.transition="none";el.className=cls;void el.offsetWidth;el.style.transition=""}
  function show(i,user){
    if(i===di){if(user)setPlaying(false);return}
    var prev=di,fwd=user?i>prev:true;di=i;
    var inc=dScr[i],out=dScr[prev];
    dScr.forEach(function(sc,k){if(k!==i&&k!==prev){snap(sc,"scr is-next");sc.style.zIndex=0}});
    snap(inc,"scr "+(fwd?"is-next":"is-past"));
    inc.style.zIndex=fwd?2:1;out.style.zIndex=fwd?1:2;
    inc.className="scr is-on";out.className="scr "+(fwd?"is-past":"is-next");
    var wi=rwEls[rwMap[i]],wo=rwEls[rwMap[prev]];
    rwEls.forEach(function(e){if(e!==wi&&e!==wo)snap(e,"is-next")});
    snap(wi,"is-next");wi.className="is-on";wo.className="is-past";
    sizeRW(i);
    dBtns.forEach(function(b,k){b.setAttribute("aria-current",k===i?"true":"false");b.querySelector("i").style.setProperty("--p",k<i?1:0)});
    dt0=performance.now();
    if(user)setPlaying(false);
  }
  var tog=$("#dtoggle");
  function setPlaying(v){playing=v&&!reduced;tog.setAttribute("aria-pressed",playing?"false":"true");tog.querySelector("span").textContent=playing?"Anhalten":"Abspielen";tog.querySelector("svg").innerHTML=playing?'<rect x="2" y="1.5" width="2.6" height="9" rx="1"/><rect x="7.4" y="1.5" width="2.6" height="9" rx="1"/>':'<path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.8-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5Z"/>'}
  tog.addEventListener("click",function(){setPlaying(!playing)});
  function curP(){return parseFloat(dBtns[di].querySelector("i").style.getPropertyValue("--p"))||0}
  function loop(t){
    if(t<startAt){dt0=t}
    else if(playing&&heroVisible&&!document.hidden){
      var p=clamp((t-dt0)/DUR,0,1);
      dBtns[di].querySelector("i").style.setProperty("--p",p.toFixed(3));
      if(p>=1)show((di+1)%3,false);
    } else {dt0=t-curP()*DUR}
    requestAnimationFrame(loop);
  }
  dBtns.forEach(function(b,k){b.setAttribute("aria-current",k===2?"true":"false")});
  dScr[2].style.zIndex=2;
  if(reduced)setPlaying(false);
  sizeRW(2);
  startAt=performance.now()+2400;
  setTimeout(function(){if(playing&&di===2){show(0,false)}},2400);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){sizeRW(di)});
  requestAnimationFrame(loop);
  var hero=$("#top");
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){heroVisible=es[0].isIntersecting}).observe(hero);

  function phoneScale(){var w=window.innerWidth;var ps=w<520?.82:1;$(".phone-wrap").style.setProperty("--ps",ps)}
  phoneScale();

  /* ——— Aussage Wort für Wort ——— */
  var say=$("#say"),sw=[];
  function splitWords(el){el.innerHTML=el.textContent.trim().split(/\s+/).map(function(w){return '<span class="w">'+w+'</span>'}).join(" ");return $$(".w",el)}
  if(say)sw=splitWords(say);

  /* ——— Wortstapel ——— */
  var cards=$$("#card>article");
  var narrow=window.matchMedia("(max-width:860px)");
  var strack=$("#strack"),wEls=$$("#words span"),si=0;
  /* Auf schmalen Bildschirmen stehen alle Karten untereinander und bleiben für Screenreader sichtbar */
  function cardAria(){cards.forEach(function(c,k){if(narrow.matches||k===si)c.removeAttribute("aria-hidden");else c.setAttribute("aria-hidden","true")})}
  function setStation(i){if(i===si)return;si=i;wEls.forEach(function(w,k){w.classList.toggle("on",k===i)});cards.forEach(function(c,k){c.className=k===i?"":(k<i?"is-gone":"is-off")});cardAria()}
  cardAria();
  if(narrow.addEventListener)narrow.addEventListener("change",cardAria);

  /* ——— Register: Zeilen stehen im HTML ——— */
  var rows=$$("#rows>.row");
  rows.forEach(function(li,i){
    li.querySelector(".row-h").addEventListener("click",function(){openRow(li.classList.contains("open")?-1:i)});
  });
  function openRow(i){
    rows.forEach(function(li,k){var on=k===i;li.classList.toggle("open",on);li.querySelector(".row-h").setAttribute("aria-expanded",on?"true":"false");$$("a,button",li.querySelector(".row-b")).forEach(function(x){x.tabIndex=on?0:-1})});
  }
  openRow(0);

  /* ——— Beleg und Fuß ——— */
  var rwrap=$("#rwrap"),played=false,sign=$("#sign");

  /* ——— Scroll ——— */
  var ticking=false;
  function onScroll(){
    ticking=false;var vh=window.innerHeight;
    /* Aussage */
    if(say){var r=say.getBoundingClientRect();var p=clamp((vh*.86-r.top)/(r.height+vh*.4),0,1);var n=Math.round(p*sw.length);
    sw.forEach(function(w,k){w.classList.toggle("on",reduced||k<n)})}
    /* Stapel */
    if(!narrow.matches){var tr=strack.getBoundingClientRect();var q=clamp(-tr.top/(tr.height-vh),0,1);setStation(Math.min(2,Math.floor(q*3*.999)))}
    /* Telefon hebt sich */
    var hr=hero.getBoundingClientRect();$(".phone-wrap").style.setProperty("--rise",(reduced?0:clamp(-hr.top*.18,-120,0)).toFixed(1)+"px");
    /* Beleg */
    if(!played&&rwrap.getBoundingClientRect().top<vh*.78){played=true;if(!reduced)rwrap.classList.add("play")}
    if(sign.getBoundingClientRect().top<vh*.9)sign.classList.add("in");
  }
  window.addEventListener("scroll",function(){if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});
  window.addEventListener("resize",function(){phoneScale();sizeRW(di);onScroll()});
  onScroll();

  /* ——— Knopf-Beschriftungen: beide Breiten messen, damit der Knopf beim Wechsel mitwächst ——— */
  function sizeLabels(){
    $$(".btn .lbl").forEach(function(l){
      var sp=l.children;if(sp.length<2)return;
      l.style.removeProperty("--w0");l.style.removeProperty("--w1");
      var w0=Math.ceil(sp[0].getBoundingClientRect().width),w1=Math.ceil(sp[1].getBoundingClientRect().width);
      if(!w0||!w1)return;
      /* Stehen mehrere Knöpfe nebeneinander, bleibt die Breite gleich, damit der Nachbar nicht springt */
      if(l.closest(".ctas")){var m=Math.max(w0,w1);w0=w1=m;l.style.justifyItems="center"}
      l.style.setProperty("--w0",w0+"px");l.style.setProperty("--w1",w1+"px");
    });
  }
  sizeLabels();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(sizeLabels);
  window.addEventListener("resize",sizeLabels);

  /* ——— Kopieren ——— */
  var cp=$("#copy"),cl=$("#copyL"),tmo;
  function done(ok){cp.classList.add("done");cl.textContent=ok?"Kopiert":"Markiert";clearTimeout(tmo);tmo=setTimeout(function(){cp.classList.remove("done");cl.textContent="Kopieren"},2400)}
  function sel(){var r=document.createRange();r.selectNodeContents($("#addr"));var s=window.getSelection();s.removeAllRanges();s.addRange(r);done(false)}
  cp.addEventListener("click",function(){try{navigator.clipboard.writeText("hallo@machs.io").then(function(){done(true)},sel)}catch(e){sel()}});
})();
