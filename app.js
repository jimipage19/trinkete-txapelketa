import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,runTransaction,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyBvCzJ7mM-S-ov65HeGZ4Uqf4yAIo_YeKI',authDomain:'trinkete-txapelketa.firebaseapp.com',projectId:'trinkete-txapelketa',storageBucket:'trinkete-txapelketa.firebasestorage.app',messagingSenderId:'367761843147',appId:'1:367761843147:web:1813eea95c3794872b4c4e'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id), counter=doc(db,'config','contador');
let enabled=false, busy=false;
function showClosed(){ $('signup').hidden=true; $('setup').hidden=false; $('setup').textContent='Izen-ematea itxita dago.'; }
function display(num){ $('signup').hidden=true;$('setup').hidden=true;$('ordainketa-emaitza').hidden=false;$('izen-emate-zenbakia').textContent=String(num).padStart(3,'0');const pay=num<=24;$('ordainketa-baimenduta').hidden=!pay;$('itxaron-emaitza').hidden=pay;if(pay)$('bizum-kontzeptua').textContent='TRINKETE-'+String(num).padStart(3,'0'); }
function state(c){enabled=!!c?.abierto; if(!enabled){showClosed();return;} if(!$('ordainketa-emaitza').hidden)return; $('setup').hidden=true;$('signup').hidden=false;}
async function main(){showClosed();try{
 const u=auth.currentUser|| (await signInAnonymously(auth)).user;
 const own=doc(db,'inscripciones',u.uid);
 const existing=await getDoc(own);if(existing.exists()){display(existing.data().numero);return;}
 onSnapshot(counter,s=>state(s.exists()?s.data():null),()=>showClosed());
 $('signup').addEventListener('submit',async ev=>{ev.preventDefault();if(busy||!enabled)return;const f=ev.currentTarget; if(!f.reportValidity())return;
 const p1=f.elements.player1.value.trim(),p2=f.elements.player2.value.trim(),phone=f.elements.phone.value.trim(),email=f.elements.email.value.trim().toLowerCase();
 if(!p1||!p2||!phone||!email)return;
 busy=true;$('submit').disabled=true;$('form-msg').textContent='Izen-ematea gordetzen…';
 try {const n=await runTransaction(db,async t=>{const c=await t.get(counter);const e=await t.get(own);if(e.exists())return e.data().numero;if(!c.exists()||!c.data().abierto)throw Error('itxita');const next=c.data().ultimoNumero+1;
 t.set(own,{numero:next,jugador1:p1,jugador2:p2,telefono:phone,email,estado:next<=24?'pendiente':'espera',prueba:false,creado:serverTimestamp()});t.update(counter,{ultimoNumero:next});return next;});display(n);}
 catch(e){$('form-msg').textContent=e.message==='itxita'?'Izen-ematea itxita dago.':'Ezin izan da izen-ematea gorde. Saiatu berriro. ('+(e.code||'errorea')+')';}
 finally{busy=false;$('submit').disabled=false;}
 });
}catch(e){$('setup').textContent='Ezin izan da izen-ematea prestatu: '+(e.code||'errorea');}}
main();
