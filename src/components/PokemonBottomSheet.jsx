import { useState, useEffect, useMemo } from 'react';
import { groupGamesByLocation, groupGamesByGeneration, getGameGeneration, simplifyGameName } from '../utils/grouping';
import '../styles/PokemonBottomSheet.css';

const getBulbapediaUrl = (pokemonName) => {
  // Convert special names to Bulbapedia format
  let cleanName = pokemonName;
  if (pokemonName === 'Nidoran F') cleanName = 'Nidoran♀';
  else if (pokemonName === 'Nidoran M') cleanName = 'Nidoran♂';
  else if (pokemonName === 'Ho Oh') cleanName = 'Ho-Oh';
  else if (pokemonName === 'Farfetchd') cleanName = "Farfetch'd";
  else if (pokemonName === 'Mr Mime') cleanName = 'Mr. Mime';
  else if (pokemonName === 'Mr Rime') cleanName = 'Mr. Rime';
  else if (pokemonName === 'Mime Jr') cleanName = 'Mime Jr.';
  else if (pokemonName === 'Porygon Z') cleanName = 'Porygon-Z';
  else if (pokemonName === 'Type Null') cleanName = 'Type: Null';
  else if (pokemonName === 'Jangmo O') cleanName = 'Jangmo-o';
  else if (pokemonName === 'Hakamo O') cleanName = 'Hakamo-o';
  else if (pokemonName === 'Kommo O') cleanName = 'Kommo-o';
  
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(cleanName)}_(Pokémon)`;
};

// Removed duplicate functions - now using shared utilities from utils/grouping.js

const PokemonBottomSheet = ({ pokemon, isOpen, onClose, allPokemonGamesMap }) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchCurrent, setTouchCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const allGames = allPokemonGamesMap.get(pokemon?.id) || [];
  
  // Note: Filtering is now handled in calculator.js at the data level
  // All games in allPokemonGamesMap are already filtered for valid acquisition methods
  const selectedGames = useMemo(() => 
    allGames.filter(g => g.isSelected), 
    [allGames]
  );
  const unselectedGames = useMemo(() => 
    allGames.filter(g => !g.isSelected), 
    [allGames]
  );
  
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Touch gesture handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const current = e.touches[0].clientY;
    setTouchCurrent(current);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = touchCurrent - touchStart;
    
    // If dragged down more than 100px, close the sheet
    if (deltaY > 100) {
      onClose();
    }
    
    setTouchStart(0);
    setTouchCurrent(0);
    setIsDragging(false);
  };

  const translateY = isDragging && touchCurrent > touchStart 
    ? Math.max(0, touchCurrent - touchStart) 
    : 0;

  if (!isOpen || !pokemon) return null;

  const selectedByGen = groupGamesByGeneration(selectedGames);
  const unselectedByGen = groupGamesByGeneration(unselectedGames);
  
  const selectedGenKeys = Object.keys(selectedByGen).sort((a, b) => parseInt(a) - parseInt(b));
  const unselectedGenKeys = Object.keys(unselectedByGen).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div 
        className={`bottom-sheet ${isOpen ? 'open' : ''}`}
        style={isDragging ? { transform: `translateY(${translateY}px)` } : {}}
      >
        <div 
          className="bottom-sheet-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <div className="bottom-sheet-content">
          <div className="bottom-sheet-header">
            <div className="bottom-sheet-pokemon-info">
              <img 
                src={pokemon.sprite_url || pokemon.sprite} 
                alt={pokemon.name}
                className="bottom-sheet-sprite"
              />
              <div>
                <h3>{pokemon.name}</h3>
                <span className="bottom-sheet-id">#{pokemon.id}</span>
                <a 
                  href={getBulbapediaUrl(pokemon.name)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bottom-sheet-bulbapedia-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  📖 View on Bulbapedia
                </a>
              </div>
            </div>
            <button className="bottom-sheet-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="bottom-sheet-games">
            {allGames.length === 0 ? (
              <div className="bottom-sheet-unavailable">No data available</div>
            ) : (
              <>
                {selectedGenKeys.length > 0 && (
                  <div className="bottom-sheet-section">
                    <div className="bottom-sheet-section-title">✓ Available in selected games</div>
                    {selectedGenKeys.map(gen => {
                      const genGames = selectedByGen[gen];
                      const locationGroups = groupGamesByLocation(genGames);
                      
                      return (
                        <div key={gen} className="bottom-sheet-generation">
                          <div className="bottom-sheet-gen-label">Generation {gen}</div>
                          {locationGroups.map((group, idx) => (
                            <div key={idx} className="bottom-sheet-game selected">
                              <div className="bottom-sheet-game-names">
                                {group.games.map(g => simplifyGameName(g.gameName)).join(' / ')}
                              </div>
                              <div className="bottom-sheet-location">
                                {group.location}
                                {group.encounterArea && <span className="encounter-detail"> ({group.encounterArea})</span>}
                                {group.levelRange && <span className="encounter-detail"> • Lv. {group.levelRange}</span>}
                                {group.encounterRate && <span className="encounter-detail"> • {group.encounterRate}</span>}
                                {group.timeOfDay && <span className="encounter-detail"> • {group.timeOfDay}</span>}
                                {group.season && <span className="encounter-detail"> • {group.season}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {unselectedGenKeys.length > 0 && (
                  <div className="bottom-sheet-section">
                    <div className="bottom-sheet-section-title unselected">
                      {selectedGenKeys.length > 0 ? '○ Also available in' : '○ Available in (not selected)'}
                    </div>
                    {unselectedGenKeys.map(gen => {
                      const genGames = unselectedByGen[gen];
                      const locationGroups = groupGamesByLocation(genGames);
                      
                      return (
                        <div key={gen} className="bottom-sheet-generation">
                          <div className="bottom-sheet-gen-label">Generation {gen}</div>
                          {locationGroups.map((group, idx) => (
                            <div key={idx} className="bottom-sheet-game unselected">
                              <div className="bottom-sheet-game-names">
                                {group.games.map(g => simplifyGameName(g.gameName)).join(' / ')}
                              </div>
                              <div className="bottom-sheet-location">
                                {group.location}
                                {group.encounterArea && <span className="encounter-detail"> ({group.encounterArea})</span>}
                                {group.levelRange && <span className="encounter-detail"> • Lv. {group.levelRange}</span>}
                                {group.encounterRate && <span className="encounter-detail"> • {group.encounterRate}</span>}
                                {group.timeOfDay && <span className="encounter-detail"> • {group.timeOfDay}</span>}
                                {group.season && <span className="encounter-detail"> • {group.season}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PokemonBottomSheet;

