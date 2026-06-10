// js/seed.js — données de démonstration (voyage familial en Bretagne)
const soon = (d) => { const x = new Date(); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };

export const SEED = {
  settings: { activeTripId: 'trip1', theme: 'light', family: 'Famille Léo' },

  programs: [
    {
      id: 'prog1',
      createdAt: Date.now(),
      title: 'Côte de Granit Rose en caravane',
      destination: 'Bretagne Nord, Côtes-d\'Armor',
      emoji: '🏖️',
      duree: '7 jours',
      budgetTotal: 1050,
      chienOk: true,
      description: 'Un circuit itinérant le long de la côte la plus spectaculaire de Bretagne. Rochers roses, sentiers côtiers, marchés de pêcheurs et plages dog-friendly. Idéal en caravane avec des emplacements bien dimensionnés et des routes accessibles.',
      programme: [
        { day: 'Jour 1 — Arrivée', items: [
          { label: 'Installation au camping' },
          { label: 'Balade sur la plage avec le chien en fin d\'après-midi' },
        ]},
        { day: 'Jour 2 — Ploumanac\'h et ses rochers', items: [
          { label: 'Sentier des douaniers GR34 entre Perros-Guirec et Ploumanac\'h' },
          { label: 'Vue sur le phare au coucher du soleil' },
        ]},
        { day: 'Jour 3 — Île de Batz', items: [
          { label: 'Ferry depuis Roscoff pour l\'île de Batz' },
          { label: 'Tour de l\'île à vélo ou à pied' },
        ]},
        { day: 'Jour 4 — Marché et farniente', items: [
          { label: 'Marché de Roscoff le matin' },
          { label: 'Après-midi libre, baignade si météo favorable' },
        ]},
        { day: 'Jour 5 — Les Abers', items: [
          { label: 'Balade en bord d\'estuaire, paysage de landes et de mer' },
        ]},
        { day: 'Jour 6 — Cap de la Chèvre', items: [
          { label: 'Pointe bretonne sauvage, vue sur la mer d\'Iroise' },
          { label: 'Randonnée accessible, vent garanti' },
        ]},
        { day: 'Jour 7 — Retour', items: [
          { label: 'Départ matinal, pause déjeuner à Morlaix' },
        ]},
      ],
      budgetDetail: [
        { label: 'Camping 6 nuits (2 pers. + caravane)', montant: 420 },
        { label: 'Carburant aller-retour', montant: 180 },
        { label: 'Ferry île de Batz', montant: 40 },
        { label: 'Repas et courses', montant: 320 },
        { label: 'Activités et entrées', montant: 90 },
      ],
      hebergements: [
        { nom: 'Camping des Abers, Landéda (grands emplacements, accès plage directe)' },
        { nom: 'Camping de Perros-Guirec, Trestraou (proche sentier côtier)' },
        { nom: 'Aire camping-car Roscoff (escale 1 nuit, services complets)' },
      ],
      notes: 'Idéal juillet–août. Réserver le camping 3 mois avant. Plages dog-friendly le matin avant 10h en saison. Routes accessibles aux attelages, éviter la D786 en haute saison.',
      linkedTripId: null,
    },
    {
      id: 'prog2',
      createdAt: Date.now(),
      title: 'Ardèche sauvage en famille',
      destination: 'Gorges de l\'Ardèche, Ardèche',
      emoji: '🏕️',
      duree: '10 jours',
      budgetTotal: 1350,
      chienOk: true,
      description: 'La rivière, les gorges, les villages en pierre et les nuits sous les étoiles. Un programme pensé pour une famille avec chien qui veut conjuguer baignade, randonnée et découverte du terrain calcaire ardéchois. Base fixe en camping, rayonnement à la journée.',
      programme: [
        { day: 'Jour 1 — Arrivée à Vallon-Pont-d\'Arc', items: [
          { label: 'Installation au camping' },
          { label: 'Baignade dans la rivière en fin d\'après-midi' },
        ]},
        { day: 'Jour 2 — Descente de l\'Ardèche en canoë', items: [
          { label: 'Location canoë pour la descente partielle jusqu\'au Pont d\'Arc' },
          { label: 'Prévoir gardiennage pour le chien sur cette demi-journée' },
        ]},
        { day: 'Jour 3 — Sentier de la Combe de Louby', items: [
          { label: 'Randonnée dans les gorges côté terrestre (chien admis)' },
          { label: 'Vue plongeante sur la rivière depuis les hauteurs' },
        ]},
        { day: 'Jour 4 — Village des Vans', items: [
          { label: 'Village médiéval provençal, marché du mardi matin' },
          { label: 'Après-midi farniente au camping' },
        ]},
        { day: 'Jour 5 — Grotte de la Madeleine', items: [
          { label: 'Visite guidée d\'une grotte ardéchoise' },
          { label: 'Pique-nique sur les hauteurs avec panorama' },
        ]},
        { day: 'Jour 6 — Baignade rivière', items: [
          { label: 'Journée eau et repos en amont de Vallon (dog-friendly)' },
        ]},
        { day: 'Jour 7 — Balazuc et Vogüé', items: [
          { label: 'Deux des plus beaux villages de France à quelques kilomètres' },
          { label: 'Balade dans les ruelles, produits locaux' },
        ]},
        { day: 'Jour 8 — Randonnée plateau des Gras', items: [
          { label: 'Plateau calcaire au-dessus des gorges, panorama 360°' },
          { label: 'Paysage de garrigue, silence complet (chien admis)' },
        ]},
        { day: 'Jour 9 — Journée libre', items: [
          { label: 'Retour sur les spots préférés de la semaine' },
          { label: 'Emplettes locales (miel, châtaigne, vin ardéchois)' },
        ]},
        { day: 'Jour 10 — Départ', items: [
          { label: 'Départ matinal pour éviter la chaleur sur l\'A7' },
        ]},
      ],
      budgetDetail: [
        { label: 'Camping 9 nuits (2 personnes)', montant: 450 },
        { label: 'Carburant', montant: 200 },
        { label: 'Location canoë', montant: 60 },
        { label: 'Repas et courses', montant: 480 },
        { label: 'Activités et entrées', montant: 160 },
      ],
      hebergements: [
        { nom: 'Camping La Roubine, Vallon-Pont-d\'Arc (bord de rivière, chien accepté)' },
        { nom: 'Camping Le Mondial, Ruoms (piscine, bon rapport qualité-prix)' },
        { nom: 'Camping Les Gorges de l\'Ardèche, Saint-Martin-d\'Ardèche' },
      ],
      notes: 'Meilleure période : mi-juin à mi-septembre. En juillet-août, arriver avant 10h aux points de baignade. Réserver le canoë 48h à l\'avance. Vérifier politique chien sur le ferry canoë selon prestataire.',
      linkedTripId: null,
    },
    {
      id: 'prog3',
      createdAt: Date.now(),
      title: 'Périgord noir en gîte',
      destination: 'Dordogne, Périgord Noir',
      emoji: '🏰',
      duree: '8 jours',
      budgetTotal: 1600,
      chienOk: true,
      description: 'Un séjour en base fixe dans un gîte au cœur du Périgord. Châteaux, villages troglodytes, rivière Dordogne et forêts de chênes. Programme de rayonnement à la journée, sans déplacer ses valises. Idéal quand on préfère une vraie cuisine et un jardin clos pour le chien.',
      programme: [
        { day: 'Jour 1 — Arrivée', items: [
          { label: 'Arrivée au gîte, courses au marché local' },
          { label: 'Balade du soir dans le village avec le chien' },
        ]},
        { day: 'Jour 2 — Sarlat-la-Canéda', items: [
          { label: 'Marché du samedi, vieille ville médiévale' },
          { label: 'Foie gras et noix en emplettes (chien admis dans les rues)' },
        ]},
        { day: 'Jour 3 — Les Eyzies et la préhistoire', items: [
          { label: 'Musée national de Préhistoire, falaises troglodytes' },
          { label: 'Randonnée sur le causse en fin d\'après-midi (chien admis)' },
        ]},
        { day: 'Jour 4 — Canoë sur la Dordogne', items: [
          { label: 'Descente en canoë entre La Roque-Gageac et Beynac' },
          { label: 'Alternative : balade à vélo sur les berges avec le chien' },
        ]},
        { day: 'Jour 5 — Châteaux de Beynac et Castelnaud', items: [
          { label: 'Deux châteaux face à face de part et d\'autre de la rivière' },
          { label: 'Chien admis à l\'extérieur, panorama exceptionnel' },
        ]},
        { day: 'Jour 6 — Forêt Barade', items: [
          { label: 'Immense forêt de chênes sessiles, sentiers balisés (chien admis)' },
          { label: 'Journée chien par excellence, calme absolu' },
        ]},
        { day: 'Jour 7 — Marché de Belvès', items: [
          { label: 'Un des plus beaux marchés du Périgord' },
          { label: 'Village bastide avec caves troglodytes habitées' },
        ]},
        { day: 'Jour 8 — Départ', items: [
          { label: 'Tour du jardin matinal avec le chien, restitution des clés' },
        ]},
      ],
      budgetDetail: [
        { label: 'Gîte 7 nuits (jardin clos, chien accepté)', montant: 750 },
        { label: 'Carburant', montant: 160 },
        { label: 'Canoë ou vélo', montant: 80 },
        { label: 'Repas, courses et marchés', montant: 480 },
        { label: 'Entrées châteaux et musées', montant: 130 },
      ],
      hebergements: [
        { nom: 'Gîte Les Chênes, Saint-Cyprien (jardin clos, chien accepté)' },
        { nom: 'Gîte de la Bessède, Belvès (vue sur vallée, animaux sur demande)' },
        { nom: 'Gîte du Causse, Les Eyzies (proche sites préhistoriques)' },
      ],
      notes: 'Meilleure période : mai-juin et septembre pour éviter la foule. Réserver le gîte 3 à 6 mois à l\'avance en été. Vérifier jardin clos pour le chien à la réservation. Marché de Sarlat le mercredi et samedi.',
      linkedTripId: null,
    },
    {
      id: 'prog4',
      createdAt: Date.now(),
      title: 'Vercors à pied, étape par étape',
      destination: 'Massif du Vercors, Isère et Drôme',
      emoji: '🏔️',
      duree: '6 jours',
      budgetTotal: 780,
      chienOk: true,
      description: 'Le plateau du Vercors est l\'un des massifs les plus accessibles pour la randonnée en famille avec chien. Forêts de hêtres, falaises blanches, villages perchés et prairies d\'altitude. Programme itinérant léger, nuits en camping.',
      programme: [
        { day: 'Jour 1 — Arrivée à Villard-de-Lans', items: [
          { label: 'Installation au camping, repérage du bourg' },
          { label: 'Premiers lacets dans la forêt en fin d\'après-midi' },
        ]},
        { day: 'Jour 2 — Sentier des Bergers', items: [
          { label: 'Randonnée sur le plateau depuis Villard (12 km, 400 m D+)' },
          { label: 'Vue sur les Alpes par temps clair, chien admis' },
        ]},
        { day: 'Jour 3 — Gorges de la Bourne', items: [
          { label: 'Descente dans les gorges depuis le plateau' },
          { label: 'Demi-journée randonnée, demi-journée baignade en rivière' },
        ]},
        { day: 'Jour 4 — Pas de l\'Aiguille', items: [
          { label: 'Montée au Pas de l\'Aiguille par le sentier balisé (9 km AR)' },
          { label: 'Panorama 360° sur le plateau et les vallées, pique-nique au sommet' },
        ]},
        { day: 'Jour 5 — Font d\'Urle', items: [
          { label: 'Randonnée sur le plateau nord, flore alpine (chien admis)' },
          { label: 'Terrain idéal pour un chien, large espace' },
        ]},
        { day: 'Jour 6 — Descente et départ', items: [
          { label: 'Balade matinale de clôture' },
          { label: 'Descente en vallée et retour' },
        ]},
      ],
      budgetDetail: [
        { label: 'Camping 5 nuits (2 personnes)', montant: 200 },
        { label: 'Carburant', montant: 140 },
        { label: 'Repas et courses', montant: 300 },
        { label: 'Activités et parc animalier', montant: 80 },
        { label: 'Divers (pharmacie, équipement)', montant: 60 },
      ],
      hebergements: [
        { nom: 'Camping de l\'Herbetière, Villard-de-Lans (chien accepté, proximité sentiers)' },
        { nom: 'Camping du Gouffre de la Croix, Choranche (gorges, cadre exceptionnel)' },
        { nom: 'Camping La Porte de Vassieux, Vassieux-en-Vercors (plateau, calme total)' },
      ],
      notes: 'Meilleure période : juin à septembre. En juillet-août, partir tôt pour les randonnées (chaleur l\'après-midi). Prévoir eau supplémentaire pour le chien en altitude. Certains sentiers de réserve naturelle interdits aux chiens — vérifier le balisage.',
      linkedTripId: null,
    },
    {
      id: 'prog5',
      createdAt: Date.now(),
      title: 'Baie du Mont-Saint-Michel',
      destination: 'Manche et Normandie Sud',
      emoji: '🌊',
      duree: '5 jours',
      budgetTotal: 870,
      chienOk: true,
      description: 'Court séjour entre la baie mythique, les herbus et les chemins creux du bocage normand. Programme équilibré entre grande randonnée sur les grèves, visite du Mont, villages normands et étapes gourmandes. Idéal pour un long week-end ou court séjour.',
      programme: [
        { day: 'Jour 1 — Arrivée', items: [
          { label: 'Installation, premier regard sur la baie depuis le belvédère de Courtils' },
          { label: 'Lumière de fin de journée sur les grèves, incontournable' },
        ]},
        { day: 'Jour 2 — Traversée de la baie à pied', items: [
          { label: 'Traversée guidée de la baie à marée basse (3 à 4 heures)' },
          { label: 'Chien admis selon les guides — vérifier à la réservation' },
        ]},
        { day: 'Jour 3 — Mont-Saint-Michel', items: [
          { label: 'Abbaye le matin à l\'ouverture pour éviter la foule' },
          { label: 'Chien admis dans les ruelles et sur les remparts (pas dans l\'abbaye)' },
          { label: 'Promenade sur les polders et les herbus autour du Mont' },
        ]},
        { day: 'Jour 4 — Avranches et bocage normand', items: [
          { label: 'Marché d\'Avranches le matin' },
          { label: 'Chemins creux du bocage, haies centenaires, balade chien 2h' },
        ]},
        { day: 'Jour 5 — Plage de Carolles et départ', items: [
          { label: 'Dernière matinée sur la plage de Carolles, vue sur le Mont depuis la côte' },
          { label: 'Départ en milieu de journée' },
        ]},
      ],
      budgetDetail: [
        { label: 'Camping ou location 4 nuits', montant: 380 },
        { label: 'Carburant', montant: 150 },
        { label: 'Traversée guidée de la baie', montant: 60 },
        { label: 'Entrée abbaye', montant: 50 },
        { label: 'Repas et courses', montant: 230 },
      ],
      hebergements: [
        { nom: 'Camping Haliotis, Pontorson (4 étoiles, chien accepté, navette Mont)' },
        { nom: 'Camping du Mont-Saint-Michel, Beauvoir (vue directe, chien accepté)' },
        { nom: 'Gîte Les Herbus, Courtils (vue baie, jardin clos, idéal avec chien)' },
      ],
      notes: 'Meilleure période : mai-juin et septembre (moins de monde). Les grandes marées ont lieu à date fixe — consulter le calendrier des marées pour la traversée. Réserver le guide de traversée au moins 2 semaines à l\'avance en saison.',
      linkedTripId: null,
    },
  ],

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
