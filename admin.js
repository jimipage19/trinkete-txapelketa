import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, addDoc, doc, updateDoc, serverTimestamp, getDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const config = {
  apiKey: 'AIzaSyBvCzJ7mM-S-ov65HeGZ4Uqf4yAIo_YeKI',
  authDomain: 'trinkete-txapelketa.firebaseapp.com',
  projectId: 'trinkete-txapelketa',
  storageBucket: 'trinkete-txapelketa.firebasestorage.app',
  messagingSenderId: '367761843147',
  appId: '1:367761843147:web:1813eea95c3794872b4c4e'
};
const allowed = new Set(['andoitz1919@gmail.com', 'vazqueziturriondoiban@gmail.com']);
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
async function loadEntries(){
  const entries=el('entries'), stats=el('stats');
  entries.textContent='Izen-emateak kargatzen…';
  try {
    const snapshot=await getDocs(query(collection(db,'inscripciones'),orderBy('numero','asc')));
    const rows=snapshot.docs.map(d=>({id:d.id,...d.data()}));
    stats.innerHTML=`<div><span>Izen-emateak</span><strong>${rows.length}</strong></div><div><span>Ordainduta</span><strong>${rows.filter(x=>x.estado==='pagado').length}</strong></div><div><span>Itxaron-zerrenda</span><strong>${rows.filter(x=>x.estado==='espera').length}</strong></div>`;
    if(!rows.length){entries.textContent='Oraindik ez dago izen-ematerik.';return;}
    entries.innerHTML=rows.map(x=>`<div class="entry"><strong>#${safe(x.numero)} · ${safe(x.jugador1)} / ${safe(x.jugador2)}</strong><small>${safe(x.email)} · ${safe(x.telefono)}</small><small>Egoera: ${safe(x.estado || 'jasota')}</small>${x.prueba !== true && ['pendiente','espera','ofrecida'].includes(x.estado) ? `<button class="pay-real" data-id="${safe(x.id)}" type="button">Ordainketa baieztatu</button> <button class="annul-real" data-id="${safe(x.id)}" type="button">Baliogabetu</button>` : ''}${x.prueba === true && x.estado === 'proba' ? `<button class="annul-test" data-id="${safe(x.id)}" type="button">Probako izen-ematea baliogabetu</button>` : ''}</div>`).join('');
    entries.querySelectorAll('.pay-real').forEach(b=>b.addEventListener('click',()=>changeReal(b.dataset.id,'pagado',b)));entries.querySelectorAll('.annul-real').forEach(b=>b.addEventListener('click',()=>changeReal(b.dataset.id,'baliogabetuta',b)));entries.querySelectorAll('.annul-test').forEach(button => button.addEventListener('click', () => annulTest(button.dataset.id, button)));
  } catch(e) {
    entries.textContent='Ezin izan dira izen-emateak irakurri: '+e.code;
  }
}
el('refresh').disabled=false;
el('refresh').addEventListener('click',()=>{if(auth.currentUser && allowed.has((auth.currentUser.email||'').toLowerCase()))loadEntries();});

// Proba kontrolatua: administratzaileak bakarrik sor dezake test-erregistroa.
el('test-create').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !allowed.has((user.email || '').toLowerCase())) return;
  if (!confirm('Probako bikote bat sortu Firestore-n?')) return;
  el('test-create').disabled = true;
  try {
    await addDoc(collection(db, 'inscripciones'), {
      numero: 1, jugador1: 'PROBA A', jugador2: 'PROBA B',
      email: 'proba@example.invalid', telefono: '000000000',
      estado: 'proba', prueba: true, creado: serverTimestamp()
    });
    msg('Probako bikotea gorde da. Ez da benetako izen-ematea.');
    await loadEntries();
  } catch(e) { msg('Ezin izan da proba gorde: ' + e.code); }
  finally { el('test-create').disabled = false; }
});

// Fase de prueba: solo se permite anular registros ficticios, nunca inscripciones reales.
async function annulTest(id, button) {
  const user=auth.currentUser;
  if(!user || !user.emailVerified || !allowed.has((user.email||'').toLowerCase())) return;
  if(!confirm('Probako izen-emate hau baliogabetu? Erregistroa gordeta geratuko da.')) return;
  button.disabled=true;
  try {
    await updateDoc(doc(db,'inscripciones',id), {estado:'baliogabetuta'});
    msg('Probako izen-ematea baliogabetuta. Zenbakia ez da berrerabiliko.');
    await loadEntries();
  } catch(e) { msg('Ezin izan da baliogabetu: '+e.code); button.disabled=false; }
}

async function changeReal(id,status,button){if(!confirm(status==='pagado'?'Ordainketa egiaztatu duzu?':'Izen-emate hau baliogabetu? Zenbakia ez da berrerabiliko.'))return;button.disabled=true;try{await updateDoc(doc(db,'inscripciones',id),{estado:status});await loadEntries();}catch(e){msg('Ezin izan da aldatu: '+e.code);button.disabled=false;}}

// Izen-emateak ireki/itxi: administratzaile baimenduentzat soilik.
const registrationRef=doc(db,'config','contador');
const registrationDeadline=new Date('2026-12-01T00:00:00+01:00');
let registrationOpen=false;
async function loadRegistrationStatus(){
 const status=el('registration-status'), toggle=el('registration-toggle');
 toggle.disabled=true;
 try {
  const snapshot=await getDoc(registrationRef);
  if(!snapshot.exists()){status.textContent='Kontagailua ez da aurkitu.';return;}
  registrationOpen=snapshot.data().abierto===true;
  const expired=Date.now()>=registrationDeadline.getTime();
  status.textContent=expired?'Epea amaituta (itxita)':registrationOpen?'IREKITA':'ITXITA';
  toggle.textContent=registrationOpen?'Itxi izen-emateak':'Ireki izen-emateak';
  toggle.disabled=expired;
 }catch(e){status.textContent='Ezin izan da egoera irakurri: '+e.code;}
}
el('registration-toggle').addEventListener('click',async()=>{
 const user=auth.currentUser;
 if(!user||!user.emailVerified||!allowed.has((user.email||'').toLowerCase()))return;
 if(Date.now()>=registrationDeadline.getTime()){msg('Izen-emateko epea amaitu da.');return;}
 const next=!registrationOpen;
 if(!confirm(next?'Izen-emateak publikoki IREKI nahi dituzu?':'Izen-emateak ITXI nahi dituzu?'))return;
 const button=el('registration-toggle');button.disabled=true;
 try{await updateDoc(registrationRef,{abierto:next});msg(next?'Izen-emateak ireki dira.':'Izen-emateak itxi dira.');}
 catch(e){msg('Ezin izan da egoera aldatu: '+e.code);}
 finally{await loadRegistrationStatus();}
});
