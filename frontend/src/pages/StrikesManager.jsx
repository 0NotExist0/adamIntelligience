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
  RefreshCw
} from 'lucide-react';
import { runAgentChatPipeline } from '../services/agentPipeline';
import { useToast } from '../components/Toast';

// Database degli Scioperi per Tutte le Categorie
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
    status: 'Confermato',
    statusType: 'confirmed', // confirmed, imminent, in_progress, revoked
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
    companies: ['ATAC Roma', 'ATM Milano', 'ANM Napoli', 'GTT Torino', 'Tper Bologna'],
    sectors: 'Autisti, macchinisti metro, personale di stazione e officine',
    unions: ['Filt-Cgil', 'Fit-Cisl', 'Uiltrasporti', 'Faisa Cisal', 'Ugl Fna'],
    startDate: '2026-03-13T00:00:00',
    endDate: '2026-03-13T23:59:00',
    duration: '24 Ore (con fasce di garanzia)',
    scope: 'Nazionale (Tutte le città metropolitane)',
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
    title: 'Fermo Servizio Bus Extraurbani e Tram',
    companies: ['Autolinee Toscane', 'Cotral Lazio', 'EAV Campania'],
    sectors: 'Linee bus extraurbane e ferrovie isolate',
    unions: ['USB Lavoro Privato'],
    startDate: '2026-03-27T08:30:00',
    endDate: '2026-03-27T12:30:00',
    duration: '4 Ore (dalle 08:30 alle 12:30)',
    scope: 'Regionale (Toscana, Lazio, Campania)',
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

  // Auto-Switch configuration state
  const [isAutoSwitch, setIsAutoSwitch] = useState(true);
  const [switchIntervalSec, setSwitchIntervalSec] = useState(6);
  const [switchProgress, setSwitchProgress] = useState(0);
  const [isAiVerifying, setIsAiVerifying] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const autoSwitchTimerRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Filter categories list (excluding 'all' for rotation or including all)
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
        // Switch to next category
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

  // Navigate manually
  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setSwitchProgress(0); // reset progress on user click
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

  // AI Live Verification
  const handleVerifyWithAi = async () => {
    setIsAiVerifying(true);
    addToast('🤖 Agente AI: Ricerca sul Web e fact-checking scioperi in corso...', 'info');

    try {
      const prompt = `Effettua un controllo aggiornato sugli scioperi in Italia per trasporti (treni, aerei, tpl), scuola, sanità e sciopero generale. Verifica le ultime date proclamate, fasce di garanzia e se ci sono revoche o conferme ufficiali.`;
      
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

  // Filter strikes
  const filteredStrikes = strikes.filter((s) => {
    const matchCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchStatus = selectedStatus === 'all' || s.statusType === selectedStatus;
    const matchQuery = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scope.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companies.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.unions.some((u) => u.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchStatus && matchQuery;
  });

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
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
              Calendario in tempo reale di tutte le categorie con auto-switch dinamico e fact-checking AI
            </p>
          </div>
        </div>

        {/* Live Controls: Auto-Switch & AI Check */}
        <div className="flex flex-wrap items-center gap-2.5">
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
                <span className="hidden sm:inline">{isAutoSwitch ? 'Auto-Switch Attivo' : 'Auto-Switch In Pausa'}</span>
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
            <span>{isAiVerifying ? 'Ricerca Web AI...' : 'Verifica Live con Agente Web'}</span>
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
            <span>Rotazione automatica tra le 8 categorie</span>
            <span>Passaggio al prossimo tab tra {Math.ceil(switchIntervalSec * (1 - switchProgress / 100))}s</span>
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

      {/* Search & Status Filters */}
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

        <span className="text-xs text-slate-400 font-mono">
          Fasce di garanzia tutelate per legge ex L. 146/90
        </span>
      </div>

      {/* Strikes Grid */}
      {filteredStrikes.length === 0 ? (
        <div className="h-64 glass-panel rounded-3xl border border-slate-800 flex flex-col items-center justify-center space-y-2 text-slate-500 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
          <p className="text-sm font-semibold text-slate-300">Nessuno sciopero trovato per i filtri selezionati</p>
          <p className="text-xs text-slate-500">I servizi per questa categoria risultano regolari.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStrikes.map((strike) => {
            const isHighImpact = strike.impact === 'Alto' || strike.impact === 'Molto Alto';
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
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          {strike.scope}
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
