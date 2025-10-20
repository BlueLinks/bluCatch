import { useState } from 'react';
import '../styles/CollapsibleSection.css';

const CollapsibleSection = ({ title, defaultOpen = true, children, badge = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="collapsible-title">
          <span className="collapsible-icon">{isOpen ? '▼' : '▶'}</span>
          <h2>{title}</h2>
          {badge && <span className="collapsible-badge">{badge}</span>}
        </div>
      </button>
      <div className={`collapsible-content ${isOpen ? 'expanded' : 'collapsed'}`}>
        <div className="collapsible-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;

