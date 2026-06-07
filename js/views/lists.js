// js/views/lists.js — modules en liste configurés via le moteur CRUD
import { collectionView } from '../lib/crud.js';
import { fmtDate, fmtMoney, esc } from '../lib/ui.js';

const typeEmoji = { Camping:'⛺', Ferry:'⛴️', Train:'🚆', Restaurant:'🍽️', Activité:'🎟️', 'Aire camping-car':'🚐' };
const actEmoji  = { Visite:'🏛️', Marché:'🧺', Randonnée:'🥾', Plage:'🏖️', Sport:'🚴', Autre:'📍' };

export const Hikes = () => collectionView({
  coll:'hikes', title:'Randonnées', emoji:'🥾', addLabel:'Randonnée', scopeTrip:true,
  intro:'Distance, dénivelé et temps estimé. (Import GPX disponible depuis la carte.)',
  fields:[
    { name:'title', label:'Sentier' },
    { name:'dist', label:'Distance (km)', type:'number' },
    { name:'deniv', label:'Dénivelé (m)', type:'number' },
    { name:'time', label:'Temps estimé', placeholder:'3h00' },
    { name:'date', label:'Date', type:'date' },
    { name:'note', label:'Notes', type:'textarea', full:true },
  ],
  row:(r)=>({ ic:'🥾', title:r.title,
    sub:`📏 ${esc(r.dist)} km · ⛰️ ${esc(r.deniv)} m · ⏱️ ${esc(r.time)} ${r.note?`· ${esc(r.note)}`:''}`,
    meta: r.date?`<small>${fmtDate(r.date)}</small>`:'' }),
});

export const Animals = () => collectionView({
  coll:'animals', title:'Animaux', emoji:'🐾', addLabel:'Animal',
  intro:'Carnet de santé, vaccins, traitements et documents vétérinaires.',
  fields:[
    { name:'name', label:'Nom' },
    { name:'kind', label:'Espèce', type:'select', options:['Chien','Chat','Autre'] },
    { name:'breed', label:'Race' },
    { name:'vaccins', label:'Vaccins', type:'textarea', full:true },
    { name:'treatments', label:'Traitements', type:'textarea', full:true },
    { name:'vetDoc', label:'Document vétérinaire' },
    { name:'note', label:'Note', type:'textarea', full:true },
  ],
  row:(r)=>({ ic: r.kind==='Chat'?'🐱':r.kind==='Chien'?'🐶':'🐾', title:`${esc(r.name)} · ${esc(r.breed||r.kind)}`,
    sub:`💉 ${esc(r.vaccins||'—')} · 💊 ${esc(r.treatments||'—')} ${r.vetDoc?`· 📎 ${esc(r.vetDoc)}`:''}`,
    meta:'' }),
});

export const Maintenance = () => collectionView({
  coll:'maintenance', title:"Carnet d'entretien", emoji:'🔧', addLabel:'Intervention', groupBy:'vehicle',
  intro:'Camping-car, caravane, véhicule tracteur : révisions, CT, pneus, vidanges, historique.',
  fields:[
    { name:'vehicle', label:'Véhicule', type:'select', options:['Camping-car','Caravane','Véhicule tracteur'] },
    { name:'type', label:'Type', type:'select', options:['Révision','Contrôle technique','Pneus','Vidange','Réparation','Autre'] },
    { name:'date', label:'Date', type:'date' },
    { name:'km', label:'Kilométrage', type:'number' },
    { name:'cost', label:'Coût (€)', type:'number' },
    { name:'note', label:'Note', type:'textarea', full:true },
  ],
  row:(r)=>({ ic:'🔧', title:`${esc(r.type)}`,
    sub:`${fmtDate(r.date)} ${Number(r.km)?`· ${Number(r.km).toLocaleString('fr-FR')} km`:''} ${r.note?`· ${esc(r.note)}`:''}`,
    meta: Number(r.cost)>0 ? `<b>${fmtMoney(r.cost)}</b>` : '' }),
});

export const Documents = () => collectionView({
  coll:'documents', title:'Documents', emoji:'📁', addLabel:'Document', scopeTrip:true, groupBy:'cat',
  intro:'Passeports, assurances, réservations… Classement automatique par catégorie. (PDF & photos.)',
  fields:[
    { name:'title', label:'Intitulé' },
    { name:'cat', label:'Catégorie', type:'select', options:['Identité','Assurance','Réservation','Santé','Transport','Autre'] },
    { name:'kind', label:'Type', type:'select', options:['PDF','Photo'] },
  ],
  row:(r)=>({ ic: r.kind==='Photo'?'🖼️':'📄', title:r.title, sub:esc(r.cat),
    meta:`<span class="tag">${esc(r.kind)}</span>` }),
});
