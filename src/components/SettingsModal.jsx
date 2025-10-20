import React, { useMemo, useCallback } from 'react';
import '../styles/SettingsModal.css';

// Move static data outside component
const GENERATIONS = [
  { num: 1, name: 'Kanto', games: 'Red, Blue, Yellow' },
  { num: 2, name: 'Johto', games: 'Gold, Silver, Crystal' },
  { num: 3, name: 'Hoenn', games: 'Ruby, Sapphire, Emerald' },
  { num: 4, name: 'Sinnoh', games: 'Diamond, Pearl, Platinum' },
  { num: 5, name: 'Unova', games: 'Black, White, Black 2, White 2' },
  { num: 6, name: 'Kalos', games: 'X, Y' },
  { num: 7, name: 'Alola', games: 'Sun, Moon, Ultra Sun, Ultra Moon' },
  { num: 8, name: 'Galar', games: 'Sword, Shield' },
  { num: 9, name: 'Paldea', games: 'Scarlet, Violet' }
];

const SettingsModal = React.memo(function SettingsModal({ isOpen, onClose, enabledGenerations, onToggleGeneration }) {
  // Memoize expensive checks
  const allEnabled = useMemo(
    () => GENERATIONS.every(g => enabledGenerations[g.num]),
    [enabledGenerations]
  );

  const handleToggleAll = useCallback(() => {
    const newState = !allEnabled;
    GENERATIONS.forEach(g => {
      if (enabledGenerations[g.num] !== newState) {
        onToggleGeneration(g.num);
      }
    });
  }, [allEnabled, enabledGenerations, onToggleGeneration]);

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <h3>Filter by Generation</h3>
            <button 
              className="toggle-all-button"
              onClick={handleToggleAll}
            >
              {allEnabled ? 'Disable All' : 'Enable All'}
            </button>
          </div>
          
          <div className="generation-toggles">
            {GENERATIONS.map(gen => (
              <label 
                key={gen.num} 
                className={`generation-toggle ${enabledGenerations[gen.num] ? 'enabled' : 'disabled'}`}
              >
                <input
                  type="checkbox"
                  checked={enabledGenerations[gen.num]}
                  onChange={() => onToggleGeneration(gen.num)}
                />
                <div className="toggle-content">
                  <div className="toggle-main">
                    <span className="gen-number">Gen {gen.num}</span>
                    <span className="gen-name">{gen.name}</span>
                  </div>
                  <div className="toggle-games">{gen.games}</div>
                </div>
                <div className="toggle-indicator">
                  {enabledGenerations[gen.num] ? '✓' : ''}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-footer">
          <p className="settings-hint">
            Disabled generations will be hidden from the Pokémon list
          </p>
        </div>
      </div>
    </div>
  );
});

export default SettingsModal;

