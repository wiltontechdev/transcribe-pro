// ExportModal.tsx - Export marker sections modal
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { AudioExporter, ExportOptions } from '../audio/AudioExporter';
import ProgressIndicator from './ProgressIndicator';
import { showToast } from './Toast';
import { Marker } from '../../types/types';

const KENYAN_GREEN = '#006644';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const audio = useAppStore((state) => state.audio);
  const markers = useAppStore((state) => state.markers);
  const duration = useAppStore((state) => state.audio.duration);

  const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'mp3' | 'wav' | 'ogg' | 'flac'>('mp3');
  const [quality, setQuality] = useState(128);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Select all markers by default when modal opens
  useEffect(() => {
    if (isOpen && markers.length > 0) {
      setSelectedMarkers(new Set(markers.map(m => m.id)));
    }
  }, [isOpen, markers]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMarker = (markerId: string) => {
    const newSelected = new Set(selectedMarkers);
    if (newSelected.has(markerId)) {
      newSelected.delete(markerId);
    } else {
      newSelected.add(markerId);
    }
    setSelectedMarkers(newSelected);
  };

  const selectAll = () => {
    setSelectedMarkers(new Set(markers.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedMarkers(new Set());
  };

  const handleExport = async () => {
    if (!audio.file) {
      showToast('No audio file loaded', 'error');
      return;
    }

    if (selectedMarkers.size === 0) {
      showToast('Please select at least one marker to export', 'error');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const markersToExport = markers.filter(m => selectedMarkers.has(m.id));
      let totalProgress = 0;
      const progressPerMarker = 100 / markersToExport.length;

      for (let i = 0; i < markersToExport.length; i++) {
        const marker = markersToExport[i];
        
        // Apply marker settings (speed, loop) if needed
        // Note: Speed and loop are playback settings, not export settings
        // We'll export the raw audio region, but include settings in filename
        
        const options: ExportOptions = {
          startTime: marker.start,
          endTime: marker.end,
          format,
          quality,
          speed: marker.speed || 1.0, // Apply marker's speed setting
          onProgress: (progress) => {
            // Calculate overall progress
            totalProgress = (i * progressPerMarker) + (progress * progressPerMarker / 100);
            setExportProgress(Math.min(100, totalProgress));
          },
        };

        const blob = await AudioExporter.exportRegion(audio.file!, options);

        // Download the file with marker name and settings in filename
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create filename with marker name, time range, and settings
        const settings = [];
        if (marker.speed && marker.speed !== 1.0) {
          settings.push(`${marker.speed.toFixed(1)}x`);
        }
        if (marker.loop) {
          settings.push('loop');
        }
        const settingsStr = settings.length > 0 ? `_${settings.join('_')}` : '';
        const safeName = marker.name.replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `${safeName}_${formatTime(marker.start)}_${formatTime(marker.end)}${settingsStr}.${format}`;
        
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Use setTimeout to ensure click completes before removal
        setTimeout(() => {
          if (a.parentNode) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(url);
        }, 100);

        // Small delay between exports
        if (i < markersToExport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      showToast(`Exported ${markersToExport.length} marker${markersToExport.length > 1 ? 's' : ''} successfully!`, 'success');
      onClose();
    } catch (error) {
      showToast(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.98)'
    : 'rgba(26, 26, 26, 0.98)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';

  if (markers.length === 0) {
    return null;
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bgColor,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          borderRadius: '20px',
          padding: '2rem',
          minWidth: '600px',
          maxWidth: '800px',
          width: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          color: textColor,
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          fontFamily: HANDWRITTEN_FONT,
        }}>
          Export Marker Sections
        </h2>

        {/* Marker selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: textColor, fontSize: '0.9rem', fontWeight: '500' }}>
              Select Markers to Export ({selectedMarkers.size} of {markers.length})
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '0.5rem',
          }}>
            {markers.map((marker) => {
              const isSelected = selectedMarkers.has(marker.id);
              return (
                <div
                  key={marker.id}
                  onClick={() => toggleMarker(marker.id)}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    background: isSelected 
                      ? (isLightMode ? 'rgba(0, 102, 68, 0.1)' : 'rgba(0, 102, 68, 0.2)')
                      : 'transparent',
                    border: `1px solid ${isSelected ? KENYAN_GREEN : borderColor}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMarker(marker.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: KENYAN_GREEN,
                      }}
                    />
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '4px', 
                      background: marker.color || KENYAN_GREEN,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: textColor, 
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        marginBottom: '0.25rem',
                      }}>
                        {marker.name}
                      </div>
                      <div style={{ 
                        color: textColor, 
                        opacity: 0.7, 
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                      }}>
                        {formatTime(marker.start)} - {formatTime(marker.end)}
                        {marker.speed && marker.speed !== 1.0 && (
                          <span style={{ marginLeft: '0.5rem' }}>• {marker.speed.toFixed(1)}x</span>
                        )}
                        {marker.loop && (
                          <span style={{ marginLeft: '0.5rem' }}>• Loop</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Format selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: textColor, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'mp3' | 'wav' | 'ogg' | 'flac')}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '0.9rem',
            }}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="ogg">OGG</option>
            <option value="flac">FLAC</option>
          </select>
        </div>

        {/* Quality (for MP3) */}
        {format === 'mp3' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: textColor, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Quality: {quality} kbps
            </label>
            <input
              type="range"
              min="64"
              max="320"
              step="32"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
              color: textColor,
              fontSize: '0.9rem',
              fontFamily: HANDWRITTEN_FONT,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !audio.file || selectedMarkers.size === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedMarkers.size > 0 ? KENYAN_GREEN : 'rgba(0, 102, 68, 0.3)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontFamily: HANDWRITTEN_FONT,
              cursor: isExporting || !audio.file || selectedMarkers.size === 0 ? 'not-allowed' : 'pointer',
              opacity: isExporting || !audio.file || selectedMarkers.size === 0 ? 0.5 : 1,
            }}
          >
            Export {selectedMarkers.size > 0 ? `(${selectedMarkers.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  if (!isOpen && !isExporting) {
    return null;
  }

  return (
    <>
      {isOpen && createPortal(modalContent, document.body)}
      {isExporting && (
        <ProgressIndicator
          isVisible={isExporting}
          progress={exportProgress}
          message="Exporting marker sections..."
        />
      )}
    </>
  );
};

export default ExportModal;
