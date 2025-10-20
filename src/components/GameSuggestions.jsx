import React from 'react';
import '../styles/GameSuggestions.css';

const GameSuggestions = React.memo(function GameSuggestions({ suggestions, selectedGames, onGameToggle }) {
  if (selectedGames.length === 0) {
    return (
      <div className="game-suggestions">
        <h2>💡 Game Suggestions</h2>
        <div className="suggestion-prompt">
          <p>Select some games to get personalized suggestions for completing your collection!</p>
        </div>
      </div>
    );
  }

  if (suggestions.complete) {
    return (
      <div className="game-suggestions">
        <h2>🎉 Collection Complete!</h2>
        <div className="suggestion-complete">
          <p>Congratulations! You can catch all Pokémon with your selected games!</p>
          <div className="complete-icon">✨🔴⚪✨</div>
        </div>
      </div>
    );
  }

  const topSuggestion = suggestions.suggestedGames[0];
  const nextBest = suggestions.suggestedGames.slice(1, 4);

  return (
    <div className="game-suggestions">
      <h2>💡 Game Suggestions</h2>
      
      <div className="missing-info">
        <span className="missing-count">{suggestions.totalMissing} Pokémon</span>
        <span className="missing-label">still needed</span>
      </div>

      {topSuggestion && (
        <div className="top-suggestion">
          <div className="suggestion-header">
            <h3>🎯 Best Pick</h3>
            <span className="coverage-badge">
              +{topSuggestion.coversCount} Pokémon ({topSuggestion.coveragePercentage}%)
            </span>
          </div>
          
          <div 
            className="suggested-game-card"
            onClick={() => onGameToggle(topSuggestion.gameId)}
            title={`Click to add ${topSuggestion.gameName}`}
          >
            <div className={`game-mini-image platform-${topSuggestion.platform || 'default'}`}>
              <img src={topSuggestion.boxArt} alt={topSuggestion.gameName} />
            </div>
            <div className="game-info">
              <div className="game-name">{topSuggestion.gameName}</div>
              <div className="game-coverage">
                Adds {topSuggestion.coversCount} missing Pokémon
              </div>
            </div>
            <div className="add-button">+ Add</div>
          </div>
        </div>
      )}

      {nextBest.length > 0 && (
        <div className="other-suggestions">
          <h4>Other Good Options:</h4>
          <div className="suggestion-list">
            {nextBest.map(game => (
              <div 
                key={game.gameId}
                className="suggestion-item"
                onClick={() => onGameToggle(game.gameId)}
                title={`Click to add ${game.gameName}`}
              >
                <div className="suggestion-item-content">
                  <span className="suggestion-game-name">{game.gameName}</span>
                  <span className="suggestion-coverage">+{game.coversCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.suggestedGames.length > 0 && (
        <div className="optimal-set-info">
          <p className="optimal-hint">
            💡 With these {Math.min(suggestions.suggestedGames.length, 3)} games, 
            you'd have {suggestions.totalMissing - suggestions.remainingAfterSuggestions} more Pokémon
            {suggestions.remainingAfterSuggestions > 0 && 
              ` (${suggestions.remainingAfterSuggestions} would still be missing)`}
          </p>
        </div>
      )}
    </div>
  );
});

export default GameSuggestions;

