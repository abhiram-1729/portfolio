import React, { useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import toast from 'react-hot-toast';

const BarcodeScannerOverlay = ({ onScan, onClose }) => {
  const [status, setStatus] = useState('Initializing ZXing Scanner...');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        setStatus('Requesting camera permission...');
        // First get permission to ensure we can list devices
        const testStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        testStream.getTracks().forEach(t => t.stop());

        if (!mounted) return;
        setStatus('Starting high-speed scanner...');

        // Configure ZXing to try harder for blurred images and support all standard formats
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.RSS_14,
          BarcodeFormat.RSS_EXPANDED,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE
        ]);

        const codeReader = new BrowserMultiFormatReader(hints);
        
        // Get available video devices
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
          // Try to find the back camera
          const backCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
          selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        }

        if (!selectedDeviceId) {
          setErrorMsg('No camera devices found.');
          return;
        }

        if (videoRef.current) {
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, error) => {
              if (result && mounted) {
                toast.success('Barcode scanned!');
                onScan(result.getText());
                if (controlsRef.current) {
                  controlsRef.current.stop();
                }
                onClose();
              }
            }
          );
          if (mounted) setStatus('Scanning... Point at a barcode');
        }

      } catch (err) {
        console.error('ZXing Scanner Error:', err);
        if (mounted) {
          setStatus('Scanner error');
          setErrorMsg('Failed to start scanner. ' + (err.message || 'Please ensure camera permissions are granted.'));
          toast.error('Failed to start high-speed scanner.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">Barcode Scanner</h3>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${errorMsg ? 'text-rose-500' : 'text-indigo-600'}`}>
                {status}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-rose-50 rounded-2xl text-gray-400 hover:text-rose-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Camera viewfinder */}
        <div className="p-6">
          <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden border-4 border-gray-50 flex items-center justify-center shadow-inner" style={{ minHeight: '280px' }}>
            <video ref={videoRef} className="w-full h-full object-cover rounded-[1.5rem]" style={{ maxHeight: '60vh' }} />
            {/* Scan overlay corners */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[70%] h-[50%] border-2 border-indigo-500/50 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-0.5 -ml-0.5 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-0.5 -mr-0.5 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-0.5 -ml-0.5 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-0.5 -mr-0.5 rounded-br-lg"></div>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-500/60 animate-bounce"></div>
              </div>
            </div>
          </div>

          {/* Error message display */}
          {errorMsg && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <p className="text-xs text-rose-700 font-bold">{errorMsg}</p>
            </div>
          )}

          {/* Manual barcode entry fallback */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Or type barcode manually..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              Use
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerOverlay;
