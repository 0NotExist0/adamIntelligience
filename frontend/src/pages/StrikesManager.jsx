import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Train, 
  Plane, 
  Bus, 
  Stethoscope, 
  GraduationCap, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  RotateCw, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ExternalLink,
  MapPin,
  Building2,
  Users,
  Download,
  Flame,
  Layers,
  HelpCircle,
  RefreshCw,
  Compass,
  Sliders,
  Star,
  Globe,
  RotateCcw
} from 'lucide-react';
import { runAgentChatPipeline } from '../services/agentPipeline';
import DestinationFilterDrawer, { REGIONAL_CAPITALS } from '../components/DestinationFilterDrawer';
import { useToast } from '../components/Toast';

// Database degli Scioperi con metadati geografici precisi (Regioni, Città, Capoluoghi, Hub)
const INITIAL_STRIKES_DATA = [
  // --- TRENI & FERROVIE ---
  {
    id: 'strk-1',
    category: 'treni',
    categoryName: 'Treni & Ferrovie',
    icon: '🚆',
    title: 'Sciopero Nazionale Personale Gruppo Ferrovie dello Stato & Italo',
    companies: ['Trenitalia', 'Italo NTV', 'Trenord', 'RFI'],
    sectors: 'Personale viaggiante, macchinisti e capitreno',
    unions: ['CUB Trasporti', 'USB Lavoro Privato', 'SGB', 'Cobas'],
    startDate: '2026-03-08T21:00:00',
    endDate: '2026-03-09T21:00:00',
    duration: '24 Ore (dalle 21:00 alle 21:00)',
    scope: 'Nazionale',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Piemonte', 'Veneto', 'Campania', 'Toscana', 'Emilia-Romagna', 'Puglia', 'Sicilia', 'Liguria', 'Calabria', 'Marche', 'Friuli-Venezia Giulia', 'Abruzzo', 'Trentino-Alto Adige', 'Umbria', 'Sardegna', 'Basilicata', 'Molise', 'Valle d\'Aosta'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Venezia', 'Verona', 'Bari', 'Palermo', 'Genova', 'Trieste', 'Reggio Calabria', 'Ancona', 'Pescara', 'Trento', 'Bolzano', 'Perugia', 'Cagliari', 'Salerno', 'Padova', 'Brescia'],
    isCapoluogo: true,
    majorHubs: ['Roma Termini', 'Roma Tiburtina', 'Milano Centrale', 'Milano Porta Garibaldi', 'Napoli Centrale', 'Torino Porta Nuova', 'Firenze Santa Maria Novella', 'Bologna Centrale', 'Venezia Mestre'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Alto',
    guaranteedSlots: 'Frecce e treni a lunga percorrenza garantiti. Treni regionali garantiti nelle fasce pendolari 06:00-09:00 e 18:00-21:00.',
    notes: 'Possibili variazioni o cancellazioni anche prima e dopo gli orari dello sciopero. Rimborso biglietti garantito prima della partenza.'
  },
  {
    id: 'strk-2',
    category: 'treni',
    categoryName: 'Treni & Ferrovie',
    icon: '🚆',
    title: 'Mobilitazione Personale Circolazione e Manutenzione Rete RFI',
    companies: ['Rete Ferroviaria Italiana (RFI)'],
    sectors: 'Manutenzione infrastrutture, dirigenti movimento',
    unions: ['Orsa Ferrovie', 'FAST Confsal'],
    startDate: '2026-03-22T09:01:00',
    endDate: '2026-03-22T17:00:00',
    duration: '8 Ore (dalle 09:01 alle 17:00)',
    scope: 'Regionale (Lombardia, Piemonte, Veneto)',
    scopeType: 'Regionale',
    regions: ['Lombardia', 'Piemonte', 'Veneto'],
    cities: ['Milano', 'Torino', 'Venezia', 'Verona', 'Padova', 'Brescia', 'Bergamo', 'Monza', 'Novara', 'Alessandria', 'Vicenza', 'Treviso'],
    isCapoluogo: true,
    majorHubs: ['Milano Centrale', 'Torino Porta Nuova', 'Venezia Santa Lucia', 'Verona Porta Nuova'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Medio',
    guaranteedSlots: 'Nessuna fascia di garanzia obbligatoria fuori dagli orari 06-09 e 18-21.',
    notes: 'Possibili rallentamenti sulla rete ad alta velocità nei nodi di Milano e Torino.'
  },

  // --- TRASPORTO PUBBLICO LOCALE (TPL) ---
  {
    id: 'strk-3',
    category: 'tpl',
    categoryName: 'Trasporto Locale (Bus/Metro)',
    icon: '🚌',
    title: 'Sciopero Generale Trasporto Pubblico Locale (Bus, Tram, Metro)',
    companies: ['ATAC Roma', 'ATM Milano', 'ANM Napoli', 'GTT Torino', 'Tper Bologna', 'Autolinee Toscane'],
    sectors: 'Autisti, macchinisti metro, personale di stazione e officine',
    unions: ['Filt-Cgil', 'Fit-Cisl', 'Uiltrasporti', 'Faisa Cisal', 'Ugl Fna'],
    startDate: '2026-03-13T00:00:00',
    endDate: '2026-03-13T23:59:00',
    duration: '24 Ore (con fasce di garanzia)',
    scope: 'Nazionale (Tutte le città metropolitane)',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Campania', 'Piemonte', 'Emilia-Romagna', 'Toscana', 'Veneto', 'Puglia', 'Sicilia', 'Liguria', 'Sardegna', 'Friuli-Venezia Giulia', 'Calabria', 'Marche', 'Abruzzo', 'Umbria'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Genova', 'Bari', 'Palermo', 'Catania', 'Venezia', 'Verona', 'Cagliari', 'Trieste', 'Ancona', 'Perugia'],
    isCapoluogo: true,
    majorHubs: ['Metro A/B/C Roma', 'Metro M1/M2/M3/M4/M5 Milano', 'Metro Linea 1 Napoli', 'Metro Torino'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Alto',
    guaranteedSlots: 'Servizio garantito da inizio servizio alle 08:30 e dalle 17:00 alle 20:00 (orari variabili per singola città).',
    notes: 'Rinnovo del Contratto Collettivo Nazionale di Lavoro (CCNL Autoferrotranvieri).'
  },
  {
    id: 'strk-4',
    category: 'tpl',
    categoryName: 'Trasporto Locale (Bus/Metro)',
    icon: '🚌',
    title: 'Fermo Servizio Bus Extraurbani e Ferrovie Concesse',
    companies: ['Autolinee Toscane', 'Cotral Lazio', 'EAV Campania'],
    sectors: 'Linee bus extraurbane e ferrovie isolate (Cumana, Circumvesuviana, Roma-Lido)',
    unions: ['USB Lavoro Privato'],
    startDate: '2026-03-27T08:30:00',
    endDate: '2026-03-27T12:30:00',
    duration: '4 Ore (dalle 08:30 alle 12:30)',
    scope: 'Regionale (Toscana, Lazio, Campania)',
    scopeType: 'Regionale',
    regions: ['Toscana', 'Lazio', 'Campania'],
    cities: ['Firenze', 'Pisa', 'Livorno', 'Roma', 'Latina', 'Frosinone', 'Viterbo', 'Rieti', 'Napoli', 'Salerno', 'Caserta', 'Pozzuoli', 'Sorrento'],
    isCapoluogo: true,
    majorHubs: ['Terminal Bus Tiburtina', 'Stazione Montesanto Napoli', 'Terminal Santa Maria Novella Firenze'],
    status: 'Imminente',
    statusType: 'imminent',
    impact: 'Medio',
    guaranteedSlots: 'Tutte le corse in partenza prima delle 08:30 arriveranno a destinazione.',
    notes: 'Focus su sicurezza a bordo e indennità di turno.'
  },

  // --- AEREI & AEROPORTI ---
  {
    id: 'strk-5',
    category: 'aerei',
    categoryName: 'Aerei & Aeroporti',
    icon: '✈️',
    title: 'Sciopero Nazionale Trasporto Aereo & Controllori di Volo ENAV',
    companies: ['ENAV', 'ITA Airways', 'EasyJet', 'Ryanair Handling', 'Airport Handling'],
    sectors: 'Controllori spazio aereo, piloti, assistenti di volo e personale di terra',
    unions: ['Filt-Cgil', 'Fit-Cisl', 'Ugl Trasporto Aereo', 'Anpac', 'Anp'],
    startDate: '2026-03-18T13:00:00',
    endDate: '2026-03-18T17:00:00',
    duration: '4 Ore (dalle 13:00 alle 17:00)',
    scope: 'Nazionale (Tutti gli aeroporti italiani)',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Veneto', 'Campania', 'Sicilia', 'Toscana', 'Puglia', 'Emilia-Romagna', 'Piemonte', 'Sardegna', 'Calabria', 'Liguria', 'Friuli-Venezia Giulia', 'Abruzzo', 'Marche'],
    cities: ['Roma', 'Milano', 'Venezia', 'Napoli', 'Catania', 'Palermo', 'Bologna', 'Firenze', 'Pisa', 'Bari', 'Torino', 'Cagliari', 'Verona', 'Lamezia Terme', 'Genova', 'Pescara', 'Ancona', 'Trieste', 'Olbia', 'Brindisi'],
    isCapoluogo: true,
    majorHubs: ['Roma Fiumicino (FCO)', 'Roma Ciampino (CIA)', 'Milano Malpensa (MXP)', 'Milano Linate (LIN)', 'Bergamo Orio al Serio (BGY)', 'Venezia Marco Polo (VCE)', 'Napoli Capodichino (NAP)', 'Catania Fontanarossa (CTA)', 'Palermo Falcone Borsellino (PMO)', 'Bologna Marconi (BLQ)'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Alto',
    guaranteedSlots: 'Voli garantiti ENAC nelle fasce 07:00-10:00 e 18:00-21:00, oltre ai voli internazionali e intercontinentali strategici.',
    notes: 'Si consiglia di verificare lo stato del proprio volo con la compagnia prima di recarsi in aeroporto.'
  },
  {
    id: 'strk-6',
    category: 'aerei',
    categoryName: 'Aerei & Aeroporti',
    icon: '✈️',
    title: 'Mobilitazione Personale Handling & Sicurezza Fiumicino e Malpensa',
    companies: ['Swissport', 'Aviapartner', 'Dnata'],
    sectors: 'Carico/scarico bagagli, check-in, vigilanza scali',
    unions: ['Cub Trasporti', 'Flai Trasporti'],
    startDate: '2026-04-03T00:00:00',
    endDate: '2026-04-03T23:59:00',
    duration: '24 Ore',
    scope: 'Interregionale (Roma FCO, Milano MXP/LIN)',
    scopeType: 'Regionale',
    regions: ['Lazio', 'Lombardia'],
    cities: ['Roma', 'Fiumicino', 'Milano', 'Varese', 'Busto Arsizio', 'Monza'],
    isCapoluogo: true,
    majorHubs: ['Roma Fiumicino (FCO)', 'Milano Malpensa (MXP)', 'Milano Linate (LIN)'],
    status: 'In Programmazione',
    statusType: 'imminent',
    impact: 'Medio-Alto',
    guaranteedSlots: 'Assistenza disabili e voli di emergenza/statali garantiti al 100%.',
    notes: 'Possibili ritardi nelle procedure di imbarco e riconsegna bagagli.'
  },

  // --- SANITÀ & OSPEDALI ---
  {
    id: 'strk-7',
    category: 'sanita',
    categoryName: 'Sanità & Ospedali',
    icon: '🏥',
    title: 'Sciopero Nazionale Medici, Dirigenti Sanitari, Infermieri e Personale Sanitario',
    companies: ['Servizio Sanitario Nazionale (SSN)', 'ASL', 'Aziende Ospedaliere'],
    sectors: 'Medici chirurghi, anestesisti, infermieri e personale OSS',
    unions: ['Anaao Assomed', 'Cimo-Fesmed', 'Nursing Up', 'Nursind'],
    startDate: '2026-03-25T00:00:00',
    endDate: '2026-03-25T23:59:00',
    duration: '24 Ore',
    scope: 'Nazionale',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Piemonte', 'Veneto', 'Campania', 'Emilia-Romagna', 'Toscana', 'Puglia', 'Sicilia', 'Liguria', 'Calabria', 'Sardegna', 'Marche', 'Abruzzo', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Umbria', 'Basilicata', 'Molise', 'Valle d\'Aosta'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Bari', 'Palermo', 'Genova', 'Venezia', 'Verona', 'Trieste', 'Cagliari', 'Catanzaro', 'Perugia', 'Ancona', 'L\'Aquila', 'Potenza', 'Campobasso', 'Trento'],
    isCapoluogo: true,
    majorHubs: ['Policlinico Umberto I Roma', 'Ospedale Niguarda Milano', 'Cardarelli Napoli', 'Molinette Torino', 'Sant\'Orsola Bologna', 'Careggi Firenze'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Molto Alto',
    guaranteedSlots: 'Garantiti al 100% i servizi di Pronto Soccorso, Terapie Intensive, urgenze chirurgiche e assistenza ai degenti.',
    notes: 'Possibili rinvii per visite ambulatoriali specialistiche ed esami programmati.'
  },

  // --- SCUOLA & UNIVERSITÀ ---
  {
    id: 'strk-8',
    category: 'scuola',
    categoryName: 'Scuola & Università',
    icon: '🎓',
    title: 'Sciopero Generale Comparto Istruzione & Ricerca',
    companies: ['Ministero dell\'Istruzione e del Merito', 'Scuole Statali e Paritarie', 'Università'],
    sectors: 'Docenti, Personale ATA, Collaboratori Scolastici, Ricercatori',
    unions: ['Flc Cgil', 'Uil Scuola RUA', 'Gilda Unams', 'Cobas Scuola', 'Anief'],
    startDate: '2026-03-10T00:00:00',
    endDate: '2026-03-10T23:59:00',
    duration: 'Intera Giornata',
    scope: 'Nazionale',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Campania', 'Sicilia', 'Veneto', 'Piemonte', 'Puglia', 'Emilia-Romagna', 'Toscana', 'Calabria', 'Sardegna', 'Liguria', 'Marche', 'Abruzzo', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Umbria', 'Basilicata', 'Molise', 'Valle d\'Aosta'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Bari', 'Bologna', 'Firenze', 'Catania', 'Venezia', 'Genova', 'Messina', 'Padova', 'Trieste', 'Taranto', 'Brescia', 'Reggio Calabria', 'Modena', 'Cagliari', 'Perugia', 'Ancona'],
    isCapoluogo: true,
    majorHubs: ['Tutti i plessi scolastici e atenei universitari'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Medio',
    guaranteedSlots: 'Servizi minimi essenziali (apertura plesso e vigilanza ingresso se presente personale disponibile).',
    notes: 'Le famiglie sono invitate a verificare al mattino l\'effettiva apertura delle classi e la presenza dei docenti.'
  },

  // --- MERCI, LOGISTICA & AUTOSTRADE ---
  {
    id: 'strk-9',
    category: 'merci',
    categoryName: 'Merci, Logistica & Autostrade',
    icon: '🚚',
    title: 'Fermo Nazionale Corrieri Espresso, Hub Logistici e Autotrasporto',
    companies: ['Poste Italiane / SDA', 'Amazon Logistics', 'BRT', 'GLS', 'DHL Supply Chain'],
    sectors: 'Fattorini, driver, addetti smistamento magazzini',
    unions: ['Filt-Cgil', 'Fit-Cisl', 'Uiltrasporti', 'Si Cobas'],
    startDate: '2026-03-16T00:00:00',
    endDate: '2026-03-17T23:59:00',
    duration: '48 Ore',
    scope: 'Nazionale',
    scopeType: 'Nazionale',
    regions: ['Lombardia', 'Emilia-Romagna', 'Veneto', 'Lazio', 'Piemonte', 'Campania', 'Toscana', 'Puglia', 'Sicilia', 'Liguria', 'Friuli-Venezia Giulia', 'Marche', 'Abruzzo', 'Umbria', 'Calabria', 'Sardegna', 'Trentino-Alto Adige', 'Basilicata', 'Molise', 'Valle d\'Aosta'],
    cities: ['Milano', 'Bologna', 'Piacenza', 'Verona', 'Roma', 'Torino', 'Napoli', 'Firenze', 'Bari', 'Padova', 'Novara', 'Parma', 'Reggio Emilia', 'Brescia', 'Bergamo'],
    isCapoluogo: true,
    majorHubs: ['Interporto Bologna', 'Polo Logistico Piacenza', 'Hub Malpensa Logistica', 'Interporto Quadrante Europa Verona', 'Polo Logistico Passo Corese Roma'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Medio',
    guaranteedSlots: 'Consegna farmaci salvavita e prodotti sanitari prioritari.',
    notes: 'Possibili ritardi nelle consegne e-commerce in tutta Italia.'
  },
  {
    id: 'strk-10',
    category: 'merci',
    categoryName: 'Merci, Logistica & Autostrade',
    icon: '🚚',
    title: 'Sciopero Personale Caselli Autostradali & Manutenzione',
    companies: ['Autostrade per l\'Italia', 'Autovie Venete', 'Milano Serravalle'],
    sectors: 'Casellanti, addetti sale operative radio, ausiliari della viabilità',
    unions: ['Sla-Cisal', 'Ugl Viabilità'],
    startDate: '2026-03-29T10:00:00',
    endDate: '2026-03-29T18:00:00',
    duration: '8 Ore',
    scope: 'Nazionale',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Toscana', 'Emilia-Romagna', 'Liguria', 'Campania', 'Veneto', 'Piemonte', 'Puglia', 'Marche', 'Abruzzo', 'Friuli-Venezia Giulia'],
    cities: ['Roma', 'Milano', 'Firenze', 'Bologna', 'Genova', 'Napoli', 'Venezia', 'Torino', 'Bari', 'Ancona', 'Pescara', 'Trieste'],
    isCapoluogo: true,
    majorHubs: ['Autostrada A1 Milano-Napoli', 'A14 Bologna-Taranto', 'A4 Torino-Trieste', 'A10/A12 Liguria'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Basso-Medio',
    guaranteedSlots: 'Piste Telepass, UnipolMove e Casse Automatiche con Carta/Bancomat sempre aperte e funzionanti.',
    notes: 'Possibili rallentamenti ai caselli manuali con pagamento in contanti.'
  },

  // --- SCIOPERO GENERALE ---
  {
    id: 'strk-11',
    category: 'generale',
    categoryName: 'Sciopero Generale Intersettoriale',
    icon: '📢',
    title: 'Sciopero Generale Nazionale di Tutti i Settori Pubblici e Privati',
    companies: ['Tutti i comparti produttivi, servizi, sanità, trasporti e PA'],
    sectors: 'Tutti i lavoratori del pubblico impiego e del settore privato',
    unions: ['CUB', 'USB', 'SGB', 'Cobas', 'Confederazione Unitaria di Base'],
    startDate: '2026-03-08T00:00:00',
    endDate: '2026-03-08T23:59:00',
    duration: '24 Ore',
    scope: 'Nazionale (Giornata Internazionale)',
    scopeType: 'Nazionale',
    regions: ['Lazio', 'Lombardia', 'Campania', 'Piemonte', 'Veneto', 'Emilia-Romagna', 'Toscana', 'Puglia', 'Sicilia', 'Liguria', 'Sardegna', 'Calabria', 'Friuli-Venezia Giulia', 'Marche', 'Abruzzo', 'Trentino-Alto Adige', 'Umbria', 'Basilicata', 'Molise', 'Valle d\'Aosta'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Trieste', 'Cagliari', 'Taranto', 'Brescia', 'Reggio Calabria', 'Modena', 'Perugia', 'Ancona', 'L\'Aquila', 'Trento', 'Bolzano', 'Potenza', 'Campobasso', 'Catanzaro', 'Aosta'],
    isCapoluogo: true,
    majorHubs: ['Piazze principali di tutte le città e capoluoghi italiani'],
    status: 'Confermato',
    statusType: 'confirmed',
    impact: 'Molto Alto',
    guaranteedSlots: 'Servizi pubblici essenziali garantiti per legge (sanità d\'urgenza, forze dell\'ordine, fasce di garanzia trasporti).',
    notes: 'Manifestazioni e cortei previsti nelle principali piazze italiane (Roma, Milano, Napoli, Bologna, Firenze).'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Tutti gli Scioperi', icon: Layers, count: 11, color: 'from-purple-600 to-indigo-600' },
  { id: 'treni', label: 'Treni & Ferrovie', icon: Train, count: 2, color: 'from-red-600 to-amber-600' },
  { id: 'tpl', label: 'Trasporto Locale (Bus/Metro)', icon: Bus, count: 2, color: 'from-blue-600 to-cyan-600' },
  { id: 'aerei', label: 'Aerei & Aeroporti', icon: Plane, count: 2, color: 'from-sky-600 to-indigo-600' },
  { id: 'sanita', label: 'Sanità & Ospedali', icon: Stethoscope, count: 1, color: 'from-emerald-600 to-teal-600' },
  { id: 'scuola', label: 'Scuola & Università', icon: GraduationCap, count: 1, color: 'from-amber-600 to-orange-600' },
  { id: 'merci', label: 'Merci, Logistica & Autostrade', icon: Truck, count: 2, color: 'from-violet-600 to-purple-600' },
  { id: 'generale', label: 'Sciopero Generale', icon: Megaphone, count: 1, color: 'from-pink-600 to-rose-600' }
];

export default function StrikesManager() {
  const { addToast } = useToast();
  const [strikes, setStrikes] = useState(INITIAL_STRIKES_DATA);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStrikeModal, setSelectedStrikeModal] = useState(null);

  // Destination Filters Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [onlyCapitals, setOnlyCapitals] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all', 'Nazionale', 'Regionale'

  // Auto-Switch configuration state
  const [isAutoSwitch, setIsAutoSwitch] = useState(true);
  const [switchIntervalSec, setSwitchIntervalSec] = useState(6);
  const [switchProgress, setSwitchProgress] = useState(0);
  const [isAiVerifying, setIsAiVerifying] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const progressTimerRef = useRef(null);
  const rotationCategories = CATEGORIES.map((c) => c.id);

  // Handle Auto-Switch Rotation
  useEffect(() => {
    if (!isAutoSwitch) {
      setSwitchProgress(0);
      return;
    }

    const intervalMs = switchIntervalSec * 1000;
    const stepMs = 100;
    let currentElapsed = 0;

    progressTimerRef.current = setInterval(() => {
      currentElapsed += stepMs;
      const pct = Math.min(100, (currentElapsed / intervalMs) * 100);
      setSwitchProgress(pct);

      if (currentElapsed >= intervalMs) {
        currentElapsed = 0;
        setSwitchProgress(0);
        setActiveCategory((prevCat) => {
          const currentIndex = rotationCategories.indexOf(prevCat);
          const nextIndex = (currentIndex + 1) % rotationCategories.length;
          return rotationCategories[nextIndex];
        });
      }
    }, stepMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isAutoSwitch, switchIntervalSec]);

  // Navigate categories manually
  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setSwitchProgress(0);
  };

  const handleNextCategory = () => {
    const currentIndex = rotationCategories.indexOf(activeCategory);
    const nextIndex = (currentIndex + 1) % rotationCategories.length;
    setActiveCategory(rotationCategories[nextIndex]);
    setSwitchProgress(0);
  };

  const handlePrevCategory = () => {
    const currentIndex = rotationCategories.indexOf(activeCategory);
    const prevIndex = (currentIndex - 1 + rotationCategories.length) % rotationCategories.length;
    setActiveCategory(rotationCategories[prevIndex]);
    setSwitchProgress(0);
  };

  // Reset destination filters
  const handleResetFilters = () => {
    setSelectedRegion('all');
    setSelectedCity('all');
    setOnlyCapitals(false);
    setScopeFilter('all');
    addToast('Filtri territoriali azzerati', 'info');
  };

  // AI Live Verification
  const handleVerifyWithAi = async () => {
    setIsAiVerifying(true);
    addToast('🤖 Agente AI: Ricerca sul Web e fact-checking scioperi in corso...', 'info');

    try {
      const destinationClause = selectedCity && selectedCity !== 'all' 
        ? `per la città di ${selectedCity} (${selectedRegion !== 'all' ? selectedRegion : 'Italia'})`
        : selectedRegion && selectedRegion !== 'all' 
        ? `per la regione ${selectedRegion}`
        : `in tutta Italia`;

      const prompt = `Effettua un controllo aggiornato sugli scioperi ${destinationClause} per tutte le categorie (trasporti, treni, aerei, tpl, scuola, sanità e sciopero generale). Verifica le ultime date proclamate, fasce di garanzia, e se ci sono revoche o conferme ufficiali.`;
      
      const res = await runAgentChatPipeline({
        prompt,
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        forceWebSearch: true
      });

      if (res.success) {
        setAiReport({
          content: res.content,
          agentTrace: res.agentTrace,
          verifiedAt: new Date().toLocaleTimeString('it-IT')
        });
        addToast('Verifica AI completata con successo!', 'success');
      } else {
        addToast(`Errore verifica AI: ${res.error}`, 'error');
      }
    } catch (err) {
      addToast(`Errore: ${err.message}`, 'error');
    } finally {
      setIsAiVerifying(false);
    }
  };

  // Enhanced Filter Logic with Geographical Region, City & Capital filters
  const filteredStrikes = strikes.filter((s) => {
    const matchCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchStatus = selectedStatus === 'all' || s.statusType === selectedStatus;
    
    // Scope filter (Nazionale vs Regionale)
    const matchScope = scopeFilter === 'all' || 
      (scopeFilter === 'Nazionale' && s.scopeType === 'Nazionale') ||
      (scopeFilter === 'Regionale' && s.scopeType === 'Regionale');

    // Region filter
    const matchRegion = !selectedRegion || selectedRegion === 'all' || 
      (s.regions && (s.regions.includes(selectedRegion) || s.scopeType === 'Nazionale'));

    // City filter
    const matchCity = !selectedCity || selectedCity === 'all' || 
      (s.cities && (s.cities.some((c) => c.toLowerCase() === selectedCity.toLowerCase()) || s.scopeType === 'Nazionale'));

    // Only Regional Capitals filter
    const matchCapitals = !onlyCapitals || s.isCapoluogo === true ||
      (s.cities && s.cities.some((c) => REGIONAL_CAPITALS.includes(c)));

    // Text search query
    const matchQuery = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scope.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.regions && s.regions.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (s.cities && s.cities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      s.companies.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.unions.some((u) => u.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCategory && matchStatus && matchScope && matchRegion && matchCity && matchCapitals && matchQuery;
  });

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
  
  const activeFiltersCount = (selectedRegion && selectedRegion !== 'all' ? 1 : 0) +
                             (selectedCity && selectedCity !== 'all' ? 1 : 0) +
                             (onlyCapitals ? 1 : 0) +
                             (scopeFilter && scopeFilter !== 'all' ? 1 : 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Floating Side Button for Destination Filters on Large Screens */}
      <button
        onClick={() => setIsFilterDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-l from-purple-600 to-indigo-600 text-white p-3.5 rounded-l-2xl shadow-2xl shadow-purple-500/40 border-l border-y border-purple-400/40 hover:pl-5 transition-all flex flex-col items-center gap-1.5 group active:scale-95"
        title="Apri menu filtri destinazioni (Regioni, Città, Capoluoghi)"
      >
        <div className="relative">
          <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform text-rose-300" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold tracking-tight uppercase [writing-mode:vertical-lr] rotate-180 py-1">
          Filtri Destinazioni
        </span>
      </button>

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-xl shadow-rose-500/20">
            📢
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-white tracking-tight">Monitor Scioperi & Mobilità</h1>
              <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full font-bold border border-rose-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                LIVE RADAR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Calendario in tempo reale per tutte le categorie con auto-switch dinamico, filtri regionali/città e fact-checking AI
            </p>
          </div>
        </div>

        {/* Live Controls: Filter Menu Drawer Button, Auto-Switch & AI Check */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Side Drawer Filter Trigger Button */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all shadow-md active:scale-95 ${
              activeFiltersCount > 0
                ? 'bg-purple-600 text-white border-purple-400/50 shadow-purple-500/25'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>Filtra Destinazioni</span>
            {activeFiltersCount > 0 ? (
              <span className="bg-white text-purple-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {activeFiltersCount}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">
                Regioni/Città
              </span>
            )}
          </button>

          {/* Auto-Switch Controls Card */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-md">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAutoSwitch(!isAutoSwitch)}
                className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isAutoSwitch
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title={isAutoSwitch ? 'Metti in pausa Auto-Switch' : 'Attiva rotazione automatica delle categorie'}
              >
                {isAutoSwitch ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isAutoSwitch ? 'Auto-Switch Attivo' : 'In Pausa'}</span>
              </button>
            </div>

            {/* Interval Selector */}
            <select
              value={switchIntervalSec}
              onChange={(e) => setSwitchIntervalSec(Number(e.target.value))}
              disabled={!isAutoSwitch}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-[11px] text-purple-200 font-semibold focus:outline-none disabled:opacity-50"
            >
              <option value={4}>4 sec</option>
              <option value={6}>6 sec</option>
              <option value={8}>8 sec</option>
              <option value={12}>12 sec</option>
            </select>

            {/* Prev/Next arrows */}
            <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5">
              <button
                onClick={handlePrevCategory}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Categoria precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextCategory}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Categoria successiva"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Live Fact-Check Button */}
          <button
            onClick={handleVerifyWithAi}
            disabled={isAiVerifying}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-purple-500/25 border border-purple-400/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiVerifying ? 'animate-spin' : 'animate-pulse text-pink-200'}`} />
            <span>{isAiVerifying ? 'Ricerca Web AI...' : 'Verifica Live Web'}</span>
          </button>
        </div>
      </div>

      {/* Auto-Switch Progress Bar */}
      {isAutoSwitch && (
        <div className="space-y-1">
          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${switchProgress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
            <span>Rotazione automatica attiva su 8 categorie</span>
            <span>Prossima categoria tra {Math.ceil(switchIntervalSec * (1 - switchProgress / 100))}s</span>
          </div>
        </div>
      )}

      {/* Categories Tabs Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/40 shadow-lg shadow-purple-500/25 scale-102'
                  : 'bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-400'}`} />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Destination Filters Bar */}
      {activeFiltersCount > 0 && (
        <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Filtri Territoriali Attivi:</span>
            </span>

            {/* Scope Pill */}
            {scopeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl text-purple-200 text-[11px]">
                <Globe className="w-3 h-3 text-purple-400" />
                <span>Ambito: <strong>{scopeFilter}</strong></span>
                <button onClick={() => setScopeFilter('all')} className="text-slate-400 hover:text-white">✕</button>
              </span>
            )}

            {/* Region Pill */}
            {selectedRegion && selectedRegion !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-cyan-950/50 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-cyan-200 text-[11px]">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>Regione: <strong>{selectedRegion}</strong></span>
                <button onClick={() => setSelectedRegion('all')} className="text-slate-400 hover:text-white">✕</button>
              </span>
            )}

            {/* City Pill */}
            {selectedCity && selectedCity !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-rose-950/50 border border-rose-500/40 px-2.5 py-1 rounded-xl text-rose-200 text-[11px]">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Città: <strong>{selectedCity}</strong></span>
                <button onClick={() => setSelectedCity('all')} className="text-slate-400 hover:text-white">✕</button>
              </span>
            )}

            {/* Only Capitals Pill */}
            {onlyCapitals && (
              <span className="inline-flex items-center gap-1.5 bg-amber-950/50 border border-amber-500/40 px-2.5 py-1 rounded-xl text-amber-200 text-[11px]">
                <Star className="w-3 h-3 text-amber-400" />
                <span>Solo Capoluoghi</span>
                <button onClick={() => setOnlyCapitals(false)} className="text-slate-400 hover:text-white">✕</button>
              </span>
            )}
          </div>

          <button
            onClick={handleResetFilters}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Azzera Filtri</span>
          </button>
        </div>
      )}

      {/* AI Report Card if available */}
      {aiReport && (
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-purple-500/40 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Report Fact-Checking Agente AI Web ({aiReport.verifiedAt})</span>
            </div>
            <button
              onClick={() => setAiReport(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ✕ Chiudi
            </button>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            {aiReport.content}
          </div>
        </div>
      )}

      {/* Search Bar & Status Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per azienda, città, sindacato o motivazione (es. Trenitalia, Roma, USB)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Drawer Button on Filter Bar */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 text-xs font-semibold transition-colors shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scegli Regione/Città</span>
          </button>

          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-500"
          >
            <option value="all">Tutti gli Stati</option>
            <option value="confirmed">Confermati</option>
            <option value="imminent">Imminenti</option>
            <option value="revoked">Revocati / Differiti</option>
          </select>
        </div>
      </div>

      {/* Active Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>{activeCategoryObj.label}</span>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredStrikes.length} eventi programmati)
            </span>
          </h2>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Fasce di garanzia tutelate per legge ex L. 146/90
        </span>
      </div>

      {/* Strikes Grid */}
      {filteredStrikes.length === 0 ? (
        <div className="h-64 glass-panel rounded-3xl border border-slate-800 flex flex-col items-center justify-center space-y-3 text-slate-500 text-center p-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-400/50" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">Nessuno sciopero trovato per la destinazione selezionata</p>
            <p className="text-xs text-slate-400 max-w-md">
              I servizi per questa categoria e area territoriale risultano regolari. Prova a modificare o azzerare i filtri di regione/città.
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all"
            >
              Azzera Filtri Territoriali
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStrikes.map((strike) => {
            return (
              <div
                key={strike.id}
                className="group glass-panel bg-slate-900/80 border border-slate-800/90 hover:border-purple-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedStrikeModal(strike)}
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-2 rounded-2xl bg-slate-950 border border-slate-800">
                        {strike.icon}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                          {strike.categoryName}
                        </span>
                        <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{strike.scope}</span>
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      strike.statusType === 'confirmed'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : strike.statusType === 'imminent'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {strike.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                    {strike.title}
                  </h3>

                  {/* Date & Duration Card */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{new Date(strike.startDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{strike.duration}</span>
                    </div>
                  </div>

                  {/* Geographical Targets Badge */}
                  {strike.cities && (
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        <strong>Destinazioni:</strong> {strike.cities.slice(0, 4).join(', ')}{strike.cities.length > 4 ? ` + altri ${strike.cities.length - 4}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Companies & Sectors */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{strike.companies.join(', ')}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Sindacati: {strike.unions.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Guaranteed Slots & Detail button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Fasce Tutelate</span>
                  </div>

                  <span className="text-purple-400 group-hover:text-purple-300 font-bold text-[11px] flex items-center gap-1">
                    <span>Dettagli</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Destination Filter Side Drawer */}
      <DestinationFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        onlyCapitals={onlyCapitals}
        setOnlyCapitals={setOnlyCapitals}
        scopeFilter={scopeFilter}
        setScopeFilter={setScopeFilter}
        onResetFilters={handleResetFilters}
        totalMatchingStrikes={filteredStrikes.length}
      />

      {/* Modal Strike Details */}
      {selectedStrikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                  {selectedStrikeModal.icon}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                    {selectedStrikeModal.categoryName} • {selectedStrikeModal.scope}
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedStrikeModal.title}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedStrikeModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Timings & Impact */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Data Inizio</span>
                <p className="font-semibold text-white">
                  {new Date(selectedStrikeModal.startDate).toLocaleString('it-IT')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Durata</span>
                <p className="font-semibold text-cyan-300">{selectedStrikeModal.duration}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Impatto Stimato</span>
                <p className="font-semibold text-rose-400">{selectedStrikeModal.impact}</p>
              </div>
            </div>

            {/* Regions and Cities Involved */}
            {selectedStrikeModal.cities && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Destinazioni, Città e Capoluoghi Impattati:</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedStrikeModal.cities.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Guaranteed Slots */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Fasce di Garanzia & Servizi Essenziali:</span>
              </div>
              <p className="leading-relaxed">{selectedStrikeModal.guaranteedSlots}</p>
            </div>

            {/* Companies and Unions */}
            <div className="space-y-2 text-xs text-slate-300">
              <p><strong>Aziende coinvolte:</strong> {selectedStrikeModal.companies.join(', ')}</p>
              <p><strong>Settore interessato:</strong> {selectedStrikeModal.sectors}</p>
              <p><strong>Sindacati proclamanti:</strong> {selectedStrikeModal.unions.join(', ')}</p>
              {selectedStrikeModal.notes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 block">Note e Consigli per gli Utenti:</span>
                  <p>{selectedStrikeModal.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedStrikeModal(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
              >
                Ho Capito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
