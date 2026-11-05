import {firebaseConfig} from './firebase-config.js';
const form=document.querySelector('#signup'),setup=document.querySelector('#setup'),msg=document.querySelector('#form-msg'),result=document.querySelector('#result');
if(firebaseConfig.apiKey&&firebaseConfig.projectId){
  try{
    const [{initializeApp},{getFunctions,httpsCallable}]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js')]);
    const app=initializeApp(firebaseConfig),register=httpsCallable(getFunctions(app,'europe-west1'),'registerPair');
    setup.hidden=true;form.hidden=false;
    form.addEventListener('submit',async e=>{e.preventDefault();const btn=document.querySelector('#submit');btn.disabled=true;msg.textContent='Izen-ematea bidaltzen...';const fd=new FormData(form);try{const r=(await register({player1:fd.get('player1'),player2:fd.get('player2'),phone:fd.get('phone'),email:fd.get('email'),privacy:fd.get('privacy')==='on'})).data;form.hidden=true;result.hidden=false;result.className='success';result.textContent=`Izen-ematea jasota! Zure zenbakia: ${String(r.number).padStart(3,'0')}. ${r.status==='pending'?'Plaza ordaintzeko aukera duzue. Egin 20 €-ko Bizuma 638 051 253 zenbakira, TRINKETE-'+String(r.number).padStart(3,'0')+' kontzeptuarekin, azaroaren 30a baino lehen.':'Itxaron-zerrendan zaudete. Ez egin Bizumik plaza bat eskaini arte.'}`;}catch(err){msg.textContent='Ezin izan da izen-ematea osatu. Saiatu berriro edo jarri harremanetan antolatzailearekin.';console.error(err);}finally{btn.disabled=false;}});
  }catch(err){setup.textContent='Izen-ematea ez dago erabilgarri une honetan.';console.error(err);}
}
