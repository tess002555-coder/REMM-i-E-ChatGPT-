const send=(action,extra={})=>window.chrome?.webview?.postMessage(JSON.stringify({action,...extra}));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const $=id=>document.getElementById(id);
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-action]"); if(el) send(el.dataset.action);
 const f=e.target.closest("[data-filter]"); if(f){document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter===f.dataset.filter));send("filter",{value:f.dataset.filter});}
 const r=e.target.closest("[data-routine-action]"); if(r) send(r.dataset.routineAction,{id:r.dataset.id});
 const t=e.target.closest("[data-task-action]"); if(t) send(t.dataset.taskAction,{id:t.dataset.id});
});
$("search").addEventListener("input",e=>send("search",{value:e.target.value}));
window.renderData=data=>{
 const d=typeof data==="string"?JSON.parse(data):data;
 $("displayName").textContent=d.displayName||"Maskot Denia"; $("taskCount").textContent=d.taskCount??0;
 $("calendarList").innerHTML=(d.schedules||[]).map(x=>'<div class="row"><span>'+esc(x.title)+'</span><span class="date">'+esc(x.date)+'</span></div>').join("")||'<div class="empty">Belum ada jadwal.</div>';
 $("routineList").innerHTML=(d.routines||[]).map(x=>'<div class="row"><span class="routine-icon">▣</span><span class="routine-title">'+esc(x.title)+'</span><span class="row-actions"><button data-routine-action="share-routine" data-id="'+esc(x.id)+'">↗</button><button data-routine-action="open-routine" data-id="'+esc(x.id)+'">›</button><button class="delete" data-routine-action="delete-routine" data-id="'+esc(x.id)+'">×</button></span></div>').join("")||'<div class="empty">Belum ada rutinitas.</div>';
 const tasks=d.tasks||[]; $("taskList").innerHTML=tasks.map(x=>'<div class="task-row"><input type="checkbox" '+(x.completed?"checked":"")+' data-task-toggle="'+esc(x.id)+'"><span class="task-text '+(x.completed?"done":"")+'">'+esc(x.title)+' · '+esc(x.priority)+(x.deadline?" · "+esc(x.deadline):"")+'</span><button class="task-delete" data-task-action="delete-task" data-id="'+esc(x.id)+'">×</button></div>').join(""); $("empty").style.display=tasks.length?"none":"block";
 document.querySelectorAll("[data-task-toggle]").forEach(box=>box.addEventListener("change",()=>send("toggle-task",{id:box.dataset.taskToggle,completed:box.checked})));
};
window.setPanelOpacity=v=>document.querySelector(".shell").style.opacity=v;
window.addEventListener("DOMContentLoaded",()=>send("search",{value:""}));