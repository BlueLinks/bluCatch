import React, { useState, useMemo, useCallback } from 'react';
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

const simplifyGameName = (fullName) => {
  return fullName.replace('Pokémon ', '');
};

const getGameGeneration = (gameName) => {
  for (const [key, gen] of Object.entries(GAME_GENERATION_MAP)) {
    if (gameName.includes(key)) return gen;
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
const PokemonTooltip = React.memo(function PokemonTooltip({ pokemon, position, allPokemonGamesMap }) {
  const allGames = allPokemonGamesMap.get(pokemon.id) || [];
  const selectedGames = useMemo(() => allGames.filter(g => g.isSelected), [allGames]);
  const unselectedGames = useMemo(() => allGames.filter(g => !g.isSelected), [allGames]);
  
  // Smart positioning: prevent tooltip from going off-screen
  const tooltipWidth = 350; // max-width from CSS
  const tooltipEstimatedHeight = 400; // estimated max height
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Flip to left if too close to right edge
  const shouldFlipLeft = position.x + tooltipWidth + 15 > windowWidth;
  
  // Flip to top if too close to bottom edge
  const shouldFlipUp = position.y + tooltipEstimatedHeight + 15 > windowHeight;
  
  const tooltipStyle = {
    left: shouldFlipLeft ? `${position.x - tooltipWidth - 15}px` : `${position.x + 15}px`,
    top: shouldFlipUp ? `${position.y - tooltipEstimatedHeight - 15}px` : `${position.y + 15}px`
  };
  
  if (allGames.length === 0) {
    return (
      <div className="pokemon-tooltip" style={tooltipStyle}>
        <div className="tooltip-header">
          <strong>{pokemon.name}</strong>
          <span className="tooltip-id">#{pokemon.id}</span>
        </div>
        <div className="tooltip-unavailable">No data available</div>
      </div>
    );
  }
  
  const selectedGroups = groupGamesByLocation(selectedGames);
  const unselectedGroups = groupGamesByLocation(unselectedGames);
  
  return (
    <div 
      className="pokemon-tooltip"
      style={tooltipStyle}
    >
      <div className="tooltip-header">
        <strong>{pokemon.name}</strong>
        <span className="tooltip-id">#{pokemon.id}</span>
      </div>
      <div className="tooltip-games">
        {selectedGroups.length > 0 && (
          <>
            <div className="tooltip-section-title">✓ Available in selected games:</div>
            {selectedGroups.map((group, idx) => (
              <div key={idx} className="tooltip-game tooltip-game-selected">
                <strong className="tooltip-game-list">{formatGameNames(group.games)}</strong>
                <span className="tooltip-location">{group.location}</span>
              </div>
            ))}
          </>
        )}
        
        {unselectedGroups.length > 0 && (
          <>
            <div className="tooltip-section-title tooltip-section-unselected">
              {selectedGroups.length > 0 ? '○ Also available in:' : '○ Available in (not selected):'}
            </div>
            {unselectedGroups.map((group, idx) => (
              <div key={idx} className="tooltip-game tooltip-game-unselected">
                <strong className="tooltip-game-list">{formatGameNames(group.games)}</strong>
                <span className="tooltip-location">{group.location}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
});

const PokemonSprites = React.memo(function PokemonSprites({ generationData, pokemonGameMap, allPokemonGamesMap }) {
  const [hoveredPokemon, setHoveredPokemon] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((pokemon, event) => {
    setHoveredPokemon(pokemon);
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (hoveredPokemon) {
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [hoveredPokemon]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPokemon(null);
  }, []);


  return (
    <div className="pokemon-sprites-container">
      <h1>Pokémon Collection Tracker</h1>
      
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
                className={`sprite-container ${pokemon.isAvailable ? 'available' : 'unavailable'}`}
                onMouseEnter={(e) => handleMouseEnter(pokemon, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
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

      {hoveredPokemon && (
        <PokemonTooltip
          pokemon={hoveredPokemon}
          position={tooltipPosition}
          allPokemonGamesMap={allPokemonGamesMap}
        />
      )}
    </div>
  );
});

export default PokemonSprites;

