(() => {
  'use strict';
  const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),frame=document.querySelector('.world-frame');
  const $=id=>document.getElementById(id);
  const ui={sap:$('sapText'),income:$('incomeText'),health:$('healthText'),healthFill:$('healthFill'),healthStatus:$('healthStatus'),tileCount:$('tileCount'),waveTitle:$('waveTitle'),waveHint:$('waveHint'),waveBtn:$('waveBtn'),waveProgress:$('waveProgress'),clock:$('clock'),moduleTitle:$('moduleTitle'),moduleDesc:$('moduleDesc'),toast:$('toast'),pause:$('pauseBtn'),modal:$('modal'),modalTitle:$('modalTitle'),modalEyebrow:$('modalEyebrow'),modalCopy:$('modalCopy'),modalAction:$('modalAction')};
  const TW=48,TH=25,MAX_WAVE=5;
  const kinds={
    core:{name:'Heartwood',cost:0,hp:100,income:0,color:'#a9bd79',side:'#65734c',glow:'#bacd79',height:2},
    stem:{name:'Stem',cost:1,hp:24,income:0,color:'#839c66',side:'#465941',glow:'#b1c88a',height:1},
    leaf:{name:'Leaf',cost:2,hp:14,income:.55,color:'#85b984',side:'#477455',glow:'#a6dc9c',height:1},
    root:{name:'Root',cost:2,hp:43,income:0,color:'#a78365',side:'#66503f',glow:'#d5b08c',height:1},
    bloom:{name:'Bloom',cost:4,hp:22,income:0,color:'#d5a26d',side:'#795c43',glow:'#f3c58a',height:2},
    glyph:{name:'Glyph',cost:5,hp:20,income:0,color:'#a998ce',side:'#645c84',glow:'#cab9f1',height:2}
  };
  let W=1,H=1,dpr=1,zoom=1,camX=0,camY=20,selected='stem',sap=12,health=100,time=0,elapsed=0,paused=false,ended=false,won=false;
  let wave=0,waveActive=false,spawnLeft=0,spawnTimer=0,quietTimer=14,last=0,toastTimer=0,ghostCell=null,drag=null;
  const tiles=new Map(),enemies=[],shots=[],particles=[],floats=[],pointers=new Map();
  let pinch=null;
  let randomSeed=9173;const rand=()=>{randomSeed=(randomSeed*16807)%2147483647;return(randomSeed-1)/2147483646};
  const key=(x,y)=>`${x},${y}`,parse=k=>k.split(',').map(Number),get=(x,y)=>tiles.get(key(x,y));
  const neighbors=(x,y)=>{const a=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy)a.push([x+dx,y+dy]);return a};
  const core={x:0,y:0,type:'core',hp:100,maxHp:100,z:0};tiles.set(key(0,0),core);
  function resize(){const r=frame.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=`${W}px`;canvas.style.height=`${H}px`;ctx.setTransform(dpr,0,0,dpr,0,0)}
  new ResizeObserver(resize).observe(frame);resize();
  function project(x,y,z=0){return{x:W/2+camX+(x-y)*TW*.5*zoom,y:H/2+camY+(x+y)*TH*.5*zoom-z*9*zoom}}
  function unproject(sx,sy){const dx=(sx-W/2-camX)/(TW*.5*zoom),dy=(sy-H/2-camY)/(TH*.5*zoom);return{x:Math.round((dx+dy)/2),y:Math.round((dy-dx)/2)}}
  function cellOnScreen(x,y){const p=project(x,y);return p.x>-80&&p.x<W+80&&p.y>-80&&p.y<H+80}
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');toastTimer=2.1}
  function setSelected(type){selected=type;document.querySelectorAll('.build-option').forEach(b=>{const on=b.dataset.type===type;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))})}
  function place(x,y,z=0){
    if(ended||paused)return;
    if(Math.abs(x)>14||Math.abs(y)>14){showToast('THE GARDEN CANNOT ROOT THAT FAR');return}
    if(get(x,y)){showToast('THIS CELL IS ALREADY ALIVE');return}
    if(!neighbors(x,y).some(([a,b])=>get(a,b))){showToast('GROW FROM A TOUCHING CELL');return}
    const kind=kinds[selected];if(sap<kind.cost){showToast('NOT ENOUGH LUMEN SAP');return}
    sap-=kind.cost;tiles.set(key(x,y),{x,y,type:selected,hp:kind.hp,maxHp:kind.hp,z:z?1:0,attack:rand()*0.8});
    addFloat(x,y,`−${kind.cost} ✦`,kind.glow);particles.push({x,y,life:.8,max:.8,color:kind.glow});updateModules();
  }
  function updateModules(){
    const seen=new Set(),clusters=[];
    for(const t of tiles.values())if(t.type!=='core'&&!seen.has(key(t.x,t.y))){const q=[t],cluster=[];seen.add(key(t.x,t.y));while(q.length){const a=q.pop();cluster.push(a);for(const [x,y] of neighbors(a.x,a.y)){const k=key(x,y),n=get(x,y);if(n&&n.type!=='core'&&!seen.has(k)){seen.add(k);q.push(n)}}}if(cluster.length>=3)clusters.push(cluster)}
    if(!clusters.length){ui.moduleTitle.textContent=tiles.size===1?'A seed, alone':'Growing in quiet';ui.moduleDesc.textContent='Join three or more forms to awaken a living module.';return}
    const largest=clusters.sort((a,b)=>b.length-a.length)[0],counts={};largest.forEach(t=>counts[t.type]=(counts[t.type]||0)+1);const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
    const names={stem:['A rising trunk','An upright module, made to reach.'],leaf:['A bright canopy','A living crown that gathers sap.'],root:['A deep taproot','A stubborn anchor beneath the garden.'],bloom:['A watchful bloom','Its petals answer the dark with fire.'],glyph:['A listening glyph','A strange pattern, humming with old power.']};
    const mixed=Object.keys(counts).length>1;ui.moduleTitle.textContent=mixed?`A ${largest.length}-fold grove`:names[dominant][0];ui.moduleDesc.textContent=mixed?'Different forms have joined into something new.':names[dominant][1];
  }
  function addFloat(x,y,text,color='#e7eddf'){floats.push({x,y,text,color,life:1,max:1})}
  function spawnEnemy(){const side=Math.floor(rand()*4),d=8+Math.floor(rand()*4);let x=0,y=0;if(side===0){x=-d;y=Math.floor(rand()*9)-4}else if(side===1){x=d;y=Math.floor(rand()*9)-4}else if(side===2){y=-d;x=Math.floor(rand()*9)-4}else{y=d;x=Math.floor(rand()*9)-4}
    const hp=23+wave*5;enemies.push({x,y,hp,maxHp:hp,stepTimer:.45+rand()*.6,attackTimer:.1,hit:0,seed:rand()*10});particles.push({x,y,life:.7,max:.7,color:'#b66b76'})}
  function startWave(){if(ended||paused||waveActive||wave>=MAX_WAVE)return;wave++;waveActive=true;spawnLeft=2+wave*2+Math.floor(Math.max(0,tiles.size-1)/5);spawnTimer=.1;showToast(`WAVE ${String(wave).padStart(2,'0')} · THE DARK STIRS`);}
  function damageTile(tile,amount){tile.hp-=amount;tile.flash=.16;addFloat(tile.x,tile.y,`−${Math.ceil(amount)}`,tile.type==='core'?'#ff9b83':'#e4b491');if(tile.hp<=0){tiles.delete(key(tile.x,tile.y));particles.push({x:tile.x,y:tile.y,life:1,max:1,color:'#ca8c6e'});updateModules();if(tile.type==='core')finish(false)}}
  function finish(victory){ended=true;won=victory;paused=false;ui.modal.classList.remove('hidden');ui.modalEyebrow.textContent=victory?'A GARDEN REMEMBERS · 05':'THE VOID WENT QUIET';ui.modalTitle.innerHTML=victory?'You made a<br><em>living world.</em>':'The heartwood<br><em>has fallen.</em>';ui.modalCopy.innerHTML=victory?`<p>Five waves came to pull your garden apart. It held. Your little world has become a home in the dark.</p><p><b>${tiles.size} forms</b> took root. No two gardens grow alike.</p>`:`<p>The dark found its way to the heartwood. Every fallen form made the garden a little less alone.</p><p>Begin again. Try a deeper root, or let your blooms meet the dark sooner.</p>`;ui.modalAction.textContent='GROW ANOTHER WORLD  ↗';}
  function update(dt){
    if(paused||ended)return;time+=dt;elapsed+=dt;sap=Math.min(999,sap+dt*(.16+[...tiles.values()].reduce((s,t)=>s+kinds[t.type].income,0)));
    if(!waveActive){quietTimer-=dt;if(quietTimer<=0)startWave()}
    else{if(spawnLeft>0){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=1.15}}if(spawnLeft===0&&enemies.length===0){waveActive=false;if(wave>=MAX_WAVE)finish(true);else{quietTimer=11;showToast(`WAVE ${wave} HELD · THE GARDEN BREATHES`)}}}
    for(const t of tiles.values())if(t.type==='bloom'){t.attack-=dt;if(t.attack<=0){let target=null,best=6.01;for(const e of enemies){const d=Math.hypot(e.x-t.x,e.y-t.y);if(d<best){best=d;target=e}}if(target){shots.push({x:t.x,y:t.y,to:target,life:.2,max:.2});target.hp-=11;target.hit=.16;particles.push({x:target.x,y:target.y,life:.22,max:.22,color:'#ffd18b'});if(target.hp<=0){enemies.splice(enemies.indexOf(target),1);sap=Math.min(999,sap+1.6);addFloat(target.x,target.y,'+1.6 ✦','#d5e59b');particles.push({x:target.x,y:target.y,life:.8,max:.8,color:'#d5c18b'})}t.attack=1.05}}}
    for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.hit=Math.max(0,e.hit-dt);const slow=[...tiles.values()].some(t=>t.type==='glyph'&&Math.hypot(t.x-e.x,t.y-e.y)<3.1);e.stepTimer-=dt;e.attackTimer-=dt;if(e.stepTimer<=0){let dx=-e.x,dy=-e.y;if(dx===0&&dy===0){e.attackTimer=Math.max(e.attackTimer,0);if(e.attackTimer<=0){damageTile(core,8);e.attackTimer=.85}e.stepTimer=.18;continue}
        let nx=e.x,ny=e.y;if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)nx+=Math.sign(dx);else if(dy!==0)ny+=Math.sign(dy);
        const obstacle=get(nx,ny);if(obstacle){if(obstacle.type==='core'){if(e.attackTimer<=0){damageTile(obstacle,8);e.attackTimer=.85}e.stepTimer=.22}else{if(e.attackTimer<=0){damageTile(obstacle,9);e.attackTimer=.72}e.stepTimer=.35}}
        else{e.x=nx;e.y=ny;e.stepTimer=(slow?1.35:1.02)+rand()*.16} }
      if(e.hp<=0)enemies.splice(i,1)}
    for(let i=shots.length-1;i>=0;i--){shots[i].life-=dt;if(shots[i].life<=0)shots.splice(i,1)}
    for(const a of [particles,floats])for(let i=a.length-1;i>=0;i--){a[i].life-=dt;if(a[i].life<=0)a.splice(i,1)}
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}
    render();updateUI();
  }
  function updateUI(){ui.sap.textContent=Math.floor(sap);ui.health.textContent=Math.max(0,Math.ceil(core.hp));ui.healthFill.style.width=`${Math.max(0,core.hp)}%`;ui.healthStatus.textContent=core.hp>65?'THRIVING':core.hp>30?'STRAINED':'FADING';ui.tileCount.innerHTML=`${String(tiles.size).padStart(2,'0')}<br><small>FORMS</small>`;const income=.16+[...tiles.values()].reduce((s,t)=>s+kinds[t.type].income,0);ui.income.textContent=`+${income.toFixed(1)} / SEC`;ui.clock.textContent=`DAY 01 · ${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;ui.waveTitle.textContent=waveActive?`WAVE ${String(wave).padStart(2,'0')} · UNDER ATTACK`:`${wave===0?'QUIET':`QUIET · WAVE ${String(wave+1).padStart(2,'0')}`}`;ui.waveHint.innerHTML=waveActive?`${spawnLeft+enemies.length} threat${spawnLeft+enemies.length===1?'':'s'} remain`:`${wave>=MAX_WAVE?'Last wave held':`Next arrival in <b>${Math.max(0,Math.ceil(quietTimer))}</b>s`}`;ui.waveBtn.innerHTML=waveActive?'WAVE IN MOTION <span>◉</span>':wave>=MAX_WAVE?'GARDEN HELD <span>✦</span>':'CALL THEM <span>↗</span>';ui.waveBtn.disabled=waveActive||wave>=MAX_WAVE;ui.waveProgress.style.width=waveActive?`${100*(1-spawnLeft/Math.max(1,2+wave*2+Math.floor(Math.max(0,tiles.size-1)/5)))}%`:`${wave>=MAX_WAVE?100:Math.max(0,100*(1-quietTimer/11))}%`;ui.pause.innerHTML=paused?'<span>▶</span> RESUME GARDEN <kbd>SPACE</kbd>':'<span>Ⅱ</span> PAUSE GARDEN <kbd>SPACE</kbd>'}
  function pathDiamond(x,y,scale=1){const p=project(x,y);const w=TW*.5*zoom*scale,h=TH*.5*zoom*scale;ctx.beginPath();ctx.moveTo(p.x,p.y-h);ctx.lineTo(p.x+w,p.y);ctx.lineTo(p.x,p.y+h);ctx.lineTo(p.x-w,p.y);ctx.closePath()}
  function polygon(points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke()}}
  function drawBackground(){ctx.fillStyle='#192820';ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W*.5,H*.48,10,W*.5,H*.5,Math.max(W,H)*.8);g.addColorStop(0,'rgba(79,106,65,.2)');g.addColorStop(.55,'rgba(44,70,48,.09)');g.addColorStop(1,'rgba(7,15,12,.54)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.18;for(let i=0;i<95;i++){const x=((i*173.3)%W),y=((i*91.7)%H),r=1+(i%3)*.65;ctx.fillStyle=i%4===0?'#d8df9b':'#9db58b';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}ctx.restore();
    // Fine drifting filaments make the empty space feel alive.
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#89a17a';ctx.lineWidth=1;for(let i=0;i<12;i++){const x=(i*127+time*2)%W,y=(i*79+Math.sin(time*.12+i)*36)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+28,y-20,x+35,y+21,x+74,y+7);ctx.stroke()}ctx.restore();
  }
  function drawCell(x,y,available=false,hover=false){pathDiamond(x,y,1);ctx.fillStyle=hover?'rgba(202,225,153,.22)':available?'rgba(166,196,135,.075)':'rgba(139,168,122,.025)';ctx.fill();ctx.strokeStyle=hover?'rgba(218,237,169,.7)':available?'rgba(172,200,147,.18)':'rgba(153,177,135,.06)';ctx.lineWidth=hover?1.2:.6;ctx.stroke();if(hover){const p=project(x,y);ctx.fillStyle='rgba(200,224,145,.65)';ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill()}}
  function drawTile(t){const p=project(t.x,t.y,t.z),w=TW*.42*zoom,h=TH*.43*zoom,depth=(t.type==='core'?13:9)*zoom,top=t.type==='core'?t.color:kinds[t.type].color,side=kinds[t.type].side;const flash=t.flash>0;
    ctx.save();if(t.type==='bloom'||t.type==='glyph'){ctx.shadowColor=kinds[t.type].glow;ctx.shadowBlur=15*zoom}
    polygon([[p.x-w,p.y],[p.x,p.y+h],[p.x,p.y+h+depth],[p.x-w,p.y+depth]],side,'rgba(18,30,22,.55)');polygon([[p.x,p.y+h],[p.x+w,p.y],[p.x+w,p.y+depth],[p.x,p.y+h+depth]],side,'rgba(18,30,22,.55)');
    const face=flash?'#f0d7b4':top;polygon([[p.x,p.y-h],[p.x+w,p.y],[p.x,p.y+h],[p.x-w,p.y]],face,'rgba(220,233,193,.47)');ctx.shadowBlur=0;
    const r=zoom;
    if(t.type==='core'){ctx.fillStyle='#526746';ctx.beginPath();ctx.ellipse(p.x,p.y,8*r,5*r,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d2db9a';ctx.beginPath();ctx.ellipse(p.x,p.y-2*r,5*r,3.8*r,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0e2b2';ctx.beginPath();ctx.arc(p.x+1*r,p.y-3*r,1.7*r,0,Math.PI*2);ctx.fill()}
    else if(t.type==='stem'){ctx.strokeStyle='#d1dca2';ctx.lineWidth=2*r;ctx.beginPath();ctx.moveTo(p.x-5*r,p.y+3*r);ctx.quadraticCurveTo(p.x,p.y,p.x+4*r,p.y-5*r);ctx.stroke();ctx.fillStyle='#8da975';ctx.beginPath();ctx.ellipse(p.x-3*r,p.y,3*r,1.7*r,-.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(p.x+2*r,p.y-3*r,3*r,1.7*r,-.4,0,Math.PI*2);ctx.fill()}
    else if(t.type==='leaf'){ctx.fillStyle='#d3e6ab';ctx.beginPath();ctx.ellipse(p.x,p.y,7*r,3*r,-.45,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#648962';ctx.lineWidth=.8*r;ctx.beginPath();ctx.moveTo(p.x-5*r,p.y+3*r);ctx.lineTo(p.x+5*r,p.y-3*r);ctx.stroke()}
    else if(t.type==='root'){ctx.strokeStyle='#e2bd91';ctx.lineWidth=2*r;ctx.beginPath();ctx.moveTo(p.x-7*r,p.y-3*r);ctx.quadraticCurveTo(p.x-1*r,p.y+4*r,p.x+7*r,p.y-3*r);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-1*r,p.y+5*r);ctx.stroke()}
    else if(t.type==='bloom'){ctx.fillStyle='#f4d398';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(p.x+Math.cos(a)*3.1*r,p.y-1*r+Math.sin(a)*2.5*r,2.4*r,1.55*r,a,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#795943';ctx.beginPath();ctx.arc(p.x,p.y-1*r,1.5*r,0,Math.PI*2);ctx.fill()}
    else if(t.type==='glyph'){ctx.strokeStyle='#e3d8fa';ctx.lineWidth=1.4*r;ctx.beginPath();ctx.moveTo(p.x,p.y-6*r);ctx.lineTo(p.x+5*r,p.y);ctx.lineTo(p.x,p.y+5*r);ctx.lineTo(p.x-5*r,p.y);ctx.closePath();ctx.stroke();ctx.fillStyle='#e8dcff';ctx.beginPath();ctx.arc(p.x,p.y,1.3*r,0,Math.PI*2);ctx.fill()}
    if(t.type!=='core'&&t.hp<t.maxHp){ctx.fillStyle='rgba(15,22,17,.75)';ctx.fillRect(p.x-10*zoom,p.y-h-depth-5*zoom,20*zoom,2*zoom);ctx.fillStyle='#d9a581';ctx.fillRect(p.x-10*zoom,p.y-h-depth-5*zoom,20*zoom*Math.max(0,t.hp/t.maxHp),2*zoom)}
    ctx.restore();}
  function drawEnemy(e){const p=project(e.x,e.y,0),bop=Math.sin(time*5+e.seed)*2*zoom;ctx.save();ctx.translate(p.x,p.y-4*zoom+bop);ctx.shadowColor='#db8790';ctx.shadowBlur=12*zoom;ctx.fillStyle=e.hit>0?'#ffe0b0':'#b96c79';ctx.beginPath();ctx.ellipse(0,0,8*zoom,5*zoom,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#653d4c';ctx.beginPath();ctx.ellipse(-6*zoom,-2*zoom,5*zoom,2.4*zoom,-.45,0,Math.PI*2);ctx.ellipse(6*zoom,-2*zoom,5*zoom,2.4*zoom,.45,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f8d7a2';ctx.beginPath();ctx.arc(2*zoom,-1*zoom,1.3*zoom,0,Math.PI*2);ctx.fill();ctx.restore();if(e.hp<e.maxHp){ctx.fillStyle='rgba(12,18,14,.8)';ctx.fillRect(p.x-9*zoom,p.y-17*zoom,18*zoom,2*zoom);ctx.fillStyle='#d78b8b';ctx.fillRect(p.x-9*zoom,p.y-17*zoom,18*zoom*e.hp/e.maxHp,2*zoom)}}
  function render(){
    if(!W||!H)return;ctx.clearRect(0,0,W,H);drawBackground();
    const reachable=new Set();for(const t of tiles.values())for(const [x,y]of neighbors(t.x,t.y))if(!get(x,y)&&cellOnScreen(x,y))reachable.add(key(x,y));
    const occupied=[...tiles.values()];const minX=Math.min(-10,...occupied.map(t=>t.x-1)),maxX=Math.max(10,...occupied.map(t=>t.x+1)),minY=Math.min(-10,...occupied.map(t=>t.y-1)),maxY=Math.max(10,...occupied.map(t=>t.y+1));
    // Quiet, tilted diamonds give the void a sense of scale without filling it with a loud grid.
    for(let s=minX+minY;s<=maxX+maxY;s++)for(let x=minX;x<=maxX;x++){const y=s-x;if(y<minY||y>maxY||!cellOnScreen(x,y))continue;const k=key(x,y);if(get(x,y))continue;const hover=ghostCell&&ghostCell.x===x&&ghostCell.y===y;drawCell(x,y,reachable.has(k),hover)}
    const ordered=[...tiles.values()].sort((a,b)=>(a.x+a.y-b.x-b.y)||(a.x-b.x));for(const t of ordered){if(!cellOnScreen(t.x,t.y))continue;if(t.type==='bloom'){const p=project(t.x,t.y);ctx.beginPath();ctx.arc(p.x,p.y,6*TW*.5*zoom,0,Math.PI*2);ctx.strokeStyle='rgba(231,188,128,.035)';ctx.lineWidth=1;ctx.stroke()}drawTile(t)}
    for(const e of enemies)drawEnemy(e);
    // shots link each bloom to the target it is currently striking
    for(const s of shots){const p=project(s.x,s.y,2),q=project(s.to.x,s.to.y,0);ctx.globalAlpha=Math.max(0,s.life/s.max);ctx.strokeStyle='#f6d99b';ctx.lineWidth=2*zoom;ctx.shadowColor='#ffe6a5';ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y-4*zoom);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1}
    for(const f of particles){const p=project(f.x,f.y);ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,3*zoom*(f.life/f.max+.2),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
    for(const f of floats){const p=project(f.x,f.y);ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.fillStyle=f.color;ctx.font=`${9*zoom}px 'DM Mono', monospace`;ctx.textAlign='center';ctx.fillText(f.text,p.x,p.y-20*zoom+(1-f.life/f.max)*14);ctx.globalAlpha=1}
    if(ghostCell){const{x,y}=ghostCell;const can=!get(x,y)&&neighbors(x,y).some(([a,b])=>get(a,b))&&sap>=kinds[selected].cost&&Math.abs(x)<=14&&Math.abs(y)<=14;const p=project(x,y);ctx.save();ctx.globalAlpha=.6;pathDiamond(x,y);ctx.fillStyle=can?kinds[selected].glow:'#d78080';ctx.fill();ctx.strokeStyle=can?'#e6f1bc':'#e79b9b';ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=.82;ctx.fillStyle='#111b15';ctx.font=`bold ${12*zoom}px 'DM Sans', sans-serif`;ctx.textAlign='center';ctx.fillText(can?({stem:'╱',leaf:'❧',root:'⌁',bloom:'✳',glyph:'◇'}[selected]):'×',p.x,p.y+4*zoom);ctx.restore()}
    if(paused&&!ended){ctx.fillStyle='rgba(8,15,11,.46)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#e5eadc';ctx.textAlign='center';ctx.font='600 25px "Playfair Display",serif';ctx.fillText('The garden rests.',W/2,H/2-5);ctx.fillStyle='#a5b1a2';ctx.font='10px "DM Mono",monospace';ctx.fillText('PRESS SPACE TO CONTINUE',W/2,H/2+19)}
  }
  function frameLoop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!paused&&!ended)update(dt);else render();requestAnimationFrame(frameLoop)}requestAnimationFrame(frameLoop);
  function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const p=pointerPos(e);pointers.set(e.pointerId,p);if(pointers.size===2){const [a,b]=pointers.values();pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};drag=null}else if(pointers.size===1)drag={id:e.pointerId,x:p.x,y:p.y,lastX:p.x,lastY:p.y,moved:false};ghostCell=unproject(p.x,p.y)});
  canvas.addEventListener('pointermove',e=>{const p=pointerPos(e);if(pointers.has(e.pointerId))pointers.set(e.pointerId,p);if(pinch&&pointers.size>=2){const [a,b]=pointers.values();zoom=Math.max(.62,Math.min(1.42,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));ghostCell=unproject(p.x,p.y);return}if(drag&&drag.id===e.pointerId){const dx=p.x-drag.x,dy=p.y-drag.y;if(!drag.moved&&Math.hypot(dx,dy)>7)drag.moved=true;if(drag.moved){camX+=p.x-drag.lastX;camY+=p.y-drag.lastY}drag.lastX=p.x;drag.lastY=p.y}ghostCell=unproject(p.x,p.y)});
  canvas.addEventListener('pointerup',e=>{const p=pointerPos(e);pointers.delete(e.pointerId);if(pinch){pinch=null;drag=null;ghostCell=unproject(p.x,p.y);return}if(!drag||drag.id!==e.pointerId)return;if(!drag.moved)place(unproject(p.x,p.y).x,unproject(p.x,p.y).y,e.shiftKey?1:0);drag=null;ghostCell=unproject(p.x,p.y)});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinch=null});canvas.addEventListener('pointerleave',()=>{if(!drag&&!pinch)ghostCell=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.62,Math.min(1.42,zoom*(e.deltaY<0?1.08:.92)))},{passive:false});
  document.querySelectorAll('.build-option').forEach(button=>button.addEventListener('click',()=>setSelected(button.dataset.type)));
  ui.waveBtn.addEventListener('click',startWave);
  ui.pause.addEventListener('click',()=>{if(!ended){paused=!paused;last=performance.now();updateUI();render()}});
  document.addEventListener('keydown',e=>{if(e.key>='1'&&e.key<='5'){setSelected(['stem','leaf','root','bloom','glyph'][Number(e.key)-1]);return}if(e.key==='Escape'){ghostCell=null;drag=null}if(e.code==='Space'){e.preventDefault();if(!ended){paused=!paused;last=performance.now();updateUI();render()}}});
  const help=()=>{ui.modalEyebrow.textContent='FIELD NOTES · 01';ui.modalTitle.innerHTML='How to grow<br><em>a living world.</em>';ui.modalCopy.innerHTML='<p><b>Build outward.</b> Choose a form, then tap any glowing cell touching your garden. Leaves make sap; roots endure; blooms defend; glyphs slow the dark.</p><p><b>Stay connected.</b> Three touching tiles awaken a module. Let your forms mingle to discover what the garden becomes.</p><p><b>Hold the heartwood.</b> The dark arrives in five waves. Build before it reaches your core. Drag to explore; use the wheel or pinch to zoom.</p>';ui.modalAction.textContent='BACK TO THE GARDEN  ↗';ui.modal.classList.remove('hidden')};
  $('helpBtn').addEventListener('click',help);$('modalClose').addEventListener('click',()=>ui.modal.classList.add('hidden'));ui.modalAction.addEventListener('click',()=>{if(ended){location.reload()}else ui.modal.classList.add('hidden')});ui.modal.addEventListener('click',e=>{if(e.target===ui.modal&&!ended)ui.modal.classList.add('hidden')});
  updateModules();updateUI();render();
})();
