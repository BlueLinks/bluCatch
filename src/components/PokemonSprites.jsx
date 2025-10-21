import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import PokemonBottomSheet from './PokemonBottomSheet';
import '../styles/PokemonSprites.css';

// Helper functions moved outside component to avoid recreation on every render
const GAME_GENERATION_MAP = {
  'Red': 1, 'Blue': 1, 'Yellow': 1,
  'Gold': 2, 'Silver': 2, 'Crystal': 2,
  'Ruby': 3, 'Sapphire': 3, 'Emerald': 3, 'FireRed': 3, 'LeafGreen': 3,
  'Diamond': 4, 'Pearl': 4, 'Platinum': 4, 'HeartGold': 4, 'SoulSilver': 4,
  'Black': 5, 'White': 5,
  'X': 6, 'Y': 6, 'Omega Ruby': 6, 'Alpha Sapphire': 6,
  'Sun': 7, 'Moon': 7, 'Ultra Sun': 7, 'Ultra Moon': 7,
  'Sword': 8, 'Shield': 8, 'Brilliant Diamond': 8, 'Shining Pearl': 8,
  'Scarlet': 9, 'Violet': 9
};

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

const simplifyGameName = (fullName) => {
  return fullName.replace('Pokémon ', '');
};

const getGameGeneration = (gameName) => {
  // Sort keys by length (longest first) to match "FireRed" before "Red"
  const sortedKeys = Object.keys(GAME_GENERATION_MAP).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (gameName.includes(key)) {
      return GAME_GENERATION_MAP[key];
    }
  }
  return 99; // Unknown
};

const groupGamesByLocation = (games) => {
  const locationGroups = {};
  
  games.forEach(game => {
    const key = game.location;
    if (!locationGroups[key]) {
      locationGroups[key] = {
        location: game.location,
        games: []
      };
    }
    locationGroups[key].games.push(game);
  });
  
  // Convert to array and sort by number of games (descending)
  return Object.values(locationGroups).sort((a, b) => b.games.length - a.games.length);
};

const formatGameNames = (games) => {
  if (games.length === 1) {
    return simplifyGameName(games[0].gameName);
  }
  
  // Group by generation for readability
  const byGen = {};
  games.forEach(game => {
    const gen = getGameGeneration(game.gameName);
    if (!byGen[gen]) byGen[gen] = [];
    byGen[gen].push(simplifyGameName(game.gameName));
  });
  
  // Sort by generation number and format
  const sortedGens = Object.keys(byGen).sort((a, b) => parseInt(a) - parseInt(b));
  const parts = sortedGens.map(gen => {
    return byGen[gen].join(', ');
  });
  
  return parts.join(' • ');
};

// Separate tooltip component for better performance
const PokemonTooltip = memo(function PokemonTooltip({ pokemon, position, allPokemonGamesMap }) {
  const allGames = allPokemonGamesMap.get(pokemon.id) || [];
  
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
  
  // Smart positioning: prevent tooltip from going off-screen
  const tooltipWidth = 350; // max-width from CSS
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Calculate horizontal position
  const shouldFlipLeft = position.x + tooltipWidth + 15 > windowWidth;
  let leftPos = shouldFlipLeft ? position.x - tooltipWidth - 15 : position.x + 15;
  
  // Ensure tooltip doesn't go off left edge
  if (leftPos < 10) leftPos = 10;
  
  // Calculate vertical position - keep tooltip on screen
  let topPos = position.y + 15;
  const maxTooltipHeight = windowHeight * 0.8; // 80vh max height
  
  // If tooltip would go off bottom, position it higher
  if (topPos + maxTooltipHeight > windowHeight - 20) {
    topPos = Math.max(20, windowHeight - maxTooltipHeight - 20);
  }
  
  const tooltipStyle = {
    left: `${leftPos}px`,
    top: `${topPos}px`,
    maxHeight: `${maxTooltipHeight}px`
  };
  
  if (allGames.length === 0) {
    return (
      <div className="pokemon-tooltip" style={tooltipStyle}>
        <div className="tooltip-header">
          <img src={pokemon.sprite_url || pokemon.sprite} alt={pokemon.name} />
          <div className="tooltip-info">
            <strong>{pokemon.name}</strong>
            <span className="tooltip-id">#{pokemon.id}</span>
            <a 
              href={getBulbapediaUrl(pokemon.name)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tooltip-bulbapedia-link"
              onClick={(e) => e.stopPropagation()}
            >
              📖 Bulbapedia
            </a>
          </div>
        </div>
        <div className="tooltip-unavailable">No data available</div>
      </div>
    );
  }
  
  // Group games by generation, but KEEP them in order (don't group by location!)
  const groupGamesByGeneration = (games) => {
    const byGen = {};
    games.forEach(game => {
      const gen = getGameGeneration(game.gameName);
      if (!byGen[gen]) {
        byGen[gen] = [];
      }
      byGen[gen].push(game);
    });
    return byGen;
  };

  const selectedByGen = groupGamesByGeneration(selectedGames);
  const unselectedByGen = groupGamesByGeneration(unselectedGames);
  
  // Sort generation keys
  const selectedGenKeys = Object.keys(selectedByGen).sort((a, b) => parseInt(a) - parseInt(b));
  const unselectedGenKeys = Object.keys(unselectedByGen).sort((a, b) => parseInt(a) - parseInt(b));
  
  return (
    <div 
      className="pokemon-tooltip"
      style={tooltipStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tooltip-header">
        <img src={pokemon.sprite_url || pokemon.sprite} alt={pokemon.name} />
        <div className="tooltip-info">
          <strong>{pokemon.name}</strong>
          <span className="tooltip-id">#{pokemon.id}</span>
          <a 
            href={getBulbapediaUrl(pokemon.name)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="tooltip-bulbapedia-link"
            onClick={(e) => e.stopPropagation()}
          >
            📖 Bulbapedia
          </a>
        </div>
      </div>
      <div className="tooltip-games">
        {selectedGenKeys.length > 0 && (
          <>
            <div className="tooltip-section-title">✓ Available in selected games:</div>
            {selectedGenKeys.map(gen => {
              const genGames = selectedByGen[gen];
              // Group by location to reduce redundancy, but show games clearly
              const locationGroups = groupGamesByLocation(genGames);
              
              return (
                <div key={gen} className="tooltip-generation">
                  <div className="tooltip-gen-label">Generation {gen}</div>
                  {locationGroups.map((group, idx) => (
                    <div key={idx} className="tooltip-game tooltip-game-selected">
                      <div className="tooltip-game-names">{group.games.map(g => simplifyGameName(g.gameName)).join(' / ')}</div>
                      <div className="tooltip-location">{group.location}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
        
        {unselectedGenKeys.length > 0 && (
          <>
            <div className="tooltip-section-title tooltip-section-unselected">
              {selectedGenKeys.length > 0 ? '○ Also available in:' : '○ Available in (not selected):'}
            </div>
            {unselectedGenKeys.map(gen => {
              const genGames = unselectedByGen[gen];
              // Group by location to reduce redundancy
              const locationGroups = groupGamesByLocation(genGames);
              
              return (
                <div key={gen} className="tooltip-generation">
                  <div className="tooltip-gen-label">Generation {gen}</div>
                  {locationGroups.map((group, idx) => (
                    <div key={idx} className="tooltip-game tooltip-game-unselected">
                      <div className="tooltip-game-names">{group.games.map(g => simplifyGameName(g.gameName)).join(' / ')}</div>
                      <div className="tooltip-location">{group.location}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
});

const PokemonSprites = memo(function PokemonSprites({ generationData, pokemonGameMap, allPokemonGamesMap }) {
  const [hoveredPokemon, setHoveredPokemon] = useState(null);
  const [pinnedPokemon, setPinnedPokemon] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = useCallback((pokemon, event) => {
    // Don't show ANY hover tooltip if ANY pokemon is pinned
    if (!pinnedPokemon) {
      setHoveredPokemon(pokemon);
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [pinnedPokemon]);

  const handleMouseMove = useCallback((event) => {
    // Only update position if hovering (not pinned)
    if (hoveredPokemon && !pinnedPokemon) {
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [hoveredPokemon, pinnedPokemon]);

  const handleMouseLeave = useCallback(() => {
    // Only clear hover if not pinned
    if (!pinnedPokemon) {
      setHoveredPokemon(null);
    }
  }, [pinnedPokemon]);

  const handleClick = useCallback((pokemon, event) => {
    event.stopPropagation();
    
    // On mobile, use bottom sheet
    if (isMobile) {
      setSelectedPokemon(pokemon);
      return;
    }
    
    // On desktop, use pin behavior
    if (pinnedPokemon?.id === pokemon.id) {
      // Unpin if clicking the same pokemon
      setPinnedPokemon(null);
      setHoveredPokemon(null);
    } else {
      // Pin this pokemon
      setPinnedPokemon(pokemon);
      setHoveredPokemon(null);
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [pinnedPokemon, isMobile]);

  // Close pinned tooltip when clicking outside
  const handleContainerClick = useCallback(() => {
    if (pinnedPokemon) {
      setPinnedPokemon(null);
    }
  }, [pinnedPokemon]);


  return (
    <div className="pokemon-sprites-container" onClick={handleContainerClick}>
      {Object.entries(generationData).map(([gen, data]) => (
        <div key={gen} className="generation-group">
          <div className="generation-header">
            <h2>Generation {gen}</h2>
            <span className="counter">
              {data.available} / {data.total} available
            </span>
          </div>
          <div className="sprites-row">
            {data.pokemon.map(pokemon => (
              <div
                key={pokemon.id}
                className={`sprite-container ${pokemon.isAvailable ? 'available' : 'unavailable'} ${pinnedPokemon?.id === pokemon.id ? 'pinned' : ''}`}
                onMouseEnter={(e) => !isMobile && handleMouseEnter(pokemon, e)}
                onMouseMove={!isMobile ? handleMouseMove : undefined}
                onMouseLeave={!isMobile ? handleMouseLeave : undefined}
                onClick={(e) => handleClick(pokemon, e)}
                style={{ cursor: 'pointer' }}
              >
                <img 
                  src={pokemon.sprite} 
                  alt={pokemon.name}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Desktop tooltip */}
      {!isMobile && (hoveredPokemon || pinnedPokemon) && (
        <PokemonTooltip
          pokemon={hoveredPokemon || pinnedPokemon}
          position={tooltipPosition}
          allPokemonGamesMap={allPokemonGamesMap}
        />
      )}

      {/* Mobile bottom sheet */}
      <PokemonBottomSheet
        pokemon={selectedPokemon}
        isOpen={!!selectedPokemon}
        onClose={() => setSelectedPokemon(null)}
        allPokemonGamesMap={allPokemonGamesMap}
      />
    </div>
  );
});

export default PokemonSprites;

