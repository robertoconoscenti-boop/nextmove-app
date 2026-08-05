'use strict';

const KEY='nextmove-v01';
const VIEW_ORDER=['home','tasks','done','settings'];
const byId=id=>document.getElementById(id);

const el={
  appRoot:byId('appRoot'),installBtn:byId('installBtn'),timeRow:byId('timeRow'),energyRow:byId('energyRow'),hero:byId('hero'),
  openCount:byId('openCount'),doneCount:byId('doneCount'),urgentCount:byId('urgentCount'),homeTasks:byId('homeTasks'),tasks:byId('tasks'),doneTasks:byId('doneTasks'),
  addTaskBtn:byId('addTaskBtn'),taskModal:byId('taskModal'),closeModalBtn:byId('closeModalBtn'),taskForm:byId('taskForm'),formTitle:byId('formTitle'),
  taskId:byId('taskId'),taskName:byId('taskName'),taskCategory:byId('taskCategory'),taskDue:byId('taskDue'),taskImportance:byId('taskImportance'),
  taskUrgency:byId('taskUrgency'),taskDuration:byId('taskDuration'),taskEnergy:byId('taskEnergy'),taskNotes:byId('taskNotes'),deleteTaskBtn:byId('deleteTaskBtn'),
  resetDemoBtn:byId('resetDemoBtn'),clearDoneBtn:byId('clearDoneBtn'),clearAllBtn:byId('clearAllBtn'),resetContextBtn:byId('resetContextBtn')
};

function dayOffset(add=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+add);return d.toISOString().slice(0,10)}
const demo=[
  {id:1,name:'Preparare documenti viaggio',category:'Personale',importance:4,urgency:4,duration:15,energy:2,due:dayOffset(1),notes:'',done:false},
  {id:2,name:'Chiamare il medico',category:'Personale',importance:5,urgency:4,duration:15,energy:2,due:dayOffset(0),notes:'',done:false},
  {id:3,name:'Sistemare la stanza',category:'Casa',importance:3,urgency:2,duration:60,energy:3,due:'',notes:'',done:false}
];
function cloneDemo(){return JSON.parse(JSON.stringify(demo))}
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch{return null}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}

let state=load()||{tasks:cloneDemo(),time:30,energy:3};
if(!Array.isArray(state.tasks))state.tasks=cloneDemo();
if(![15,30,60,90,'free'].includes(state.time))state.time=30;
if(!Number.isInteger(state.energy)||state.energy<1||state.energy>5)state.energy=3;
let activeView='home';
let deferredPrompt=null;

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
  el.timeRow.innerHTML='';
  [15,30,60,90,'free'].forEach(v=>{const b=document.createElement('button');b.className='chip '+(state.time===v?'active':'');b.type='button';b.textContent=v==='free'?'Libero':v+'m';b.setAttribute('aria-pressed',String(state.time===v));b.addEventListener('click',()=>{state.time=v;save();render()});el.timeRow.appendChild(b)});
  el.energyRow.innerHTML='';
  for(let i=1;i<=5;i++){const b=document.createElement('button');b.type='button';b.className='energy-dot '+(i<=state.energy?'active':'');b.setAttribute('aria-label','Imposta energia a '+i+' su 5');b.setAttribute('aria-pressed',String(i===state.energy));b.title='Energia '+i+' su 5';b.addEventListener('click',()=>{state.energy=i;save();render()});el.energyRow.appendChild(b)}
}
function renderHero(){const pick=ordered().find(x=>!x.c.blocked);if(!pick){el.hero.innerHTML='<div class="eyebrow">LA TUA PROSSIMA MOSSA</div><h2>Nessun task compatibile</h2><div class="meta">Aumenta tempo o energia, oppure aggiungi un nuovo task.</div>';return}const{t,c}=pick;el.hero.innerHTML=`<div class="eyebrow">LA TUA PROSSIMA MOSSA</div><h2>${esc(t.name)}</h2><div class="meta">${esc(t.category)} · ${t.duration} min · Energia ${t.energy}${t.due?' · '+t.due:''}</div><div class="score">${c.score} punti · ${label(c.score)}</div><button class="secondary" type="button" style="margin-top:12px" data-explain="heroExp">Perché questo task?</button><div id="heroExp" class="explain">${explain(t,c)}</div><button class="primary" type="button" data-complete="${t.id}">✓ Completa</button>`}
function taskCard(t,c,{compact=false}={}){const explainId=`e${t.id}${compact?'h':''}`;return `<div class="task" style="opacity:${c.blocked?.58:1}"><div class="task-top"><div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.category)} · ${t.duration} min · Energia ${t.energy}${t.due?' · '+t.due:''}</div></div><span class="badge">${c.score}</span></div><div class="row" style="margin-top:8px"><span class="badge">${label(c.score)}</span>${Number(t.duration)<=15?'<span class="badge">Task rapido</span>':''}</div>${c.reason?`<div class="meta" style="margin-top:8px">${c.reason}</div>`:''}<div id="${explainId}" class="explain">${explain(t,c)}</div><div class="task-actions"><button class="secondary" type="button" data-explain="${explainId}">Punteggio</button><button class="secondary" type="button" data-edit="${t.id}">Modifica</button><button class="secondary success" type="button" data-complete="${t.id}">Completa</button></div></div>`}
function renderOpenTasks(){const arr=ordered();el.tasks.innerHTML=arr.length?arr.map(x=>taskCard(x.t,x.c)).join(''):'<div class="empty">Nessun task aperto.</div>';el.homeTasks.innerHTML=arr.length?arr.slice(0,3).map(x=>taskCard(x.t,x.c,{compact:true})).join(''):'<div class="empty">Nessun task aperto.</div>'}
function renderDoneTasks(){const arr=completed();el.doneTasks.innerHTML=arr.length?arr.map(t=>`<div class="task done"><div class="task-top"><div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.category)} · completato ${t.doneDate||''}</div></div><span class="badge">Fatto</span></div><div class="task-actions"><button class="secondary" type="button" data-restore="${t.id}">Ripristina</button><button class="secondary danger" type="button" data-delete="${t.id}">Elimina</button></div></div>`).join(''):'<div class="empty">Non hai ancora completato task.</div>'}
function renderStats(){el.openCount.textContent=state.tasks.filter(t=>!t.done).length;el.doneCount.textContent=state.tasks.filter(t=>t.done&&t.doneDate===dayOffset()).length;el.urgentCount.textContent=state.tasks.filter(t=>!t.done&&(Number(t.urgency)>=4||dueBonus(t.due)>=15)).length}
function render(){renderContext();renderHero();renderOpenTasks();renderDoneTasks();renderStats();updateNav()}

function setView(view){if(!VIEW_ORDER.includes(view))return;activeView=view;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));el.addTaskBtn.classList.toggle('hidden',!['home','tasks'].includes(view));window.scrollTo({top:0,behavior:'smooth'})}
function updateNav(){setView(activeView)}
function toggleExplain(id){const target=byId(id);if(target)target.style.display=target.style.display==='block'?'none':'block'}
function completeTask(id){const t=state.tasks.find(x=>Number(x.id)===Number(id));if(!t)return;t.done=true;t.doneDate=dayOffset();save();render()}
function restoreTask(id){const t=state.tasks.find(x=>Number(x.id)===Number(id));if(!t)return;t.done=false;delete t.doneDate;save();render()}
function deleteTask(id,{confirmFirst=false}={}){const task=state.tasks.find(x=>Number(x.id)===Number(id));if(!task)return;if(confirmFirst&&!window.confirm(`Eliminare definitivamente “${task.name}”?`))return;state.tasks=state.tasks.filter(x=>Number(x.id)!==Number(id));save();render()}

function openForm(task=null){
  el.taskForm.reset();
  el.taskId.value=task?.id??'';
  el.formTitle.textContent=task?'Modifica task':'Nuovo task';
  el.taskName.value=task?.name??'';
  el.taskCategory.value=task?.category??'Personale';
  el.taskDue.value=task?.due??'';
  el.taskImportance.value=String(task?.importance??3);
  el.taskUrgency.value=String(task?.urgency??3);
  el.taskDuration.value=String(task?.duration??30);
  el.taskEnergy.value=String(task?.energy??3);
  el.taskNotes.value=task?.notes??'';
  el.deleteTaskBtn.hidden=!task;
  el.taskModal.classList.add('open');
  document.body.classList.add('modal-open');
  window.setTimeout(()=>el.taskName.focus(),50);
}
function closeForm(){el.taskModal.classList.remove('open');document.body.classList.remove('modal-open');el.taskForm.reset();el.taskId.value='';el.deleteTaskBtn.hidden=true}
function editTask(id){const task=state.tasks.find(x=>Number(x.id)===Number(id));if(task)openForm(task)}
function submitTask(event){
  event.preventDefault();
  const taskName=el.taskName.value.trim();
  if(!taskName){el.taskName.focus();return}
  const editingId=el.taskId.value?Number(el.taskId.value):null;
  const existing=editingId===null?null:state.tasks.find(x=>Number(x.id)===editingId);
  const data={id:editingId??Date.now(),name:taskName,category:el.taskCategory.value,due:el.taskDue.value,importance:Number(el.taskImportance.value),urgency:Number(el.taskUrgency.value),duration:Number(el.taskDuration.value),energy:Number(el.taskEnergy.value),notes:el.taskNotes.value.trim(),done:existing?.done??false};
  if(existing?.doneDate)data.doneDate=existing.doneDate;
  const index=state.tasks.findIndex(x=>Number(x.id)===Number(data.id));
  if(index>=0)state.tasks[index]=data;else state.tasks.push(data);
  save();closeForm();render();
}
function deleteEditingTask(){const id=Number(el.taskId.value);if(!id)return;const task=state.tasks.find(x=>Number(x.id)===id);if(!task)return;if(!window.confirm(`Eliminare definitivamente “${task.name}”?`))return;state.tasks=state.tasks.filter(x=>Number(x.id)!==id);save();closeForm();render()}

function handleActionClick(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.explain)toggleExplain(button.dataset.explain);
  else if(button.dataset.edit)editTask(button.dataset.edit);
  else if(button.dataset.complete)completeTask(button.dataset.complete);
  else if(button.dataset.restore)restoreTask(button.dataset.restore);
  else if(button.dataset.delete)deleteTask(button.dataset.delete,{confirmFirst:true});
}
document.addEventListener('click',handleActionClick);

el.addTaskBtn.addEventListener('click',()=>openForm());
el.closeModalBtn.addEventListener('click',closeForm);
el.taskModal.addEventListener('click',event=>{if(event.target===el.taskModal)closeForm()});
el.taskForm.addEventListener('submit',submitTask);
el.deleteTaskBtn.addEventListener('click',deleteEditingTask);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&el.taskModal.classList.contains('open'))closeForm()});

el.resetDemoBtn.addEventListener('click',()=>{state={tasks:cloneDemo(),time:30,energy:3};save();render()});
el.clearDoneBtn.addEventListener('click',()=>{state.tasks=state.tasks.filter(t=>!t.done);save();render()});
el.clearAllBtn.addEventListener('click',()=>{if(window.confirm('Vuoi cancellare tutti i task e le impostazioni locali?')){state={tasks:[],time:30,energy:3};save();render()}});
el.resetContextBtn.addEventListener('click',()=>{state.time=30;state.energy=3;save();render()});

for(let i=1;i<=5;i++){el.taskImportance.add(new Option(i,i));el.taskUrgency.add(new Option(i,i));el.taskEnergy.add(new Option(i,i))}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));

let touchStart=null;
el.appRoot.addEventListener('touchstart',event=>{
  if(el.taskModal.classList.contains('open'))return;
  if(event.target.closest('button,input,select,textarea,a'))return;
  const touch=event.changedTouches[0];touchStart={x:touch.clientX,y:touch.clientY,time:Date.now()};
},{passive:true});
el.appRoot.addEventListener('touchend',event=>{
  if(!touchStart)return;
  const touch=event.changedTouches[0];const dx=touch.clientX-touchStart.x;const dy=touch.clientY-touchStart.y;const elapsed=Date.now()-touchStart.time;touchStart=null;
  if(elapsed>800||Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.35)return;
  const currentIndex=VIEW_ORDER.indexOf(activeView);const nextIndex=dx<0?currentIndex+1:currentIndex-1;
  if(nextIndex>=0&&nextIndex<VIEW_ORDER.length)setView(VIEW_ORDER[nextIndex]);
},{passive:true});
el.appRoot.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;el.installBtn.hidden=false});
el.installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el.installBtn.hidden=true});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
render();
