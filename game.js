(() => {
  "use strict";

  const TYPES = ["steel","ember","tide","aether","bloom","void"];
  const LABEL = {steel:"ACERO",ember:"BRASA",tide:"MAREA",aether:"ÉTER",bloom:"BROTE",void:"VACÍO"};
  const COLOR = {steel:"#9fc8ff",ember:"#ff927d",tide:"#64e8ff",aether:"#bb89ff",bloom:"#7ff0bf",void:"#ff74c4"};
  const ENEMIES = [
    ["Devorador de Umbra","RIFT BEAST"],["Custodio de Vidrio","SENTINEL"],
    ["Hidra Prismática","FRACTAL SPAWN"],["Caballero Hueco","VOIDBOUND"],
    ["Oráculo Inverso","PARADOX"]
  ];
  const RELICS = [
    {id:"echo",icon:"⚔",rarity:"ÉPICA",name:"Forja de Eco",text:"Las cadenas de ACERO de 4+ repiten el 55% del daño."},
    {id:"ash",icon:"✦",rarity:"RARÍSIMA",name:"Jardín de Ceniza",text:"BROTE también carga a Lyra. Su suprema cura al grupo."},
    {id:"mirror",icon:"◈",rarity:"ÉPICA",name:"Espejo de Marea",text:"El 35% del daño absorbido por barrera rebota al enemigo."},
    {id:"lens",icon:"◉",rarity:"LEGENDARIA",name:"Lente del Vacío",text:"VACÍO puede hacer crítico x2.4 y rompe escudo."},
    {id:"pulse",icon:"✧",rarity:"ÉPICA",name:"Pulso de Éter",text:"ÉTER carga energía adicional a todo el escuadrón."},
    {id:"cascade",icon:"∞",rarity:"LEGENDARIA",name:"Corazón de Cascada",text:"Cada cascada aumenta aún más el multiplicador de daño."},
    {id:"triune",icon:"△",rarity:"CÓSMICA",name:"Juramento Trino",text:"Las cadenas de 5+ cargan a todos y generan una onda de choque."},
    {id:"phoenix",icon:"♢",rarity:"CÓSMICA",name:"Hilo Fénix",text:"El primer héroe caído revive al 45% y lanza su suprema."}
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const rand = n => Math.floor(Math.random()*n);

  const el = {
    app:$("#app"),board:$("#board"),room:$("#room"),aether:$("#aether"),relicCount:$("#relicCount"),
    combo:$("#combo"),sync:$("#sync"),mission:$("#mission"),relics:$("#relics"),turn:$("#turn"),chain:$("#chain"),tip:$("#tip"),
    enemy:$("#enemy"),enemyName:$("#enemyName"),enemyTier:$("#enemyTier"),enemyHp:$("#enemyHp"),enemyShield:$("#enemyShield"),
    enemyHpText:$("#enemyHpText"),enemyTurn:$("#enemyTurn"),intent:$("#intent"),
    intro:$("#intro"),relicModal:$("#relicModal"),relicChoices:$("#relicChoices"),
    pauseModal:$("#pauseModal"),settingsModal:$("#settingsModal"),codexModal:$("#codexModal"),defeatModal:$("#defeatModal"),
    toast:$("#toast"),fx:$("#fxLayer"),defeatText:$("#defeatText"),
    pRoom:$("#pRoom"),pAether:$("#pAether"),pChain:$("#pChain")
  };

  const loadSettings = () => {
    try { return Object.assign({audio:true,particles:true,motion:false}, JSON.parse(localStorage.getItem("riftweave.settings")) || {}); }
    catch { return {audio:true,particles:true,motion:false}; }
  };
  const loadMeta = () => {
    try { return Object.assign({bestRoom:1,runs:0,shards:0}, JSON.parse(localStorage.getItem("riftweave.meta")) || {}); }
    catch { return {bestRoom:1,runs:0,shards:0}; }
  };
  let settings = loadSettings();
  let meta = loadMeta();
  let audio = null;
  let toastTimer = null;

  function freshState(){
    return {
      grid:[],selected:null,locked:false,room:1,turn:1,aether:0,sync:0,combo:1,bestChain:0,relics:[],shield:0,phoenixUsed:false,
      heroes:{
        kael:{hp:100,max:100,energy:0,alive:true},
        lyra:{hp:88,max:88,energy:0,alive:true},
        nyx:{hp:108,max:108,energy:0,alive:true}
      },
      enemy:{hp:300,max:300,shield:0,maxShield:0,countdown:3,boss:false,name:"",tier:""}
    };
  }
  let state=freshState();

  function saveSettings(){
    localStorage.setItem("riftweave.settings",JSON.stringify(settings));
    document.body.classList.toggle("reduce-motion",settings.motion);
    document.body.classList.toggle("no-particles",!settings.particles);
    if(audio) audio.master.gain.value=settings.audio ? .22 : 0;
  }
  function saveMeta(){ localStorage.setItem("riftweave.meta",JSON.stringify(meta)); }

  function initAudio(){
    if(audio) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    const ctx=new AC(), master=ctx.createGain(), pad=ctx.createGain(), filter=ctx.createBiquadFilter();
    master.gain.value=settings.audio ? .22 : 0; master.connect(ctx.destination);
    pad.gain.value=.042; pad.connect(master); filter.type="lowpass"; filter.frequency.value=430; filter.connect(pad);
    [55,82.41].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i?"sine":"triangle";o.frequency.value=f;g.gain.value=i?.22:.35;o.connect(g);g.connect(filter);o.start();});
    audio={ctx,master};
  }
  function sfx(kind,power=1){
    if(!settings.audio) return;
    initAudio(); if(!audio) return;
    if(audio.ctx.state==="suspended") audio.ctx.resume();
    const cfg={
      click:[260,420,.04,"sine"],match:[430,780,.09,"triangle"],hit:[120,52,.12,"sawtooth"],
      cast:[330,930,.19,"sine"],heal:[520,760,.22,"sine"],reward:[520,1040,.3,"triangle"],boss:[72,34,.28,"sawtooth"],fail:[190,74,.35,"sawtooth"]
    }[kind]||[300,500,.08,"sine"];
    const {ctx,master}=audio, now=ctx.currentTime, o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type=cfg[3];o.frequency.setValueAtTime(cfg[0],now);o.frequency.exponentialRampToValueAtTime(Math.max(20,cfg[1]),now+cfg[2]);
    f.type="lowpass";f.frequency.value=1800;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.08*power,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+cfg[2]);
    o.connect(f);f.connect(g);g.connect(master);o.start(now);o.stop(now+cfg[2]+.03);
  }

  function makeGrid(){
    const g=[];
    for(let i=0;i<49;i++){
      let t;
      do t=TYPES[rand(TYPES.length)];
      while((i%7>=2&&g[i-1]===t&&g[i-2]===t)||(i>=14&&g[i-7]===t&&g[i-14]===t));
      g.push(t);
    }
    state.grid=g;
  }
  function adjacent(a,b){
    const ar=Math.floor(a/7),ac=a%7,br=Math.floor(b/7),bc=b%7;
    return Math.abs(ar-br)+Math.abs(ac-bc)===1;
  }
  function findMatches(){
    const hits=new Set();
    for(let r=0;r<7;r++){
      let start=0;
      for(let c=1;c<=7;c++){
        const prev=state.grid[r*7+c-1],cur=c<7?state.grid[r*7+c]:null;
        if(cur!==prev){if(prev&&c-start>=3)for(let k=start;k<c;k++)hits.add(r*7+k);start=c;}
      }
    }
    for(let c=0;c<7;c++){
      let start=0;
      for(let r=1;r<=7;r++){
        const prev=state.grid[(r-1)*7+c],cur=r<7?state.grid[r*7+c]:null;
        if(cur!==prev){if(prev&&r-start>=3)for(let k=start;k<r;k++)hits.add(k*7+c);start=r;}
      }
    }
    return hits;
  }
  function renderGrid(falling=false){
    el.board.innerHTML="";
    state.grid.forEach((type,i)=>{
      const b=document.createElement("button");
      b.type="button";b.className="tile "+type+(state.selected===i?" selected":"")+(falling?" fall":"");
      b.dataset.i=i;b.setAttribute("role","gridcell");b.setAttribute("aria-label",LABEL[type]);
      b.innerHTML='<span class="glyph" aria-hidden="true"></span>';
      b.addEventListener("click",()=>tileClick(i));
      el.board.appendChild(b);
    });
    el.board.classList.toggle("locked",state.locked);
  }
  async function tileClick(i){
    if(state.locked) return;
    sfx("click",.45);
    if(state.selected===null){state.selected=i;renderGrid();return;}
    if(state.selected===i){state.selected=null;renderGrid();return;}
    if(!adjacent(state.selected,i)){state.selected=i;renderGrid();return;}
    const a=state.selected;state.selected=null;state.locked=true;
    [state.grid[a],state.grid[i]]=[state.grid[i],state.grid[a]];renderGrid();
    await sleep(settings.motion?20:110);
    let matches=findMatches();
    if(!matches.size){
      [state.grid[a],state.grid[i]]=[state.grid[i],state.grid[a]];
      state.locked=false;renderGrid();toast("Ese intercambio no crea ninguna cadena.");return;
    }
    state.turn++;state.enemy.countdown--;
    await resolve(matches);
    if(state.enemy.hp<=0){await roomClear();return;}
    if(state.enemy.countdown<=0) await enemyAttack();
    state.locked=false;renderGrid();updateUI();
  }
  async function resolve(matches){
    let cascade=0;
    while(matches.size&&state.enemy.hp>0){
      cascade++;state.bestChain=Math.max(state.bestChain,cascade);
      state.combo=1+(cascade-1)*(.35+(hasRelic("cascade")?.28:0));
      state.sync=clamp(state.sync+matches.size*2.6+cascade*3,0,100);
      el.chain.textContent=cascade>1?"x"+cascade:"LINK";
      el.combo.textContent="x"+state.combo.toFixed(2);el.sync.style.width=state.sync+"%";
      const tiles=$$(".tile");matches.forEach(i=>tiles[i]?.classList.add("match"));
      sfx("match",clamp(.55+cascade*.1,.55,1.25));
      await sleep(settings.motion?35:230);
      const counts={};matches.forEach(i=>counts[state.grid[i]]=(counts[state.grid[i]]||0)+1);
      await applyEffects(counts,matches.size,cascade);
      if(state.enemy.hp<=0) break;
      matches.forEach(i=>state.grid[i]=null);collapse();renderGrid(true);
      await sleep(settings.motion?25:210);matches=findMatches();
    }
    el.tip.textContent=cascade>1?"CASCADA x"+cascade+" — la sincronía potencia toda la resolución.":"Cadena confirmada. Las combinaciones largas cargan supremas.";
    updateUI();
  }
  function collapse(){
    for(let c=0;c<7;c++){
      const vals=[];for(let r=6;r>=0;r--){const v=state.grid[r*7+c];if(v)vals.push(v);}
      for(let r=6;r>=0;r--)state.grid[r*7+c]=vals[6-r]||TYPES[rand(TYPES.length)];
    }
  }
  function hasRelic(id){return state.relics.includes(id);}
  function addEnergy(name,n){const h=state.heroes[name];if(h.alive)h.energy=clamp(h.energy+n,0,100);}
  async function applyEffects(c,total,cascade){
    const mult=state.combo*(1+state.sync/260);
    if(c.steel){const dmg=Math.round(c.steel*7*mult);await heroHit("kael",dmg,COLOR.steel);addEnergy("kael",c.steel*9);if(c.steel>=4&&hasRelic("echo")&&state.enemy.hp>0){await sleep(90);await heroHit("kael",Math.round(dmg*.55),"#dff4ff","ECO");}}
    if(c.ember&&state.enemy.hp>0){await heroHit("lyra",Math.round(c.ember*6.6*mult),COLOR.ember);addEnergy("lyra",c.ember*10);}
    if(c.tide){const n=Math.round(c.tide*5.5*(1+cascade*.12));state.shield=Math.min(100,state.shield+n);addEnergy("nyx",c.tide*8);floatNum($('[data-hero="nyx"]'),"+"+n+" BARRERA",COLOR.tide);burst($('[data-hero="nyx"]'),COLOR.tide,10);}
    if(c.bloom){healParty(Math.round(c.bloom*3.6));addEnergy("nyx",c.bloom*7);if(hasRelic("ash"))addEnergy("lyra",c.bloom*8);}
    if(c.aether){const gain=c.aether*(hasRelic("pulse")?14:7);Object.keys(state.heroes).forEach(h=>addEnergy(h,gain));state.aether+=c.aether;floatNum(el.board,"+"+c.aether+" ÉTER",COLOR.aether);}
    if(c.void&&state.enemy.hp>0){let dmg=Math.round(c.void*8*mult),label="RUPTURA";if(hasRelic("lens")&&Math.random()<.35){dmg=Math.round(dmg*2.4);label="CRÍTICO";}if(hasRelic("lens"))state.enemy.shield=Math.max(0,state.enemy.shield-12);damageEnemy(dmg,COLOR.void,label);}
    if(total>=5&&hasRelic("triune")&&state.enemy.hp>0){Object.keys(state.heroes).forEach(h=>addEnergy(h,18));damageEnemy(20+state.room*2,"#fff0bb","ONDA TRINA");flash();}
    for(const name of ["kael","lyra","nyx"])if(state.heroes[name].energy>=100&&state.heroes[name].alive&&state.enemy.hp>0)await ultimate(name);
  }
  async function heroHit(name,dmg,color,label=""){
    if(!state.heroes[name].alive||state.enemy.hp<=0)return;
    const hero=$('[data-hero="'+name+'"]');hero.classList.remove("attack");void hero.offsetWidth;hero.classList.add("attack");
    await sleep(settings.motion?15:100);damageEnemy(dmg,color,label||"-"+dmg);burst(el.enemy,color,13);sfx("hit",clamp(.65+dmg/100,.65,1.15));shake(dmg>35);
  }
  function damageEnemy(amount,color,label){
    let dmg=amount;
    if(state.enemy.shield>0){const blocked=Math.min(state.enemy.shield,dmg);state.enemy.shield-=blocked;dmg-=blocked;}
    state.enemy.hp=Math.max(0,state.enemy.hp-dmg);
    el.enemy.classList.remove("hit");void el.enemy.offsetWidth;el.enemy.classList.add("hit");
    floatNum(el.enemy,label.startsWith("-")?label:"-"+amount+" "+label,color);updateUI();
  }
  async function ultimate(name){
    const h=state.heroes[name];h.energy=0;const hero=$('[data-hero="'+name+'"]');
    hero.classList.remove("cast");void hero.offsetWidth;hero.classList.add("cast");sfx("cast",1.1);
    const color=name==="kael"?"#a8ecff":name==="lyra"?"#ff7c9e":"#7cf2c6";burst(hero,color,25);
    toast(name==="kael"?"KAEL • FRACTURA VECTORIAL":name==="lyra"?"LYRA • SUPERNOVA DE CENIZA":"NYX • MANTO DE AURORA");
    await sleep(settings.motion?45:290);
    if(name==="kael"){state.enemy.shield=0;damageEnemy(42+Math.round(state.room*2.5),color,"FRACTURA");}
    if(name==="lyra"){damageEnemy(35+Math.round(state.room*2.1),color,"SUPERNOVA");if(hasRelic("ash"))healParty(8);}
    if(name==="nyx"){state.shield=Math.min(100,state.shield+34);healParty(12);floatNum(hero,"AURORA +34",color);}
    flash();updateUI();
  }
  function healParty(n){
    for(const [name,h] of Object.entries(state.heroes)){if(!h.alive)continue;h.hp=clamp(h.hp+n,0,h.max);floatNum($('[data-hero="'+name+'"]'),"+"+n,COLOR.bloom);}
    sfx("heal",.7);updateUI();
  }
  async function enemyAttack(){
    if(state.enemy.hp<=0)return;
    state.enemy.countdown=state.enemy.boss?2:3;el.enemy.classList.remove("strike");void el.enemy.offsetWidth;el.enemy.classList.add("strike");el.intent.textContent=state.enemy.boss?"ANIQUILACIÓN":"IMPACTO INMINENTE";sfx(state.enemy.boss?"boss":"hit",1);
    await sleep(settings.motion?35:240);
    let base=Math.round(12+state.room*2.4+(state.enemy.boss?8:0)),absorbed=Math.min(state.shield,base);state.shield-=absorbed;base-=absorbed;
    if(absorbed&&hasRelic("mirror"))damageEnemy(Math.round(absorbed*.35),COLOR.tide,"REFLEJO");
    for(const [name,h] of Object.entries(state.heroes).filter(([,v])=>v.alive)){
      const dmg=Math.max(1,Math.round(base*(.75+Math.random()*.45)));h.hp=Math.max(0,h.hp-dmg);
      const hero=$('[data-hero="'+name+'"]');hero.classList.remove("hurt");void hero.offsetWidth;hero.classList.add("hurt");floatNum(hero,"-"+dmg,"#ff6d85");
      if(h.hp<=0)await downHero(name);
    }
    shake(true);updateUI();el.intent.textContent="PREPARANDO ATAQUE";
    if(Object.values(state.heroes).every(h=>!h.alive))await defeat();
  }
  async function downHero(name){
    const h=state.heroes[name];
    if(hasRelic("phoenix")&&!state.phoenixUsed){state.phoenixUsed=true;h.hp=Math.round(h.max*.45);h.alive=true;toast("HILO FÉNIX • "+name.toUpperCase()+" REGRESA");await ultimate(name);return;}
    h.alive=false;$('[data-hero="'+name+'"]').classList.add("down");toast(name.toUpperCase()+" HA CAÍDO");
  }

  function makeEnemy(){
    const boss=state.room%5===0, info=ENEMIES[(state.room-1)%ENEMIES.length];
    const max=Math.round((205+state.room*74)*(boss?2.15:1)),shield=boss?Math.round(max*.14):(state.room>2?Math.round(max*.05):0);
    state.enemy={hp:max,max,shield,maxShield:shield,countdown:boss?2:3,boss,name:boss?"ARCONTE DE LA GRIETA":info[0],tier:boss?"BOSS • FASE I":info[1]};
    el.enemy.classList.toggle("boss",boss);el.mission.textContent=boss?"Derrota al Arconte antes del colapso":"Rompe la defensa de "+state.enemy.name;updateUI();
  }
  async function roomClear(){
    state.locked=true;el.intent.textContent="FRACTURA ESTABILIZADA";sfx("reward",1.05);burst(el.enemy,"#ffd58b",34);flash();
    state.aether+=10+state.room*2;meta.bestRoom=Math.max(meta.bestRoom,state.room);meta.shards+=3+Math.floor(state.room/2);saveMeta();
    await sleep(settings.motion?60:620);showRelicChoices();
  }
  function showRelicChoices(){
    const pool=RELICS.filter(r=>!state.relics.includes(r.id)).sort(()=>Math.random()-.5).slice(0,3);
    if(!pool.length){state.room++;nextRoom();return;}
    el.relicChoices.innerHTML="";
    pool.forEach(r=>{const b=document.createElement("button");b.type="button";b.className="relic-choice";b.innerHTML="<i>"+r.icon+"</i><small>"+r.rarity+"</small><b>"+r.name+"</b><p>"+r.text+"</p>";b.addEventListener("click",()=>chooseRelic(r));el.relicChoices.appendChild(b);});
    el.relicModal.classList.add("active");
  }
  function chooseRelic(r){state.relics.push(r.id);el.relicModal.classList.remove("active");sfx("reward",1);toast("RELIQUIA • "+r.name.toUpperCase());state.room++;state.sync=Math.max(0,state.sync-20);nextRoom();}
  function nextRoom(){Object.values(state.heroes).forEach(h=>{if(h.alive)h.hp=Math.min(h.max,h.hp+Math.round(h.max*.13));});state.shield=Math.min(40,state.shield+8);makeEnemy();makeGrid();state.locked=false;renderGrid();renderRelics();updateUI();}
  function renderRelics(){el.relics.innerHTML="";state.relics.forEach(id=>{const r=RELICS.find(x=>x.id===id),d=document.createElement("div");d.className="relic-token";d.innerHTML="<b>"+r.icon+" "+r.name+"</b><span>"+r.rarity+"</span>";el.relics.appendChild(d);});}

  function updateUI(){
    el.room.textContent=String(state.room).padStart(2,"0");el.aether.textContent=state.aether;el.relicCount.textContent=state.relics.length;el.turn.textContent="TURNO "+state.turn;el.combo.textContent="x"+state.combo.toFixed(2);el.sync.style.width=state.sync+"%";
    el.enemyName.textContent=state.enemy.name;el.enemyTier.textContent=state.enemy.tier;el.enemyHp.style.width=(state.enemy.hp/state.enemy.max*100)+"%";el.enemyShield.style.width=(state.enemy.maxShield?state.enemy.shield/state.enemy.maxShield*100:0)+"%";el.enemyHpText.textContent=Math.ceil(state.enemy.hp)+" / "+state.enemy.max;el.enemyTurn.textContent="ATACA EN "+state.enemy.countdown;
    for(const [name,h] of Object.entries(state.heroes)){$("#"+name+"Hp").style.width=(h.hp/h.max*100)+"%";$("#"+name+"Energy").style.width=h.energy+"%";}
    el.pRoom.textContent=state.room;el.pAether.textContent=state.aether;el.pChain.textContent=state.bestChain;
  }
  function startRun(){
    initAudio();state=freshState();makeGrid();makeEnemy();renderGrid();renderRelics();$$(".fighter").forEach(x=>x.classList.remove("down"));el.intro.classList.remove("active");state.locked=false;updateUI();toast("RIFT ABIERTO • TEJE TU PRIMERA CADENA");sfx("reward",.8);
  }
  async function defeat(){
    state.locked=true;renderGrid();sfx("fail",1);meta.runs++;meta.bestRoom=Math.max(meta.bestRoom,state.room);meta.shards+=Math.floor(state.room*1.5);saveMeta();
    await sleep(settings.motion?40:450);el.defeatText.textContent="Sala "+state.room+" • "+state.aether+" Éter • Cascada máxima x"+state.bestChain;el.defeatModal.classList.add("active");
  }

  function floatNum(target,text,color){
    const r=target.getBoundingClientRect(),d=document.createElement("div");d.className="float";d.textContent=text;d.style.color=color;d.style.left=(r.left+r.width/2-24)+"px";d.style.top=(r.top+r.height*.35)+"px";el.fx.appendChild(d);setTimeout(()=>d.remove(),900);
  }
  function burst(target,color,count=12){
    if(!settings.particles)return;const r=target.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    for(let i=0;i<count;i++){const p=document.createElement("i");p.className="spark";p.style.color=color;p.style.left=cx+"px";p.style.top=cy+"px";const a=Math.random()*Math.PI*2,dist=25+Math.random()*80;p.style.setProperty("--dx",Math.cos(a)*dist+"px");p.style.setProperty("--dy",Math.sin(a)*dist+"px");el.fx.appendChild(p);setTimeout(()=>p.remove(),700);}
  }
  function shake(strong=false){if(settings.motion)return;el.app.classList.remove("shake");void el.app.offsetWidth;el.app.classList.add("shake");setTimeout(()=>el.app.classList.remove("shake"),260);if(strong&&navigator.vibrate)navigator.vibrate([20,18,25]);}
  function flash(){if(settings.motion)return;const f=document.createElement("div");f.className="flash";document.body.appendChild(f);setTimeout(()=>f.remove(),170);}
  function toast(msg){el.toast.textContent=msg;el.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.toast.classList.remove("show"),1750);}

  // Ambient starfield
  const canvas=$("#stars"),ctx=canvas.getContext("2d");let stars=[];
  function resizeStars(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:Math.min(120,Math.floor(innerWidth*innerHeight/9000))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:.35+Math.random(),s:.04+Math.random()*.16,a:.15+Math.random()*.5}));}
  function drawStars(t){ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of stars){if(!settings.motion)s.y+=s.s;if(s.y>innerHeight+3)s.y=-3;ctx.globalAlpha=s.a*(.75+.25*Math.sin(t*.001+s.x));ctx.fillStyle="#c6ebff";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(drawStars);}
  addEventListener("resize",resizeStars);resizeStars();requestAnimationFrame(drawStars);

  // UI wiring
  $("#start").addEventListener("click",startRun);
  $("#pause").addEventListener("click",()=>{state.locked=true;renderGrid();updateUI();el.pauseModal.classList.add("active");});
  $("#resume").addEventListener("click",()=>{el.pauseModal.classList.remove("active");state.locked=false;renderGrid();});
  $("#settingsOpen").addEventListener("click",()=>{el.pauseModal.classList.remove("active");el.settingsModal.classList.add("active");});
  $("#settingsClose").addEventListener("click",()=>{el.settingsModal.classList.remove("active");el.pauseModal.classList.add("active");});
  $("#codexOpen").addEventListener("click",()=>el.codexModal.classList.add("active"));
  $("#codexClose").addEventListener("click",()=>el.codexModal.classList.remove("active"));
  $("#abandon").addEventListener("click",()=>{el.pauseModal.classList.remove("active");defeat();});
  $("#retry").addEventListener("click",()=>{el.defeatModal.classList.remove("active");startRun();});

  const audioToggle=$("#audioToggle"),particleToggle=$("#particleToggle"),motionToggle=$("#motionToggle");
  audioToggle.checked=settings.audio;particleToggle.checked=settings.particles;motionToggle.checked=settings.motion;
  audioToggle.addEventListener("change",()=>{settings.audio=audioToggle.checked;saveSettings();if(settings.audio)initAudio();});
  particleToggle.addEventListener("change",()=>{settings.particles=particleToggle.checked;saveSettings();});
  motionToggle.addEventListener("change",()=>{settings.motion=motionToggle.checked;saveSettings();});
  saveSettings();

  makeGrid();makeEnemy();renderGrid();updateUI();
})();