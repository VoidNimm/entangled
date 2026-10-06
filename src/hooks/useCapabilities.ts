import { useEffect, useState } from 'react';

// Type declarations for Navigator Network Information API & Device Memory
declare global {
  interface Navigator {
    connection?: {
      saveData?: boolean;
      effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
      addEventListener?: (type: string, listener: EventListener) => void;
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
    deviceMemory?: number;
  }
}

export interface Capabilities {
  reducedMotion: boolean;
  saveData: boolean;
  slowNetwork: boolean;
  coarsePointer: boolean;
  mobileViewport: boolean;
  lowMemory: boolean;
  mode: 'scrub' | 'static';
}

function getCapabilities(): Capabilities {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      saveData: false,
      slowNetwork: false,
      coarsePointer: false,
      mobileViewport: false,
      lowMemory: false,
      mode: 'scrub',
    };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const mobileViewport = window.matchMedia('(max-width: 768px)').matches;
  
  const connection = navigator.connection;
  const saveData = connection?.saveData ?? false;
  const slowNetwork = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  
  // undefined means unknown; we only flag as lowMemory if it's explicitly <= 2
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2;

  const mode = (reducedMotion || saveData || slowNetwork) ? 'static' : 'scrub';

  return {
    reducedMotion,
    saveData,
    slowNetwork,
    coarsePointer,
    mobileViewport,
    lowMemory,
    mode,
  };
}

export function useCapabilities(): Capabilities {
  const [capabilities, setCapabilities] = useState<Capabilities>(getCapabilities);

  useEffect(() => {
    let mounted = true;

    const handleUpdate = () => {
      if (mounted) {
        setCapabilities(getCapabilities());
      }
    };

    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cpQuery = window.matchMedia('(pointer: coarse)');
    const mvQuery = window.matchMedia('(max-width: 768px)');
    
    rmQuery.addEventListener('change', handleUpdate);
    cpQuery.addEventListener('change', handleUpdate);
    mvQuery.addEventListener('change', handleUpdate);
    
    const connection = navigator.connection;
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', handleUpdate);
    }

    return () => {
      mounted = false;
      rmQuery.removeEventListener('change', handleUpdate);
      cpQuery.removeEventListener('change', handleUpdate);
      mvQuery.removeEventListener('change', handleUpdate);
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', handleUpdate);
      }
    };
  }, []);

  return capabilities;
}
