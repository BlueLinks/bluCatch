import React from 'react';
import '../styles/GameCard.css';

// Memoize to prevent re-renders when props haven't changed
const GameCard = React.memo(function GameCard({ game, isSelected, onToggle }) {
  const platformClass = game.platform ? `platform-${game.platform}` : 'platform-default';
  
  return (
    <div 
      className={`game-card ${platformClass} ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
      title={game.name}
    >
      <div className="game-card-image">
        <img 
          src={game.boxArt} 
          alt={game.name}
          onError={(e) => {
            // Fallback for missing images
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext fill="%23fff" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E' + encodeURIComponent(game.name) + '%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
      <div className="game-card-name">{game.name}</div>
    </div>
  );
});

export default GameCard;

