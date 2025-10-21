import { useState, useEffect, useMemo, useCallback } from 'react';
import PokemonSprites from './components/PokemonSprites';
import GameGrid from './components/GameGrid';
import SettingsModal from './components/SettingsModal';
import GameSuggestions from './components/GameSuggestions';
import AcquisitionFilters, { ACQUISITION_METHODS } from './components/AcquisitionFilters';
import CollapsibleSection from './components/CollapsibleSection';
import { calculateAvailablePokemon, groupPokemonByGeneration, calculateStats, calculateMinimumGameSet } from './utils/calculator';
import './App.css';

function App() {
  const [pokemon, setPokemon] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Load from localStorage or use defaults
  const [selectedGames, setSelectedGames] = useState(() => {
    const saved = localStorage.getItem('selectedGames');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [enabledGenerations, setEnabledGenerations] = useState(() => {
    const saved = localStorage.getItem('enabledGenerations');
    return saved ? JSON.parse(saved) : {
      1: true, 2: true, 3: true, 4: true, 5: true,
      6: true, 7: true, 8: true, 9: true
    };
  });
  
  const [enabledAcquisitionMethods, setEnabledAcquisitionMethods] = useState(() => {
    const saved = localStorage.getItem('enabledAcquisitionMethods');
    if (saved) return JSON.parse(saved);
    
    // Default: enable all methods by their default values
    const defaults = {};
    ACQUISITION_METHODS.forEach(method => {
      defaults[method.id] = method.default;
    });
    return defaults;
  });
  
  const [acquisitionFiltersOpen, setAcquisitionFiltersOpen] = useState(false);

  // Load data on mount from API
  useEffect(() => {
    // Add cache-busting timestamp
    const cacheBust = Date.now();
    Promise.all([
      fetch(`/api/pokemon?_cb=${cacheBust}`).then(res => res.json()),
      fetch(`/api/games?_cb=${cacheBust}`).then(res => res.json()),
      fetch(`/api/available-pokemon?gameIds=all&_cb=${cacheBust}`).then(res => res.json())
    ])
      .then(([pokemonData, gamesData, encountersData]) => {
        // Convert API data to the format expected by calculator
        // Group encounters by game and deduplicate by pokemon+location
        const gamesWithPokemon = gamesData.map(game => {
          const gameEncounters = encountersData.filter(enc => 
            enc.gameId === game.id || enc.game_id === game.id
          );
          
          // Deduplicate encounters by pokemon_id + location
          // Keep the one with the most complete data (most non-null fields)
          const encounterMap = new Map();
          gameEncounters.forEach(enc => {
            const key = `${enc.pokemon_id || enc.pokemonId}-${enc.location}`;
            const existing = encounterMap.get(key);
            
            // Count non-null fields
            const countNonNull = (e) => [
              e.encounter_area || e.encounterArea,
              e.encounter_rate || e.encounterRate,
              e.level_range || e.levelRange
            ].filter(v => v !== null && v !== undefined).length;
            
            if (!existing || countNonNull(enc) > countNonNull(existing)) {
              encounterMap.set(key, enc);
            }
          });
          
          return {
            ...game,
            pokemon: Array.from(encounterMap.values()).map(enc => ({
              id: enc.pokemonId || enc.pokemon_id,
              location: enc.location,
              acquisitionMethod: enc.acquisitionMethod || enc.acquisition_method,
              encounterArea: enc.encounterArea || enc.encounter_area,
              encounterRate: enc.encounterRate || enc.encounter_rate,
              levelRange: enc.levelRange || enc.level_range,
              timeOfDay: enc.timeOfDay || enc.time_of_day,
              season: enc.season,
              specialRequirements: enc.specialRequirements || enc.special_requirements
            }))
          };
        });
        
        console.log('=== DATA LOADED ===');
        console.log('Total games:', gamesWithPokemon.length);
        console.log('Sample game (Blue):', gamesWithPokemon.find(g => g.id === 'blue'));
        console.log('Blue - Caterpie encounters:', gamesWithPokemon.find(g => g.id === 'blue')?.pokemon.filter(p => p.id === 10));
        console.log('==================');
        
        setPokemon(pokemonData);
        setGames(gamesWithPokemon);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  // Save selectedGames to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedGames', JSON.stringify(selectedGames));
  }, [selectedGames]);

  // Save enabledGenerations to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('enabledGenerations', JSON.stringify(enabledGenerations));
  }, [enabledGenerations]);
  
  // Save enabledAcquisitionMethods to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('enabledAcquisitionMethods', JSON.stringify(enabledAcquisitionMethods));
  }, [enabledAcquisitionMethods]);

  // Memoize filtered Pokemon and games (expensive with 1,025 Pokemon)
  const filteredPokemon = useMemo(
    () => pokemon.filter(p => enabledGenerations[p.generation]),
    [pokemon, enabledGenerations]
  );

  const filteredGames = useMemo(
    () => games.filter(g => enabledGenerations[g.generation]),
    [games, enabledGenerations]
  );

  // Memoize availability calculations (expensive operations)
  const { availableIds, pokemonGameMap, allPokemonGamesMap } = useMemo(
    () => calculateAvailablePokemon(selectedGames, filteredGames, filteredPokemon, enabledAcquisitionMethods),
    [selectedGames, filteredGames, filteredPokemon, enabledAcquisitionMethods]
  );

  // Memoize generation data grouping
  const generationData = useMemo(
    () => groupPokemonByGeneration(filteredPokemon, new Set(availableIds)),
    [filteredPokemon, availableIds]
  );

  // Memoize stats calculation
  const stats = useMemo(
    () => calculateStats(filteredPokemon, new Set(availableIds)),
    [filteredPokemon, availableIds]
  );

  // Memoize game suggestions
  const suggestions = useMemo(
    () => calculateMinimumGameSet(selectedGames, filteredGames, filteredPokemon, new Set(availableIds)),
    [selectedGames, filteredGames, filteredPokemon, availableIds]
  );

  // Memoize callbacks to prevent unnecessary re-renders
  const handleGameToggle = useCallback((gameId) => {
    setSelectedGames(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      } else {
        return [...prev, gameId];
      }
    });
  }, []);

  const handleToggleGeneration = useCallback((genNum) => {
    setEnabledGenerations(prev => ({
      ...prev,
      [genNum]: !prev[genNum]
    }));
  }, []);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleOpenAcquisitionFilters = useCallback(() => setAcquisitionFiltersOpen(true), []);
  const handleCloseAcquisitionFilters = useCallback(() => setAcquisitionFiltersOpen(false), []);
  const handleToggleAcquisitionMethods = useCallback((newState) => setEnabledAcquisitionMethods(newState), []);
  const handleClearSelections = useCallback(() => setSelectedGames([]), []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading Pokémon data...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">Pokémon Collection Tracker</h1>
        <div className="app-buttons">
          <button 
            className="settings-button"
            onClick={handleOpenAcquisitionFilters}
            title="Acquisition Method Filters"
          >
            🎯 Filters
          </button>
          <button 
            className="settings-button"
            onClick={handleOpenSettings}
            title="Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <CollapsibleSection 
        title="Overall Progress" 
        defaultOpen={true}
        badge={`${stats.percentage}%`}
      >
        <div className="overall-stats-content">
          <div className="stats-display">
            <span className="stats-number">{stats.available} / {stats.total}</span>
            <span className="stats-label">Pokémon Available</span>
          </div>
          {selectedGames.length > 0 && (
            <button 
              className="clear-button"
              onClick={handleClearSelections}
            >
              Clear All Selections
            </button>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="Pokémon Collection" 
        defaultOpen={true}
        badge={`${stats.available}/${stats.total}`}
      >
        <PokemonSprites 
          generationData={generationData}
          pokemonGameMap={pokemonGameMap}
          allPokemonGamesMap={allPokemonGamesMap}
        />
      </CollapsibleSection>

      {!suggestions.complete && suggestions.suggestedGames.length > 0 && (
        <CollapsibleSection 
          title="Game Suggestions" 
          defaultOpen={true}
          badge={`${suggestions.totalMissing} missing`}
        >
          <GameSuggestions
            suggestions={suggestions}
            selectedGames={selectedGames}
            onGameToggle={handleGameToggle}
          />
        </CollapsibleSection>
      )}

      <CollapsibleSection 
        title="All Games" 
        defaultOpen={false}
        badge={`${selectedGames.length} selected`}
      >
        <GameGrid 
          games={filteredGames}
          selectedGames={selectedGames}
          onGameToggle={handleGameToggle}
        />
      </CollapsibleSection>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleCloseSettings}
        enabledGenerations={enabledGenerations}
        onToggleGeneration={handleToggleGeneration}
      />

      <AcquisitionFilters
        isOpen={acquisitionFiltersOpen}
        onClose={handleCloseAcquisitionFilters}
        enabledMethods={enabledAcquisitionMethods}
        onToggle={handleToggleAcquisitionMethods}
      />
    </div>
  );
}

export default App;

