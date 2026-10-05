import { useEffect, useRef } from "react";

interface GateHardwareScannerListenerProps {
  onBarcodeScanned: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Global Hardware Barcode / RFID Scanner Listener
 * Hardware barcode scanners emit keystrokes in rapid succession (< 50ms per key) followed by Enter.
 * This listener catches scanner inputs anywhere in the window without requiring mouse clicks.
 */
export default function GateHardwareScannerListener({
  onBarcodeScanned,
  enabled = true
}: GateHardwareScannerListenerProps) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing inside an input or textarea, let that take precedence
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key marks end of scan
      if (e.key === "Enter") {
        if (bufferRef.current.trim().length >= 3) {
          e.preventDefault();
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = "";
          onBarcodeScanned(scannedCode);
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // If delay between keys is too long (> 200ms), it's manual human typing, reset buffer
      if (timeDiff > 250) {
        bufferRef.current = "";
      }

      // Append printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, onBarcodeScanned]);

  return null;
}
