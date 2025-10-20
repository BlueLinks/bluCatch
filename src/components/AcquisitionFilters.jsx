import React from 'react';
import '../styles/AcquisitionFilters.css';

// Acquisition method definitions
const ACQUISITION_METHODS = [
  {
    id: 'wild',
    label: 'Wild Encounters',
    icon: '🌿',
    description: 'Found in grass, caves, water, etc.',
    default: true
  },
  {
    id: 'gift',
    label: 'Gifts & Starters',
    icon: '🎁',
    description: 'Given by NPCs or chosen at start',
    default: true
  },
  {
    id: 'evolution',
    label: 'Evolution',
    icon: '⭐',
    description: 'Evolved from other Pokémon',
    default: true
  },
  {
    id: 'trade',
    label: 'In-Game Trades',
    icon: '🔄',
    description: 'NPC trades (no player needed)',
    default: true
  },
  {
    id: 'trade-evolution',
    label: 'Trade Evolution',
    icon: '🤝',
    description: 'Requires trading with another player',
    default: false
  },
  {
    id: 'fossil',
    label: 'Fossils',
    icon: '🦴',
    description: 'Revived from fossils',
    default: true
  },
  {
    id: 'event',
    label: 'Events',
    icon: '🎫',
    description: 'Limited-time distributions (may be expired)',
    default: false
  },
  {
    id: 'dream-radar',
    label: 'Dream Radar',
    icon: '📡',
    description: 'Requires Pokémon Dream Radar app',
    default: false
  },
  {
    id: 'pokewalker',
    label: 'Pokéwalker',
    icon: '🚶',
    description: 'Requires Pokéwalker device (HG/SS)',
    default: false
  },
  {
    id: 'special',
    label: 'Special Methods',
    icon: '✨',
    description: 'Unique acquisition (varies by game)',
    default: true
  }
];

const AcquisitionFilters = React.memo(function AcquisitionFilters({ 
  enabledMethods, 
  onToggle, 
  isOpen, 
  onClose 
}) {
  if (!isOpen) return null;

  const handleToggleAll = (enable) => {
    const newState = {};
    ACQUISITION_METHODS.forEach(method => {
      newState[method.id] = enable;
    });
    onToggle(newState);
  };

  const handleToggleRealistic = () => {
    const newState = {};
    ACQUISITION_METHODS.forEach(method => {
      // Enable everything except events, trade evolutions, and special hardware
      newState[method.id] = !['event', 'trade-evolution', 'dream-radar', 'pokewalker'].includes(method.id);
    });
    onToggle(newState);
  };

  return (
    <div className="acquisition-modal-overlay" onClick={onClose}>
      <div className="acquisition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acquisition-header">
          <h2>🎯 Acquisition Method Filters</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="acquisition-description">
          <p>Filter Pokémon by how they can be obtained. Disable methods that aren't available or realistic for you.</p>
        </div>

        <div className="acquisition-presets">
          <button onClick={() => handleToggleAll(true)} className="preset-button">
            ✓ Enable All
          </button>
          <button onClick={handleToggleRealistic} className="preset-button realistic">
            ⭐ Realistic Solo
          </button>
          <button onClick={() => handleToggleAll(false)} className="preset-button">
            ✗ Disable All
          </button>
        </div>

        <div className="acquisition-filters">
          {ACQUISITION_METHODS.map(method => (
            <div 
              key={method.id}
              className={`acquisition-filter-item ${enabledMethods[method.id] ? 'enabled' : 'disabled'}`}
              onClick={() => onToggle({ ...enabledMethods, [method.id]: !enabledMethods[method.id] })}
            >
              <div className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={enabledMethods[method.id] || false}
                  onChange={() => {}}
                />
              </div>
              <div className="filter-icon">{method.icon}</div>
              <div className="filter-content">
                <div className="filter-label">{method.label}</div>
                <div className="filter-description">{method.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="acquisition-footer">
          <div className="filter-summary">
            {Object.values(enabledMethods).filter(Boolean).length} / {ACQUISITION_METHODS.length} methods enabled
          </div>
          <button className="done-button" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
});

export { ACQUISITION_METHODS };
export default AcquisitionFilters;

