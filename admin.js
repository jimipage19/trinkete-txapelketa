import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, getDoc, runTransaction, deleteField } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const config = {
  apiKey: 'AIzaSyBvCzJ7mM-S-ov65HeGZ4Uqf4yAIo_YeKI',
  authDomain: 'trinkete-txapelketa.firebaseapp.com',
  projectId: 'trinkete-txapelketa',
  storageBucket: 'trinkete-txapelketa.firebasestorage.app',
  messagingSenderId: '367761843147',
  appId: '1:367761843147:web:1813eea95c3794872b4c4e'
};
const allowed = new Set(['andoitz1919@gmail.com', 'vazqueziturriondoiban@gmail.com', 'artetxuki@gmail.com']);
const app=initializeApp(config), auth=getAuth(app), db=getFirestore(app), provider=new GoogleAuthProvider();
const el=id=>document.getElementById(id), msg=t=>el('admin-msg').textContent=t;
provider.setCustomParameters({prompt:'select_account'});
el('signin').addEventListener('click',async()=>{
  msg('');
  try { await signInWithPopup(auth,provider); }
  catch(e) {
    if (e.code==='auth/popup-blocked') { await signInWithRedirect(auth,provider); return; }
    msg('Ezin izan da Google bidez sartu: '+e.code);
  }
});
el('signout').addEventListener('click',async()=>{await signOut(auth);msg('Saioa itxita.');});
getRedirectResult(auth).catch(e=>msg('Saioa hasteko errorea: '+e.code));
onAuthStateChanged(auth,async user=>{
  const permitted=!!user && !!user.email && allowed.has(user.email.toLowerCase()) && user.emailVerified;
  el('login').hidden=permitted;
  el('dashboard').hidden=!permitted;
  if(permitted){el('account').textContent='Saioa hasita: '+user.email;msg('Sarbidea egiaztatuta.');await loadEntries();await loadRegistrationStatus();}
  else if(user){const email=user.email || '(helbiderik gabe)';msg('Kontu honek ez du administratzaile baimenik. Erabilitako kontua: '+email+'. Egiaztatu Google kontu zuzena hautatu duzula.');await signOut(auth);}
});

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentRows=[];
const active = x => x.prueba !== true && ['pendiente','pagado','ofrecida'].includes(x.estado);
const CIERRE_MS=Date.parse('2026-11-30T23:59:00+01:00');
const normPhone=s=>String(s||'').replace(/[\s().-]/g,'');
const normEmail=s=>String(s||'').trim().toLowerCase();
const effectiveOpen=c=>c?.abierto===true&&(Date.now()<CIERRE_MS||c?.aperturaExcepcional===true);
const fmtNum = n => String(n).padStart(3,'0');
function deadline(x){if(!x.notificado || typeof x.notificado.toDate!=='function')return null;return new Date(x.notificado.toDate().getTime()+48*3600*1000);}
function formatInstant(d){return new Intl.DateTimeFormat('eu-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
async function loadEntries(){
 const entries=el('entries'),stats=el('stats');entries.textContent='Izen-emateak kargatzen…';
 try{
  const snap=await getDocs(query(collection(db,'inscripciones'),orderBy('numero','asc')));
  currentRows=snap.docs.map(d=>({id:d.id,...d.data()}));const rows=currentRows;
  const occupied=rows.filter(active).length;
  const firstWaiting=rows.find(x=>x.prueba!==true&&x.estado==='espera');
  const canOffer=occupied<24 && !!firstWaiting;
  stats.innerHTML=`<div><span>Plaza aktiboak</span><strong>${occupied}/24</strong></div><div><span>Ordainduta</span><strong>${rows.filter(x=>x.estado==='pagado').length}</strong></div><div><span>Itxaron-zerrenda</span><strong>${rows.filter(x=>x.estado==='espera').length}</strong></div>`;
  if(!rows.length){entries.textContent='Oraindik ez dago izen-ematerik.';return;}
  entries.innerHTML=rows.map(x=>{
   const offered=x.estado==='ofrecida';const limit=deadline(x);const expired=limit&&Date.now()>limit.getTime();
   const offerButton=canOffer&&firstWaiting.id===x.id?`<button class="offer" data-id="${safe(x.id)}" type="button">Plaza eskaini (posta prestatu)</button>`:'';
   const confirmButton=x.estado==='espera'&&canOffer&&firstWaiting.id===x.id?`<button class="sent" data-id="${safe(x.id)}" type="button">Jakinarazpena bidalita</button>`:'';
   const payButton=x.prueba!==true&&['pendiente','ofrecida'].includes(x.estado)?`<button class="pay-real" data-id="${safe(x.id)}" type="button">Ordainketa baieztatu</button>`:'';
   const undoButton=x.prueba!==true&&x.estado==='pagado'?`<button class="undo-real" data-id="${safe(x.id)}" type="button">Ordainketa desegin</button>`:'';
   const annulButton=x.prueba!==true&&['pendiente','espera','ofrecida','pagado'].includes(x.estado)?`<button class="annul-real" data-id="${safe(x.id)}" type="button">Baliogabetu</button>`:'';
   return `<div class="entry"><strong>#${safe(fmtNum(x.numero))} · ${safe(x.jugador1)} / ${safe(x.jugador2)}</strong><small>${safe(x.email)} · ${safe(x.telefono)}</small><small>Egoera: ${safe(x.estado||'jasota')}</small><small>Izen-emate data: ${safe(formatDate(x.creado))}</small>${(x.estado==='pendiente' && Date.now()>CIERRE_MS || offered&&expired)?'<small style="color:#9d4444">EPEA AMAITUTA — egiaztatu Bizumaren benetako data.</small>':''}${x.gestionHistorial?.length?`<small>Azken aldaketa: ${safe(x.gestionHistorial[x.gestionHistorial.length-1].ekintza)} · ${safe(x.gestionHistorial[x.gestionHistorial.length-1].admin)} · ${safe(formatDate(x.gestionHistorial[x.gestionHistorial.length-1].unea))}</small>`:''}${offered?`<small>Jakinarazpena: ${safe(formatDate(x.notificado))} · Ordaintzeko muga: ${limit?safe(formatInstant(limit)):'—'} ${expired?'(EPEA AMAITUTA)':''}</small>`:''}<div class="toolbar" style="margin-top:9px">${offerButton}${confirmButton}${payButton}${undoButton}${annulButton}</div></div>`;
  }).join('');
  entries.querySelectorAll('.offer').forEach(b=>b.addEventListener('click',()=>prepareEmail(b.dataset.id)));
  entries.querySelectorAll('.sent').forEach(b=>b.addEventListener('click',()=>markSent(b.dataset.id,b)));
  entries.querySelectorAll('.pay-real').forEach(b=>b.addEventListener('click',()=>changeReal(b.dataset.id,'pagado',b)));
  entries.querySelectorAll('.undo-real').forEach(b=>b.addEventListener('click',()=>changeReal(b.dataset.id,'desegin',b)));
  entries.querySelectorAll('.annul-real').forEach(b=>b.addEventListener('click',()=>changeReal(b.dataset.id,'baliogabetuta',b)));
 }catch(e){entries.textContent='Ezin izan dira izen-emateak irakurri: '+(e.code||e.message);}
}
function prepareEmail(id){
 const x=currentRows.find(r=>r.id===id);if(!x||x.estado!=='espera')return;
 const concept='TRINKETE-'+fmtNum(x.numero);
 const subject='III. Trinkete Txapelketa – Plaza eskainita';
 const body=`Kaixo!\n\nIII. Trinkete Txapelketan parte hartzeko plaza bat eskaini zaizue.\n\nIzen-emate zenbakia: ${fmtNum(x.numero)}\n\nBizum: 638 051 253\nZenbatekoa: 20 €\nKontzeptua: ${concept}\n\nJakinarazpen hau bidaltzen denetik 48 ordu izango dituzue ordainketa egiteko. Ordainketa epe barruan egiten ez bada, plaza galduko da.\n\nEskerrik asko!`;
 window.location.href='mailto:'+encodeURIComponent(x.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 msg('Posta ireki da. Bidali ondoren, sakatu "Jakinarazpena bidalita".');
}
// Administrazio-ekintza guztiak kontagailuaren dokumentuaren bidez
// serializatzen dira; alta berriak ere dokumentu hori idazten dute.
// Transakzioan berrirakurtzen dira inskripzio guztiak (ez pantailako datuak).
async function coordinated(action){
 const snapshot=await getDocs(query(collection(db,'inscripciones'),orderBy('numero','asc')));
 return runTransaction(db,async t=>{
  const c=await t.get(doc(db,'config','contador'));
  if(!c.exists())throw Error('Kontagailua falta da');
  const snaps=[];
  for(const d of snapshot.docs)snaps.push(await t.get(d.ref));
  const rows=snaps.filter(s=>s.exists()).map(s=>({id:s.id,...s.data()}));
  const result=await action(t,rows,c.data());
  t.update(doc(db,'config','contador'),{gestionRevision:(c.data().gestionRevision||0)+1});
  return result;
 });
}
async function markSent(id,button){
 if(!confirm('Posta benetan bidali duzu? Baieztatzean 48 orduko epea hasiko da.'))return;
 button.disabled=true;
 try{
  await coordinated((t,rows)=>{
   const waiting=rows.filter(x=>x.prueba!==true&&x.estado==='espera').sort((a,b)=>a.numero-b.numero);
   const occupied=rows.filter(active).length;
   if(occupied>=24||waiting[0]?.id!==id)throw Error('Ez dago plaza librerik edo bikotea ez da lehenengoa.');
   t.update(doc(db,'inscripciones',id),{estado:'ofrecida',notificado:serverTimestamp()});
  });
  msg('Jakinarazpena erregistratuta. 48 orduko epea hasi da.');await loadEntries();
 }catch(e){msg('Ezin izan da eskaintza gorde: '+(e.code||e.message));button.disabled=false;}
}
el('refresh').disabled=false;
el('refresh').addEventListener('click',()=>{if(auth.currentUser && allowed.has((auth.currentUser.email||'').toLowerCase())){loadEntries();loadRegistrationStatus();}});
async function changeReal(id,status,button){
 const xOnScreen=currentRows.find(r=>r.id===id);
 if(!xOnScreen)return;
 const warning=status==='pagado'
  ? 'Bizuma egiaztatu duzu? Epez kanpo bada, ordainketa garaiz egin zela egiaztatu.'
  : status==='desegin'
  ? 'Ordainketa baieztapena desegin? Bikoteak plaza mantenduko du eta aurreko egoerara itzuliko da.'
  : xOnScreen.estado==='pagado'
  ? 'ADI: bikote hau ORDAINDUTA dago. Izen-ematea baliogabetzeak plaza askatuko du. Egiaztatu itzulketa edo ordainketa kudeaketa. Jarraitu?'
  : 'Izen-emate hau baliogabetu? Zenbakia ez da berrerabiliko.';
 if(!confirm(warning))return;
 button.disabled=true;
 try{
  await coordinated(async(t,rows)=>{
   const x=rows.find(r=>r.id===id);
   if(!x||x.prueba===true)throw Error('Egoera aldatu da');
   const changes={};
   if(status==='pagado'){
    if(!['pendiente','ofrecida'].includes(x.estado))throw Error('Ezin da egoera honetako ordainketa baieztatu');
    if(x.estado==='pendiente'&&x.numero>24)throw Error('Plaza ez dago esleituta');
    changes.estado='pagado';
    changes.estadoAntesPago=x.estado;
   }else if(status==='desegin'){
    if(x.estado!=='pagado')throw Error('Bikotea ez dago ordainduta');
    const previous=x.estadoAntesPago || (x.numero<=24?'pendiente':(x.notificado?'ofrecida':null));
    if(!['pendiente','ofrecida'].includes(previous))throw Error('Ezin da aurreko egoera zehaztu');
    changes.estado=previous;
    changes.estadoAntesPago=deleteField();
   }else if(status==='baliogabetuta'){
    if(!['pendiente','espera','ofrecida','pagado'].includes(x.estado))throw Error('Egoera aldatu da');
    const phoneRef=doc(db,'telefonoErreserbak',normPhone(x.telefono));
    const emailRef=doc(db,'emailErreserbak',normEmail(x.email));
    const phone=await t.get(phoneRef),email=await t.get(emailRef);
    if(phone.exists()&&phone.data().uid===id)t.delete(phoneRef);
    if(email.exists()&&email.data().uid===id)t.delete(emailRef);
    changes.estado='baliogabetuta';
    if(x.estadoAntesPago)changes.estadoAntesPago=deleteField();
   }else throw Error('Ekintza ezezaguna');
   // Historial persistente: registra usuario, accion, estado previo y fecha del servidor.
   const history=Array.isArray(x.gestionHistorial)?x.gestionHistorial:[];
   changes.gestionHistorial=[...history,{ekintza:status,aurrekoa:x.estado,berria:changes.estado,admin:auth.currentUser.email,unea:new Date()}];
   t.update(doc(db,'inscripciones',id),changes);
  });
  msg('Aldaketa gordeta.');await loadEntries();
 }catch(e){msg('Ezin izan da aldatu: '+(e.code||e.message));button.disabled=false;}
}

// Izen-emateak ireki/itxi: administratzaile baimenduentzat soilik.
const registrationRef=doc(db,'config','contador');
let registrationOpen=false;
async function loadRegistrationStatus(){
 const status=el('registration-status'), toggle=el('registration-toggle');
 toggle.disabled=true;
 try {
  const snapshot=await getDoc(registrationRef);
  if(!snapshot.exists()){status.textContent='Kontagailua ez da aurkitu.';return;}
  registrationOpen=effectiveOpen(snapshot.data());
  status.textContent=registrationOpen?'IREKITA':(snapshot.data().abierto===true?'ITXITA (epe automatikoa amaituta)':'ITXITA');
  toggle.textContent=registrationOpen?'Itxi izen-emateak':'Ireki izen-emateak';
  toggle.disabled=false;
 }catch(e){status.textContent='Ezin izan da egoera irakurri: '+e.code;}
}
el('registration-toggle').addEventListener('click',async()=>{
 const user=auth.currentUser;
 if(!user||!user.emailVerified||!allowed.has((user.email||'').toLowerCase()))return;
 const next=!registrationOpen;
 if(!confirm(next?'Izen-emateak publikoki IREKI nahi dituzu?':'Izen-emateak ITXI nahi dituzu?'))return;
 const button=el('registration-toggle');button.disabled=true;
 try{await updateDoc(registrationRef,{abierto:next,aperturaExcepcional:next&&Date.now()>=CIERRE_MS});msg(next?'Izen-emateak ireki dira.':'Izen-emateak itxi dira.');}
 catch(e){msg('Ezin izan da egoera aldatu: '+e.code);}
 finally{await loadRegistrationStatus();}
});

// Firestore-ko zerbitzariaren ordua, Euskadiko ordu-eremuan.
function formatDate(value){
 if(!value || typeof value.toDate !== 'function') return 'Zehaztu gabe';
 return new Intl.DateTimeFormat('eu-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value.toDate());
}
