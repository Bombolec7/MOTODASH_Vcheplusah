const $=id=>document.getElementById(id);
const state={screen:"dashboard",running:false,paused:false,start:0,elapsed:0,timer:null,speed:0,maxSpeed:0,distance:0,lastPos:null,lean:0,offset:0,maxLeft:0,maxRight:0,ax:0,ay:0,az:0,maxAccel:0,maxBrake:0,maxLat:0,route:[],sessions:[],watchId:null};
const fmt=(n,d=1)=>(Number(n)||0).toFixed(d);
function load(){try{state.sessions=JSON.parse(localStorage.getItem("motodashSessions")||"[]")}catch{state.sessions=[]}renderHistory()}
function save(){localStorage.setItem("motodashSessions",JSON.stringify(state.sessions));}
function setScreen(name){state.screen=name;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===name))}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setScreen(b.dataset.screen)));

function drawTicks(){
  const g=$("ticks");
  if(!g) return;
  g.replaceChildren();
  const startX=30, endX=730;
  for(let i=0;i<=24;i++){
    const x=startX+(endX-startX)*i/24;
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1",x); line.setAttribute("x2",x);
    line.setAttribute("y1",54); line.setAttribute("y2",i%6===0?67:60);
    line.setAttribute("class",i===12?"tick-center":"tick");
    g.appendChild(line);
  }
}
function updateLean(){
  const v=Math.max(-60,Math.min(60,state.lean-state.offset));
  $("leanValue").textContent=Math.round(v);
  const center=380, span=350;
  const marker=center+(v/60)*span;
  $("needle").setAttribute("x1",marker);
  $("needle").setAttribute("x2",marker);
  $("gaugeActive").setAttribute("x1",Math.min(center,marker));
  $("gaugeActive").setAttribute("x2",Math.max(center,marker));
  if(state.running){
    if(v<0) state.maxLeft=Math.max(state.maxLeft,-v);
    if(v>0) state.maxRight=Math.max(state.maxRight,v);
  }
  $("maxLeft").textContent=Math.round(state.maxLeft)+"°";
  $("maxRight").textContent=Math.round(state.maxRight)+"°";
}

function updateUI(){$("speed").textContent=Math.round(state.speed);$("teleSpeed").textContent=Math.round(state.speed);$("teleLong").textContent=fmt(state.ax,2);$("teleLat").textContent=fmt(state.ay,2);$("teleVert").textContent=fmt(state.az,2);$("maxSpeed").textContent=Math.round(state.maxSpeed)+" km/h";$("distance").textContent=fmt(state.distance,2);$("maxAccel").textContent=fmt(state.maxAccel,2);$("maxBrake").textContent=fmt(state.maxBrake,2);$("accelLong").textContent=fmt(state.ax,2);$("accelLat").textContent=fmt(state.ay,2);$("accelVert").textContent=fmt(state.az,2);$("teleAccel").textContent=fmt(state.maxAccel,2);$("teleBrake").textContent=fmt(state.maxBrake,2);$("duration").textContent=timeText(state.elapsed+(state.running?Date.now()-state.start:0));updateLean()}
function timeText(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);return h?`${String(h).padStart(2,"0")}:${String(m%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function resetMetrics(){state.maxSpeed=state.distance=state.maxLeft=state.maxRight=state.maxAccel=state.maxBrake=state.maxLat=0;state.lastPos=null;state.route=[]}
function setButtons(){$("startBtn").disabled=state.running;$("pauseBtn").disabled=!state.running;$("stopBtn").disabled=!state.running&&!state.paused;$("pauseBtn").textContent=state.paused?"REPRISE":"PAUSE";$("startBtn").textContent=state.paused?"REPRISE":state.running?"ACTIF":"START";$("sessionState").textContent=state.running?"SESSION EN COURS":state.paused?"SESSION EN PAUSE":"EN ATTENTE"}
$("startBtn").onclick=()=>{if(!state.running){if(!state.paused){resetMetrics();state.elapsed=0}state.start=Date.now();state.running=true;state.paused=false;setButtons();if(!navigator.geolocation){$("gpsStatus").textContent="GPS INDISPONIBLE";return}startGps();}};
$("pauseBtn").onclick=()=>{if(state.running){state.elapsed+=Date.now()-state.start;state.running=false;state.paused=true;if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null}else if(state.paused){state.start=Date.now();state.running=true;state.paused=false;startGps()}setButtons();};
$("stopBtn").onclick=()=>{if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;state.elapsed+=state.running?Date.now()-state.start:0;state.running=false;state.paused=false;const rec={date:new Date().toISOString(),duration:state.elapsed,distance:state.distance,maxSpeed:state.maxSpeed,maxLeft:state.maxLeft,maxRight:state.maxRight,maxAccel:state.maxAccel,maxBrake:state.maxBrake,maxLat:state.maxLat,route:state.route};state.sessions.unshift(rec);state.sessions=state.sessions.slice(0,100);save();renderHistory();setButtons();};
function startGps(){if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(()=>{},e=>gpsError(e),{enableHighAccuracy:true,timeout:10000});state.watchId=navigator.geolocation.watchPosition(pos=>{const c=pos.coords;state.speed=c.speed==null?0:Math.max(0,c.speed*3.6);state.maxSpeed=Math.max(state.maxSpeed,state.speed);$("gpsStatus").textContent="GPS CONNECTÉ";$("gpsDot").classList.add("ok");$("geoStatus").textContent="CONNECTÉ";$("coords").textContent=`${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)} · ±${Math.round(c.accuracy)} m`;if(state.running&&c.accuracy<=30){if(state.lastPos){const d=distance(state.lastPos.latitude,state.lastPos.longitude,c.latitude,c.longitude);if(d<0.2)state.distance+=d}state.route.push({lat:c.latitude,lon:c.longitude});state.lastPos={latitude:c.latitude,longitude:c.longitude}}updateUI()},gpsError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000})}
function gpsError(e){$("gpsStatus").textContent=e.code===1?"GPS NON AUTORISÉ":"GPS INDISPONIBLE";$("geoStatus").textContent=$("gpsStatus").textContent}
function distance(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,dl=rad(c-a),dn=rad(d-b);const q=Math.sin(dl/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
$("calibrateBtn").onclick=()=>{state.offset=state.lean;updateLean();$("sensorHint").textContent="Zéro recalibré."};
$("resetLeanBtn").onclick=()=>{state.maxLeft=state.maxRight=0;updateLean()};
$("clearHistory").onclick=()=>{if(confirm("Supprimer tout l'historique des sessions ?")){state.sessions=[];save();renderHistory()}};
function renderHistory(){const root=$("historyList");if(!state.sessions.length){root.innerHTML='<div class="empty panel">Aucune session enregistrée.</div>';return}root.innerHTML=state.sessions.map((s,i)=>`<article class="panel history-card"><div><h3>Session ${state.sessions.length-i} · ${new Date(s.date).toLocaleString("fr-FR")}</h3><p>${timeText(s.duration)} · ${fmt(s.distance,2)} km</p><div class="history-stats"><span>Vmax ${Math.round(s.maxSpeed)} km/h</span><span>Inclinaison ${fmt(s.maxLeft)}° / ${fmt(s.maxRight)}°</span><span>Accél. ${fmt(s.maxAccel,2)} G</span><span>Frein. ${fmt(s.maxBrake,2)} G</span></div></div><button class="btn ghost" data-delete="${i}">Supprimer</button></article>`).join("");root.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{state.sessions.splice(Number(b.dataset.delete),1);save();renderHistory()})}
function requestSensors(){const orient=()=>{if(typeof DeviceOrientationEvent!=="undefined"){const ev=e=>{if(e.gamma==null)return;const angle = screen.orientation?.angle ?? window.orientation ?? 0;

if (angle === 90 || angle === -270) {
    state.lean = -e.beta;
} else if (angle === 270 || angle === -90) {
    state.lean = e.beta;
} else {
    state.lean = e.gamma;
}; $("orientationStatus").textContent="ACTIF";updateLean()};window.addEventListener("deviceorientation",ev);$("sensorHint").textContent="Inclinaison active. Fixe solidement le téléphone avant tout essai."; }else $("orientationStatus").textContent="NON DISPONIBLE"};
const motion=()=>{if(typeof DeviceMotionEvent!=="undefined"){window.addEventListener("devicemotion",e=>{const a=e.acceleration; if(!a||a.x==null)return;state.ax=(a.x||0)/9.81;state.ay=(a.y||0)/9.81;state.az=(a.z||0)/9.81;if(state.running){state.maxAccel=Math.max(state.maxAccel,state.ax);state.maxBrake=Math.max(state.maxBrake,-state.ax);state.maxLat=Math.max(state.maxLat,Math.abs(state.ay))}updateUI()});$("motionStatus").textContent="ACTIF"}else $("motionStatus").textContent="NON DISPONIBLE"};
const ask=async()=>{try{if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p==="granted")orient();else $("orientationStatus").textContent="REFUSÉ"}else orient();if(typeof DeviceMotionEvent!=="undefined"&&typeof DeviceMotionEvent.requestPermission==="function"){const p=await DeviceMotionEvent.requestPermission();if(p==="granted")motion();else $("motionStatus").textContent="REFUSÉ"}else motion()}catch(e){$("orientationStatus").textContent="PERMISSION REFUSÉE";$("motionStatus").textContent="PERMISSION REFUSÉE"}};
document.addEventListener("click",function first(){ask();document.removeEventListener("click",first)},{once:true});}
drawTicks();load();setButtons();updateUI();requestSensors();setInterval(()=>{if(state.running)updateUI()},250);
if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
