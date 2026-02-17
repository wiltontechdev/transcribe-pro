// CommandPalette.tsx - Command palette (Ctrl+Shift+P) for quick actions
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
  icon?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen || !mounted) return null;

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.98)'
    : 'rgba(26, 26, 26, 0.98)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        zIndex: 1000001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bgColor,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          borderRadius: '16px',
          padding: '0',
          width: '90vw',
          maxWidth: '600px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ padding: '1.5rem', borderBottom: `1px solid ${borderColor}` }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search commands..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '1rem',
              fontFamily: HANDWRITTEN_FONT,
              outline: 'none',
            }}
          />
        </div>

        {/* Commands list */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 80px)' }}>
          {Object.keys(groupedCommands).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: textColor, opacity: 0.7 }}>
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: textColor,
                  opacity: 0.6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {category}
                </div>
                {cmds.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: isSelected 
                          ? (isLightMode ? 'rgba(0, 102, 68, 0.1)' : 'rgba(0, 102, 68, 0.2)')
                          : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {cmd.icon && <span style={{ fontSize: '1.2rem' }}>{cmd.icon}</span>}
                        <span style={{ color: textColor, fontFamily: HANDWRITTEN_FONT }}>
                          {cmd.label}
                        </span>
                      </div>
                      {cmd.shortcut && (
                        <kbd style={{
                          padding: '0.25rem 0.5rem',
                          background: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          color: textColor,
                          opacity: 0.7,
                        }}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CommandPalette;
