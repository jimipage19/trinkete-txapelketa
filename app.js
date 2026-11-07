import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,signInAnonymously,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,runTransaction,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyBvCzJ7mM-S-ov65HeGZ4Uqf4yAIo_YeKI',authDomain:'trinkete-txapelketa.firebaseapp.com',projectId:'trinkete-txapelketa',storageBucket:'trinkete-txapelketa.firebasestorage.app',messagingSenderId:'367761843147',appId:'1:367761843147:web:1813eea95c3794872b4c4e'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id), counter=doc(db,'config','contador');
// 30/11/2026 23:59, hora peninsular (UTC+1 en noviembre).
const CIERRE_MS=Date.parse('2026-11-30T23:59:00+01:00');
let enabled=false, busy=false, configData=null;
const normPhone=s=>s.replace(/[\s().-]/g,'');
const normEmail=s=>s.trim().toLowerCase();
function isOpen(c){return !!c?.abierto && (Date.now()<CIERRE_MS || c?.aperturaExcepcional===true);}

function showClosed(){ $('signup').hidden=true; $('setup').hidden=false; $('setup').textContent='Izen-ematea itxita dago.'; }
function display(num){ $('signup').hidden=true;$('setup').hidden=true;$('ordainketa-emaitza').hidden=false;$('izen-emate-zenbakia').textContent=String(num).padStart(3,'0');const pay=num<=24;$('ordainketa-baimenduta').hidden=!pay;$('itxaron-emaitza').hidden=pay;if(pay)$('bizum-kontzeptua').textContent='TRINKETE-'+String(num).padStart(3,'0'); }
function state(c){configData=c;enabled=isOpen(c); if(!enabled){showClosed();return;} if(!$('ordainketa-emaitza').hidden)return; $('setup').hidden=true;$('signup').hidden=false;}
async function main(){showClosed();try{
 let u=auth.currentUser|| (await signInAnonymously(auth)).user;
 let own=doc(db,'inscripciones',u.uid);
 const existing=await getDoc(own);
 if(existing.exists()&&existing.data().estado==='baliogabetuta'){
  await signOut(auth);u=(await signInAnonymously(auth)).user;own=doc(db,'inscripciones',u.uid);
 }else if(existing.exists()){display(existing.data().numero);return;}
 onSnapshot(counter,s=>state(s.exists()?s.data():null),()=>showClosed());
 setInterval(()=>{if(configData)state(configData);},15000);
 $('signup').addEventListener('submit',async ev=>{ev.preventDefault();if(busy||!enabled)return;const f=ev.currentTarget; if(!f.reportValidity())return;
 const p1=f.elements.player1.value.trim(),p2=f.elements.player2.value.trim(),phone=normPhone(f.elements.phone.value),email=normEmail(f.elements.email.value);
 if(!p1||!p2||!/^\+?[0-9]{9,15}$/.test(phone)||!email||email.includes('/')){$('form-msg').textContent='Egiaztatu telefonoa eta helbide elektronikoa.';return;}
 busy=true;$('submit').disabled=true;$('form-msg').textContent='Izen-ematea gordetzen…';
 try {const n=await runTransaction(db,async t=>{
   const c=await t.get(counter),e=await t.get(own);
   if(e.exists())return e.data().numero;
   if(!c.exists()||!isOpen(c.data()))throw Error('itxita');
   const next=c.data().ultimoNumero+1;
   // Erreserba-dokumentuak soilik SORTU daitezke; lehendik badaude,
   // Firestore-ko arauek eragiketa osoa baztertzen dute.
   t.set(doc(db,'telefonoErreserbak',phone),{uid:u.uid,telefono:phone});
   t.set(doc(db,'emailErreserbak',email),{uid:u.uid,email});
   t.set(own,{numero:next,jugador1:p1,jugador2:p2,telefono:phone,email,estado:next<=24?'pendiente':'espera',prueba:false,creado:serverTimestamp()});
   t.update(counter,{ultimoNumero:next});return next;
 });display(n);}
 catch(e){$('form-msg').textContent=e.message==='itxita'?'Izen-ematea itxita dago.':
 e.code==='permission-denied'||e.code==='already-exists'?'Telefono zenbaki edo helbide elektroniko honekin dagoeneko izen-emate bat dago, edo ezin izan da izen-ematea balioztatu.':
 'Ezin izan da izen-ematea gorde. Saiatu berriro. ('+(e.code||'errorea')+')';}
 finally{busy=false;$('submit').disabled=false;}
 });
}catch(e){$('setup').textContent='Ezin izan da izen-ematea prestatu: '+(e.code||'errorea');}}
main();
