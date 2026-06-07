// js/seed.js — données de démonstration (voyage familial en Bretagne)
const soon = (d) => { const x = new Date(); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };

export const SEED = {
  settings: { activeTripId: 'trip1', theme: 'light', family: 'Famille Léo' },

  members: [
    { id:'u1', name:'Papa', role:'Administrateur', email:'papa@famille.fr', color:'#6e8a62' },
    { id:'u2', name:'Maman', role:'Parent', email:'maman@famille.fr', color:'#6fa9cc' },
    { id:'u3', name:'Léa', role:'Enfant', email:'lea@famille.fr', color:'#cf8a6a' },
    { id:'u4', name:'Tom', role:'Enfant', email:'tom@famille.fr', color:'#e7b65a' },
  ],

  trips: [
    { id:'trip1', title:'Tour de Bretagne', destination:'Bretagne', start:soon(24), end:soon(38),
      status:'futur', cover:'🏖️', budget:2500, notes:"Roadtrip en camping-car le long de la côte de granit rose et du Finistère.",
      lat:48.20, lng:-4.10 },
    { id:'trip2', title:'Vercors en famille', destination:'Vercors', start:'2024-07-12', end:'2024-07-22',
      status:'passe', cover:'🏔️', budget:1800, notes:'Randonnées et fraîcheur en montagne.', lat:45.0, lng:5.4 },
    { id:'trip3', title:'Côte basque', destination:'Pays Basque', start:'2023-08-05', end:'2023-08-15',
      status:'passe', cover:'🌊', budget:2100, notes:'Surf et pintxos.', lat:43.48, lng:-1.55 },
  ],

  reservations: [
    { id:'r1', tripId:'trip1', type:'Camping', name:'Camping des Abers', address:'Plage de Toull Treaz, 29870 Landéda', site:'https://www.camping-des-abers.com', phone:'02 98 04 93 35', email:'contact@camping-des-abers.com', arrDate:soon(24), arrTime:'15:00', depDate:soon(31), depTime:'11:00', resaNumber:'AB-2031', resaLink:'', total:420, deposit:120, insurance:true, notes:'Emplacement 42, vue mer. Animaux acceptés en laisse.', docs:[] },
    { id:'r2', tripId:'trip1', type:'Ferry', name:'Ferry Île de Batz', address:'Gare maritime, 29680 Roscoff', site:'', phone:'', email:'', arrDate:soon(27), arrTime:'09:30', depDate:soon(27), depTime:'18:00', resaNumber:'FB-118', resaLink:'', total:64, deposit:64, insurance:false, notes:'Aller-retour 4 pers + vélos.', docs:[] },
    { id:'r3', tripId:'trip1', type:'Restaurant', name:'Crêperie du Port', address:'Le Port, 29870 Landéda', site:'', phone:'02 98 00 00 00', email:'', arrDate:soon(28), arrTime:'19:30', depDate:'', depTime:'', resaNumber:'', resaLink:'', total:0, deposit:0, insurance:false, notes:'Réservé 19h30, 4 couverts.', docs:[] },
    { id:'r4', tripId:'trip1', type:'Activité', name:'Kayak en mer', address:'Base nautique, Landéda', site:'', phone:'', email:'', arrDate:soon(30), arrTime:'10:00', depDate:'', depTime:'', resaNumber:'KAY-77', resaLink:'', total:96, deposit:30, insurance:false, notes:'2h, encadré.', docs:[] },
  ],

  ideas: [
    { id:'id1', title:'Visiter la Loire', destination:'Val de Loire, France', durCat:'1 semaine', budgetCat:'Budget moyen', budget:1400, description:'Châteaux, pistes cyclables le long du fleuve, dégustations. Idéal en famille.', activities:['Château de Chambord','Loire à vélo','Cave de Vouvray'], campings:['Camping Onlycamp de Tours','Camping de Chenonceaux'], notes:'Réserver les châteaux en ligne pour éviter la queue.', photos:[] },
    { id:'id2', title:'Les Calanques', destination:'Provence, France', durCat:'Court séjour (3-5 j)', budgetCat:'Budget moyen', budget:1600, description:'Eaux turquoise entre Marseille et Cassis, baignade et randonnée.', activities:['Calanque d\u2019En-Vau','Sortie en bateau','Sentier du Petit Prince'], campings:['Camping Les Cigales (Cassis)'], notes:'Accès réglementé en été, vérifier les créneaux.', photos:[] },
  ],

  campingsFav: [
    { id:'cf1', name:'Camping des Abers', address:'Plage de Toull Treaz, 29870 Landéda', site:'https://www.camping-des-abers.com', interest:'Favori', notes:'Vue mer, calme, accès direct plage.', photos:[] },
    { id:'cf2', name:'Camping Les Cigales', address:'Route de Marseille, 13260 Cassis', site:'', interest:'À tester', notes:'Proche des calanques, ombragé.', photos:[] },
  ],


  expenses: [
    { id:'e1', tripId:'trip1', cat:'Hébergement', label:'Acompte camping', amount:120, date:soon(-2) },
    { id:'e2', tripId:'trip1', cat:'Transport', label:'Plein gasoil', amount:95, date:soon(-1) },
    { id:'e3', tripId:'trip1', cat:'Activités', label:'Réservation kayak', amount:96, date:soon(0) },
    { id:'e4', tripId:'trip1', cat:'Courses', label:'Provisions départ', amount:140, date:soon(0) },
  ],

  activities: [
    { id:'a1', tripId:'trip1', title:'Phare de Ploumanac’h', cat:'Visite', status:'envie', price:0, pets:true, dist:'4 km', note:'Au coucher du soleil', link:'', photos:[] },
    { id:'a2', tripId:'trip1', title:'Marché de Roscoff', cat:'Marché', status:'enregistre', price:0, pets:true, dist:'8 km', note:'Mercredi matin', link:'', photos:[] },
    { id:'a3', tripId:'trip1', title:'Sentier des douaniers GR34', cat:'Randonnée', status:'envie', price:0, pets:true, dist:'2 km', note:'Boucle 9 km', link:'', photos:[] },
    { id:'a4', tripId:'trip1', title:'Océanopolis', cat:'Visite', status:'enregistre', price:88, pets:false, dist:'45 km', note:'Idéal jour de pluie. Tarif famille 4 pers.', link:'', photos:[] },
  ],

  hikes: [
    { id:'h1', tripId:'trip1', title:'GR34 — Pointe de l’Arcouest', dist:9.2, deniv:240, time:'3h00', date:soon(29), note:'Vue sur Bréhat' },
    { id:'h2', tripId:'trip2', title:'Plateau du Vercors', dist:14.5, deniv:680, time:'5h30', date:'2024-07-15', note:'Prévoir eau ++' },
  ],

  animals: [
    { id:'p1', name:'Filou', kind:'Chien', breed:'Border collie', vaccins:'Rage (valide 2026), CHPL ok',
      treatments:'Antiparasitaire mensuel', vetDoc:'passeport-filou.pdf', note:'Carnet de santé à jour' },
  ],

  maintenance: [
    { id:'m1', vehicle:'Camping-car', type:'Révision', date:soon(-40), km:84200, cost:380, note:'Vidange + filtres' },
    { id:'m2', vehicle:'Camping-car', type:'Contrôle technique', date:soon(120), km:0, cost:0, note:'À prévoir' },
    { id:'m3', vehicle:'Camping-car', type:'Pneus', date:soon(-200), km:79000, cost:520, note:'4 pneus neufs' },
  ],

  inventory: [
    { id:'i1', cat:'Cuisine', item:'Réchaud à gaz', qty:1, packed:true },
    { id:'i2', cat:'Cuisine', item:'Glacière électrique', qty:1, packed:true },
    { id:'i3', cat:'Électricité', item:'Câble rallonge 25m', qty:1, packed:false },
    { id:'i4', cat:'Randonnée', item:'Sacs à dos', qty:4, packed:false },
    { id:'i5', cat:'Vélo', item:'Vélos + casques', qty:4, packed:false },
    { id:'i6', cat:'Mobilier', item:'Table + chaises pliantes', qty:1, packed:true },
  ],

  checklists: [
    { id:'c1', list:'Départ', label:'Vérifier niveaux camping-car', done:true },
    { id:'c2', list:'Départ', label:'Plein d’eau propre', done:false },
    { id:'c3', list:'Départ', label:'Vider eaux usées', done:false },
    { id:'c4', list:'Documents', label:'Cartes d’identité', done:true },
    { id:'c5', list:'Documents', label:'Carnet de santé Filou', done:true },
    { id:'c6', list:'Courses', label:'Eau + boissons', done:false },
    { id:'c7', list:'Matériel', label:'Trousse de secours', done:false },
  ],

  documents: [
    { id:'d1', tripId:'trip1', cat:'Réservation', title:'Confirmation Camping des Abers', kind:'PDF' },
    { id:'d2', tripId:'trip1', cat:'Assurance', title:'Attestation assistance voyage', kind:'PDF' },
    { id:'d3', tripId:'trip1', cat:'Identité', title:'Passeports (scan)', kind:'Photo' },
  ],

  itineraries: [
    { id:'it1', tripId:'trip1', stops:[
      { name:'Départ Maison', lat:47.47, lng:-0.55 },
      { name:'Camping des Abers', lat:48.55, lng:-4.55 },
      { name:'Ploumanac’h', lat:48.82, lng:-3.46 },
      { name:'Roscoff', lat:48.72, lng:-3.98 },
    ]},
  ],

  places: [
    { id:'pl1', tripId:'trip1', cat:'Camping', name:'Camping des Abers', lat:48.55, lng:-4.55 },
    { id:'pl2', tripId:'trip1', cat:'Activité', name:'Phare de Ploumanac’h', lat:48.82, lng:-3.46 },
    { id:'pl3', tripId:'trip1', cat:'Restaurant', name:'Crêperie du Port', lat:48.72, lng:-3.98 },
    { id:'pl4', tripId:'trip1', cat:'Supermarché', name:'Marché de Roscoff', lat:48.726, lng:-3.985 },
    { id:'pl5', tripId:'trip1', cat:'Station-service', name:'Station Morlaix', lat:48.58, lng:-3.83 },
    { id:'pl6', tripId:'trip1', cat:'Aire de services', name:'Aire camping-car Perros', lat:48.81, lng:-3.44 },
  ],
};
