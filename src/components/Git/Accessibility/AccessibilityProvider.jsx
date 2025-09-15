import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { message } from 'antd';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [shortcuts, setShortcuts] = useState(new Map());
  const [announcements, setAnnouncements] = useState([]);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);

  // Check for system preferences
  useEffect(() => {
    if (window.matchMedia) {
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      setHighContrast(highContrastQuery.matches);
      setReducedMotion(reducedMotionQuery.matches);
      
      const handleHighContrastChange = (e) => setHighContrast(e.matches);
      const handleReducedMotionChange = (e) => setReducedMotion(e.matches);
      
      highContrastQuery.addEventListener('change', handleHighContrastChange);
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
      
      return () => {
        highContrastQuery.removeEventListener('change', handleHighContrastChange);
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      };
    }
  }, []);

  // Register keyboard shortcuts
  const registerShortcut = useCallback((keys, callback, description) => {
    const keyString = keys.join('+').toLowerCase();
    setShortcuts(prev => new Map(prev.set(keyString, { callback, description, keys })));
  }, []);

  // Unregister keyboard shortcuts
  const unregisterShortcut = useCallback((keys) => {
    const keyString = keys.join('+').toLowerCase();
    setShortcuts(prev => {
      const newMap = new Map(prev);
      newMap.delete(keyString);
      return newMap;
    });
  }, []);

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    if (screenReaderMode) {
      setAnnouncements(prev => [...prev, { message, priority, timestamp: Date.now() }]);
    }
  }, [screenReaderMode]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event) => {
      const pressedKeys = [];
      
      if (event.ctrlKey) pressedKeys.push('ctrl');
      if (event.shiftKey) pressedKeys.push('shift');
      if (event.altKey) pressedKeys.push('alt');
      if (event.metaKey) pressedKeys.push('meta');
      
      const key = event.key.toLowerCase();
      if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
        pressedKeys.push(key);
      }
      
      const keyString = pressedKeys.join('+');
      const shortcut = shortcuts.get(keyString);
      
      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.callback(event);
        
        // Announce the action for screen readers
        announce(`Executed: ${shortcut.description}`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, announce]);

  // Screen reader announcements
  useEffect(() => {
    if (announcements.length > 0) {
      const latestAnnouncement = announcements[announcements.length - 1];
      
      // Create a live region for screen reader announcements
      let liveRegion = document.getElementById('accessibility-live-region');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'accessibility-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
      }
      
      liveRegion.textContent = latestAnnouncement.message;
      
      // Clean up old announcements
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.timestamp !== latestAnnouncement.timestamp));
      }, 1000);
    }
  }, [announcements]);

  // Focus management
  const focusElement = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      announce(`Focused: ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
    }
  }, [announce]);

  const trapFocus = useCallback((container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  // ARIA helpers
  const setAriaExpanded = useCallback((element, expanded) => {
    if (element) {
      element.setAttribute('aria-expanded', expanded.toString());
    }
  }, []);

  const setAriaSelected = useCallback((element, selected) => {
    if (element) {
      element.setAttribute('aria-selected', selected.toString());
    }
  }, []);

  const setAriaLabel = useCallback((element, label) => {
    if (element) {
      element.setAttribute('aria-label', label);
    }
  }, []);

  // Color contrast helpers
  const getContrastRatio = useCallback((color1, color2) => {
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(c => {
        c = parseInt(c) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  const isAccessibleContrast = useCallback((color1, color2, level = 'AA') => {
    const ratio = getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  }, [getContrastRatio]);

  // Motion preferences
  const shouldReduceMotion = useCallback(() => {
    return reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [reducedMotion]);

  // High contrast mode
  const shouldUseHighContrast = useCallback(() => {
    return highContrast || window.matchMedia('(prefers-contrast: high)').matches;
  }, [highContrast]);

  // Voice navigation
  const speak = useCallback((text, rate = 1, pitch = 1) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);

  const contextValue = {
    // State
    highContrast,
    reducedMotion,
    screenReaderMode,
    
    // Actions
    setHighContrast,
    setReducedMotion,
    setScreenReaderMode,
    
    // Shortcuts
    registerShortcut,
    unregisterShortcut,
    
    // Announcements
    announce,
    
    // Focus management
    focusElement,
    trapFocus,
    
    // ARIA helpers
    setAriaExpanded,
    setAriaSelected,
    setAriaLabel,
    
    // Color contrast
    getContrastRatio,
    isAccessibleContrast,
    
    // Motion preferences
    shouldReduceMotion,
    shouldUseHighContrast,
    
    // Voice navigation
    speak,
    stopSpeaking
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;
