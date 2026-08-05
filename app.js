const KEY='nextmove-v01';
function dayOffset(add=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+add);return d.toISOString().slice(0,10)}
const demo=[
  {id:1,name:'Preparare documenti viaggio',category:'Personale',importance:4,urgency:4,duration:15,energy:2,due:dayOffset(1),notes:'',done:false},
  {id:2,name:'Chiamare il medico',category:'Personale',importance:5,urgency:4,duration:15,energy:2,due:dayOffset(0),notes:'',done:false},
  {id:3,name:'Sistemare la stanza',category:'Casa',importance:3,urgency:2,duration:60,energy:3,due:'',notes:'',done:false}
];
let state=load()||{tasks:cloneDemo(),time:30,energy:3};
if(!Array.isArray(state.tasks))state.tasks=cloneDemo();
if(![15,30,60,90,'free'].includes(state.time))state.time=30;
if(!Number.isInteger(state.energy)||state.energy<1||state.energy>5)state.energy=3;
let activeView='home';let deferredPrompt=null;
function cloneDemo(){return JSON.parse(JSON.stringify(demo))}
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch{return null}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
const durationBonus={5:8,15:6,30:4,60:2,90:1,120:0};
function dueBonus(due){if(!due)return 0;const now=new Date(dayOffset());const d=new Date(due+'T12:00:00');const days=Math.round((d-now)/86400000);if(days<0)return 20;if(days===0)return 18;if(days===1)return 15;if(days<=3)return 12;if(days<=7)return 8;if(days<=14)return 4;return 0}
function score(t){return Number(t.importance)*8+Number(t.urgency)*6+dueBonus(t.due)+(durationBonus[Number(t.duration)]||0)}
function contextual(t){let s=score(t),reason='';if(state.time!=='free'&&Number(t.duration)>Number(state.time))reason='Richiede più tempo di quello disponibile';else if(Number(t.energy)>=state.energy+2)reason='Richiede troppa energia per il momento';else if(Number(t.energy)===state.energy+1){s-=10;reason='Eseguibile con sforzo: −10 punti'}return{score:s,blocked:Boolean(reason&&!reason.includes('−10')),reason}}
function label(s){return s>=70?'Fallo ora':s>=45?'Pianificalo':'Può aspettare'}
function explain(t,c){return `+${Number(t.importance)*8} Importanza ${t.importance}<br>+${Number(t.urgency)*6} Urgenza ${t.urgency}<br>+${dueBonus(t.due)} Scadenza<br>+${durationBonus[Number(t.duration)]||0} Durata${c?.reason?'<br><b>'+c.reason+'</b>':''}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ordered(){return state.tasks.filter(t=>!t.done).map(t=>({t,c:contextual(t)})).sort((a,b)=>b.c.score-a.c.score)}
function completed(){return state.tasks.filter(t=>t.done).sort((a,b)=>String(b.doneDate||'').localeCompare(String(a.doneDate||'')))}
function renderContext(){
  timeRow.innerHTML='';[15,30,60,90,'free'].forEach(v=>{const b=document.createElement('button');b.className='chip '+(state.time===v?'active':'');b.type='button';b.textContent=v==='free'?'Libero':v+'m';b.setAttribute('aria-pressed',state.time===v);b.onclick=()=>{state.time=v;save();render()};timeRow.appendChild(b)});
  energyRow.innerHTML='';for(let i=1;i<=5;i++){const b=document.createElement('button');b.type='button';b.className='energy-dot '+(i<=state.energy?'active':'');b.setAttribute('aria-label','Imposta energia a '+i+' su 5');b.setAttribute('aria-pressed',i===state.energy);b.title='Energia '+i+' su 5';b.onclick=()=>{state.energy=i;save();render()};energyRow.appendChild(b)}
}
function renderHero(){const pick=ordered().find(x=>!x.c.blocked);if(!pick){hero.innerHTML='<div class="eyebrow">LA TUA PROSSIMA MOSSA</div><h2>Nessun task compatibile</h2><div class="meta">Aumenta tempo o energia, oppure aggiungi un nuovo task.</div>';return}const{t,c}=pick;hero.innerHTML=`<div class="eyebrow">LA TUA PROSSIMA MOSSA</div><h2>${esc(t.name)}</h2><div class="meta">${esc(t.category)} · ${t.duration} min · Energia ${t.energy}${t.due?' · '+t.due:''}</div><div class="score">${c.score} punti · ${label(c.score)}</div><button class="secondary" style="margin-top:12px" onclick="toggleExplain('heroExp')">Perché questo task?</button><div id="heroExp" class="explain">${explain(t,c)}</div><button class="primary" onclick="completeTask(${t.id})">✓ Completa</button>`}
function taskCard(t,c,{compact=false}={}){return `<div class="task" style="opacity:${c.blocked?.58:1}"><div class="task-top"><div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.category)} · ${t.duration} min · Energia ${t.energy}${t.due?' · '+t.due:''}</div></div><span class="badge">${c.score}</span></div><div class="row" style="margin-top:8px"><span class="badge">${label(c.score)}</span>${Number(t.duration)<=15?'<span class="badge">Task rapido</span>':''}</div>${c.reason?`<div class="meta" style="margin-top:8px">${c.reason}</div>`:''}<div id="e${t.id}${compact?'h':''}" class="explain">${explain(t,c)}</div><div class="task-actions"><button class="secondary" onclick="toggleExplain('e${t.id}${compact?'h':''}')">Punteggio</button><button class="secondary" onclick="editTask(${t.id})">Modifica</button><button class="secondary success" onclick="completeTask(${t.id})">Completa</button></div></div>`}
function renderOpenTasks(){const arr=ordered();tasks.innerHTML=arr.length?arr.map(x=>taskCard(x.t,x.c)).join(''):'<div class="empty">Nessun task aperto.</div>';homeTasks.innerHTML=arr.length?arr.slice(0,3).map(x=>taskCard(x.t,x.c,{compact:true})).join(''):'<div class="empty">Nessun task aperto.</div>'}
function renderDoneTasks(){const arr=completed();doneTasks.innerHTML=arr.length?arr.map(t=>`<div class="task done"><div class="task-top"><div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.category)} · completato ${t.doneDate||''}</div></div><span class="badge">Fatto</span></div><div class="task-actions"><button class="secondary" onclick="restoreTask(${t.id})">Ripristina</button><button class="secondary danger" onclick="deleteTask(${t.id})">Elimina</button></div></div>`).join(''):'<div class="empty">Non hai ancora completato task.</div>'}
function renderStats(){openCount.textContent=state.tasks.filter(t=>!t.done).length;doneCount.textContent=state.tasks.filter(t=>t.done&&t.doneDate===dayOffset()).length;urgentCount.textContent=state.tasks.filter(t=>!t.done&&(Number(t.urgency)>=4||dueBonus(t.due)>=15)).length}
function render(){renderContext();renderHero();renderOpenTasks();renderDoneTasks();renderStats();updateNav()}
function setView(view){activeView=view;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));add.classList.toggle('hidden',!['home','tasks'].includes(view));window.scrollTo({top:0,behavior:'smooth'})}
function updateNav(){setView(activeView)}
function toggleExplain(id){const e=document.getElementById(id);if(e)e.style.display=e.style.display==='block'?'none':'block'}
function completeTask(id){const t=state.tasks.find(x=>Number(x.id)===Number(id));if(!t)return;t.done=true;t.doneDate=dayOffset();save();render()}
function restoreTask(id){const t=state.tasks.find(x=>Number(x.id)===Number(id));if(!t)return;t.done=false;delete t.doneDate;save();render()}
function deleteTask(id){state.tasks=state.tasks.filter(x=>Number(x.id)!==Number(id));save();render()}
function openForm(t){modal.classList.add('open');taskId.value=t?.id||'';formTitle.textContent=t?'Modifica task':'Nuovo task';name.value=t?.name||'';category.value=t?.category||'Personale';due.value=t?.due||'';importance.value=t?.importance||3;urgency.value=t?.urgency||3;duration.value=t?.duration||30;energy.value=t?.energy||3;notes.value=t?.notes||''}
function editTask(id){openForm(state.tasks.find(x=>Number(x.id)===Number(id)))}
add.onclick=()=>openForm();close.onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
form.onsubmit=e=>{e.preventDefault();const existing=state.tasks.find(x=>Number(x.id)===Number(taskId.value));const data={id:taskId.value?Number(taskId.value):Date.now(),name:name.value.trim(),category:category.value,due:due.value,importance:Number(importance.value),urgency:Number(urgency.value),duration:Number(duration.value),energy:Number(energy.value),notes:notes.value,done:existing?.done||false};if(existing?.doneDate)data.doneDate=existing.doneDate;const i=state.tasks.findIndex(x=>Number(x.id)===Number(data.id));if(i>=0)state.tasks[i]=data;else state.tasks.push(data);save();modal.classList.remove('open');render()};
resetDemo.onclick=()=>{state={tasks:cloneDemo(),time:30,energy:3};save();render()};
clearDone.onclick=()=>{state.tasks=state.tasks.filter(t=>!t.done);save();render()};
clearAll.onclick=()=>{if(confirm('Vuoi cancellare tutti i task e le impostazioni locali?')){state={tasks:[],time:30,energy:3};save();render()}};
resetContext.onclick=()=>{state.time=30;state.energy=3;save();render()};
for(let i=1;i<=5;i++){importance.add(new Option(i,i));urgency.add(new Option(i,i));energy.add(new Option(i,i))}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;install.hidden=false});install.onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;install.hidden=true}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
render();