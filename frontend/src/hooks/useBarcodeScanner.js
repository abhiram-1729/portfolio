import { useEffect, useRef } from 'react';

/**
 * Hook to listen for USB/Bluetooth hardware barcode scanner input.
 * Hardware scanners usually act like keyboards that type very fast and press Enter.
 */
export function useBarcodeScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore input if user is actively typing in an input, textarea, or select field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      
      // If time between keystrokes is too long (>50ms), it's human typing, clear buffer
      if (timeDiff > 50) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          // Trigger scan with the buffered barcode
          onScan(bufferRef.current);
          e.preventDefault();
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) { // Only capture single characters
        bufferRef.current += e.key;
      }

      lastKeyTimeRef.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}
