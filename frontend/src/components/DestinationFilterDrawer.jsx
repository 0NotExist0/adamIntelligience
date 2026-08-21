import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Building2, 
  Check, 
  RotateCcw, 
  Search, 
  Sliders, 
  Sparkles, 
  Compass, 
  Globe, 
  Star, 
  ChevronRight,
  CheckCircle2,
  Navigation
} from 'lucide-react';

// Database completo delle 20 Regioni Italiane, Macro-Aree e Capoluoghi
export const ITALIAN_REGIONS_DATA = [
  // NORD
  { id: 'lombardia', name: 'Lombardia', area: 'Nord', capital: 'Milano', cities: ['Milano', 'Brescia', 'Monza', 'Bergamo', 'Como', 'Varese', 'Pavia', 'Cremona', 'Mantova', 'Lecco', 'Lodi', 'Sondrio'] },
  { id: 'piemonte', name: 'Piemonte', area: 'Nord', capital: 'Torino', cities: ['Torino', 'Novara', 'Alessandria', 'Asti', 'Cuneo', 'Vercelli', 'Biella', 'Verbania'] },
  { id: 'veneto', name: 'Veneto', area: 'Nord', capital: 'Venezia', cities: ['Venezia', 'Verona', 'Padova', 'Vicenza', 'Treviso', 'Rovigo', 'Belluno'] },
  { id: 'emilia_romagna', name: 'Emilia-Romagna', area: 'Nord', capital: 'Bologna', cities: ['Bologna', 'Parma', 'Modena', 'Reggio Emilia', 'Ravenna', 'Rimini', 'Ferrara', 'Forlì', 'Cesena', 'Piacenza'] },
  { id: 'liguria', name: 'Liguria', area: 'Nord', capital: 'Genova', cities: ['Genova', 'La Spezia', 'Savona', 'Imperia', 'Sanremo'] },
  { id: 'friuli_venezia_giulia', name: 'Friuli-Venezia Giulia', area: 'Nord', capital: 'Trieste', cities: ['Trieste', 'Udine', 'Pordenone', 'Gorizia'] },
  { id: 'trentino_alto_adige', name: 'Trentino-Alto Adige', area: 'Nord', capital: 'Trento', cities: ['Trento', 'Bolzano', 'Rovereto', 'Merano'] },
  { id: 'valle_daosta', name: 'Valle d\'Aosta', area: 'Nord', capital: 'Aosta', cities: ['Aosta', 'Courmayeur'] },

  // CENTRO
  { id: 'lazio', name: 'Lazio', area: 'Centro', capital: 'Roma', cities: ['Roma', 'Fiumicino', 'Latina', 'Guidonia', 'Frosinone', 'Viterbo', 'Rieti', 'Civitavecchia'] },
  { id: 'toscana', name: 'Toscana', area: 'Centro', capital: 'Firenze', cities: ['Firenze', 'Prato', 'Livorno', 'Arezzo', 'Pistoia', 'Pisa', 'Lucca', 'Grosseto', 'Massa', 'Carrara', 'Siena'] },
  { id: 'marche', name: 'Marche', area: 'Centro', capital: 'Ancona', cities: ['Ancona', 'Pesaro', 'Fano', 'Ascoli Piceno', 'San Benedetto del Tronto', 'Macerata', 'Fermo'] },
  { id: 'umbria', name: 'Umbria', area: 'Centro', capital: 'Perugia', cities: ['Perugia', 'Terni', 'Foligno', 'Spoleto', 'Assisi'] },
  { id: 'abruzzo', name: 'Abruzzo', area: 'Centro', capital: 'L\'Aquila', cities: ['L\'Aquila', 'Pescara', 'Chieti', 'Teramo', 'Montesilvano', 'Avezzano'] },

  // SUD & ISOLE
  { id: 'campania', name: 'Campania', area: 'Sud & Isole', capital: 'Napoli', cities: ['Napoli', 'Salerno', 'Giugliano in Campania', 'Torre del Greco', 'Pozzuoli', 'Caserta', 'Benevento', 'Avellino'] },
  { id: 'puglia', name: 'Puglia', area: 'Sud & Isole', capital: 'Bari', cities: ['Bari', 'Taranto', 'Foggia', 'Andria', 'Lecce', 'Barletta', 'Brindisi', 'Altamura'] },
  { id: 'sicilia', name: 'Sicilia', area: 'Sud & Isole', capital: 'Palermo', cities: ['Palermo', 'Catania', 'Messina', 'Siracusa', 'Marsala', 'Gela', 'Ragusa', 'Trapani', 'Agrigento', 'Caltanissetta', 'Enna'] },
  { id: 'sardegna', name: 'Sardegna', area: 'Sud & Isole', capital: 'Cagliari', cities: ['Cagliari', 'Sassari', 'Quartu Sant\'Elena', 'Olbia', 'Nuoro', 'Alghero', 'Oristano'] },
  { id: 'calabria', name: 'Calabria', area: 'Sud & Isole', capital: 'Catanzaro', cities: ['Catanzaro', 'Reggio Calabria', 'Corigliano-Rossano', 'Lamezia Terme', 'Cosenza', 'Crotone', 'Vibo Valentia'] },
  { id: 'basilicata', name: 'Basilicata', area: 'Sud & Isole', capital: 'Potenza', cities: ['Potenza', 'Matera', 'Melfi', 'Pisticci'] },
  { id: 'molise', name: 'Molise', area: 'Sud & Isole', capital: 'Campobasso', cities: ['Campobasso', 'Termoli', 'Isernia', 'Venafro'] }
];

export const REGIONAL_CAPITALS = ITALIAN_REGIONS_DATA.map((r) => r.capital);

export const TOP_CITIES_SHORTCUTS = [
  'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 
  'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona',
  'Trieste', 'Cagliari', 'Bergamo', 'Pescara', 'Trento', 'Ancona'
];

export default function DestinationFilterDrawer({
  isOpen,
  onClose,
  selectedRegion,
  setSelectedRegion,
  selectedCity,
  setSelectedCity,
  onlyCapitals,
  setOnlyCapitals,
  scopeFilter,
  setScopeFilter,
  onResetFilters,
  totalMatchingStrikes = 0
}) {
  const [regionSearch, setRegionSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedAreaTab, setSelectedAreaTab] = useState('Tutte'); // Tutte, Nord, Centro, Sud & Isole

  // Filtered regions list
  const filteredRegions = useMemo(() => {
    return ITALIAN_REGIONS_DATA.filter((reg) => {
      const matchArea = selectedAreaTab === 'Tutte' || reg.area === selectedAreaTab;
      const matchSearch = reg.name.toLowerCase().includes(regionSearch.toLowerCase()) ||
                          reg.capital.toLowerCase().includes(regionSearch.toLowerCase());
      return matchArea && matchSearch;
    });
  }, [regionSearch, selectedAreaTab]);

  // Filtered cities list
  const allCitiesList = useMemo(() => {
    const list = [];
    ITALIAN_REGIONS_DATA.forEach((reg) => {
      if (!selectedRegion || selectedRegion === 'all' || selectedRegion === reg.name) {
        reg.cities.forEach((city) => {
          list.push({
            city,
            region: reg.name,
            isCapital: reg.capital === city
          });
        });
      }
    });
    return list;
  }, [selectedRegion]);

  const filteredCities = useMemo(() => {
    return allCitiesList.filter((item) => {
      const matchSearch = item.city.toLowerCase().includes(citySearch.toLowerCase());
      const matchCapital = !onlyCapitals || item.isCapital;
      return matchSearch && matchCapital;
    });
  }, [allCitiesList, citySearch, onlyCapitals]);

  // Active filters count
  const activeFiltersCount = (selectedRegion && selectedRegion !== 'all' ? 1 : 0) +
                             (selectedCity && selectedCity !== 'all' ? 1 : 0) +
                             (onlyCapitals ? 1 : 0) +
                             (scopeFilter && scopeFilter !== 'all' ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Panel from Right */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-purple-500/40 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 px-6 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
                📍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Filtri Destinazioni</h3>
                  {activeFiltersCount > 0 && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                      {activeFiltersCount} ATTIVI
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">Filtra per Regione, Città e Capoluogo</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={onResetFilters}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                  title="Azzera tutti i filtri territoriali"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Azzera</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950/50 text-xs">
            
            {/* Live Results Counter Badge */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Scioperi corrispondenti ai filtri:</span>
              </span>
              <span className="text-sm font-black text-white font-mono bg-purple-500/20 px-2.5 py-0.5 rounded-xl border border-purple-500/30">
                {totalMatchingStrikes}
              </span>
            </div>

            {/* Section 1: Ambito Territoriale */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>1. Ambito Territoriale</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Tutti gli Ambiti' },
                  { id: 'Nazionale', label: 'Solo Nazionali' },
                  { id: 'Regionale', label: 'Solo Regionali' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setScopeFilter(s.id)}
                    className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-all border ${
                      scopeFilter === s.id
                        ? 'bg-purple-600 text-white border-purple-400/50 shadow-md shadow-purple-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Special Capoluoghi Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">Solo Capoluoghi di Regione</span>
                    <span className="text-[10px] text-slate-400">Roma, Milano, Napoli, Torino, Bologna, Firenze, ecc.</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyCapitals}
                    onChange={(e) => setOnlyCapitals(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* Section 3: Regioni Italiane */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Regione ({filteredRegions.length}/20)</span>
                </label>

                {selectedRegion && selectedRegion !== 'all' && (
                  <button
                    onClick={() => setSelectedRegion('all')}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Tutte le Regioni
                  </button>
                )}
              </div>

              {/* Macro-area Tabs */}
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                {['Tutte', 'Nord', 'Centro', 'Sud & Isole'].map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedAreaTab(area)}
                    className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                      selectedAreaTab === area
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Search Region Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  placeholder="Cerca regione (es. Lazio, Lombardia, Toscana)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Regions Grid Chips */}
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedRegion('all')}
                  className={`p-2 rounded-xl text-left font-bold text-[11px] transition-all border flex items-center justify-between ${
                    !selectedRegion || selectedRegion === 'all'
                      ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <span>🇮🇹 Tutte le Regioni</span>
                  {(!selectedRegion || selectedRegion === 'all') && <Check className="w-3 h-3 text-purple-300" />}
                </button>

                {filteredRegions.map((reg) => {
                  const isSelected = selectedRegion === reg.name;
                  return (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegion(isSelected ? 'all' : reg.name)}
                      className={`p-2 rounded-xl text-left font-medium text-[11px] transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-400/60 shadow'
                          : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold">{reg.name}</span>
                        <span className="text-[9px] text-slate-400 block truncate">Capoluogo: {reg.capital}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Città & Destinazioni */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. Città & Destinazione Specifica</span>
                </label>

                {selectedCity && selectedCity !== 'all' && (
                  <button
                    onClick={() => setSelectedCity('all')}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Tutte le Città
                  </button>
                )}
              </div>

              {/* Quick City Shortcuts */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 block">Città Principali / Hub Trasporti:</span>
                <div className="flex flex-wrap gap-1">
                  {TOP_CITIES_SHORTCUTS.map((city) => {
                    const isSelected = selectedCity === city;
                    return (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(isSelected ? 'all' : city)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-400 shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Cerca qualsiasi città italiana..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Matching Cities List */}
              {citySearch && (
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 max-h-36 overflow-y-auto space-y-1">
                  {filteredCities.slice(0, 15).map((item) => (
                    <button
                      key={item.city}
                      onClick={() => {
                        setSelectedCity(item.city);
                        setCitySearch('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] transition-colors ${
                        selectedCity === item.city
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-bold">{item.city}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.region} {item.isCapital ? '⭐ Capoluogo' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected City Active Tag */}
              {selectedCity && selectedCity !== 'all' && (
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Città selezionata: <strong>{selectedCity}</strong></span>
                  </span>
                  <button
                    onClick={() => setSelectedCity('all')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/90 flex items-center gap-3 shrink-0">
            <button
              onClick={onResetFilters}
              disabled={activeFiltersCount === 0}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all disabled:opacity-50"
            >
              Azzera Tutto
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-purple-500/25 border border-purple-400/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Mostra {totalMatchingStrikes} Risultati</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
