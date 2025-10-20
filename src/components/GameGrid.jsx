import { useMemo, memo } from 'react';
import GameCard from './GameCard';
import '../styles/GameGrid.css';

const GameGrid = memo(function GameGrid({ games, selectedGames, onGameToggle }) {
  // Memoize grouping to avoid recalculating on every render
  const gamesByGeneration = useMemo(() => {
    return games.reduce((acc, game) => {
      if (!acc[game.generation]) {
        acc[game.generation] = [];
      }
      acc[game.generation].push(game);
      return acc;
    }, {});
  }, [games]);

  return (
    <div className="game-grid-container">
      <h2>Select Games</h2>
      {Object.entries(gamesByGeneration).map(([gen, genGames]) => (
        <div key={gen} className="generation-section">
          <h3>Generation {gen}</h3>
          <div className="game-grid">
            {genGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isSelected={selectedGames.includes(game.id)}
                onToggle={() => onGameToggle(game.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default GameGrid;

