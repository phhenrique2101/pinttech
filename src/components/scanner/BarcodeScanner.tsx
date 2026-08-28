'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Camera, CameraOff, Sparkles, Volume2, VolumeX, Keyboard, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isProcessing?: boolean;
}

export default function BarcodeScanner({ onScan, isProcessing = false }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play satisfying scanner beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      // Trigger vibration on supported mobile devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60]);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  };

  const startScanner = async () => {
    setErrorMessage(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      setScannerInstance(html5QrCode);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.333334,
        },
        (decodedText) => {
          playBeep();
          onScan(decodedText.trim());
        },
        (errorMessage) => {
          // Frame error (silently ignored during live stream)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera scanner error:', err);
      setErrorMessage(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador ou utilize o leitor manual abaixo.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerInstance && scannerInstance.isScanning) {
      try {
        await scannerInstance.stop();
        await scannerInstance.clear();
      } catch (err) {
        console.error('Error stopping scanner', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(() => {});
      }
    };
  }, [scannerInstance]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScan(manualCode.trim().toUpperCase());
    setManualCode('');
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 flex flex-col items-center">
      {/* Scanner Controls Header */}
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Leitor de Código de Barras / QR Code
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Desativar Som' : 'Ativar Som'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Viewport for Camera Scanning */}
      <div className="relative w-full max-w-sm aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex flex-col items-center justify-center">
        <div id="qr-reader-viewport" className="w-full h-full" />

        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
            <Camera className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
            <p className="text-sm font-semibold text-slate-300 mb-1">Câmera em Espera</p>
            <p className="text-xs text-slate-500 mb-4 max-w-xs">
              Toque no botão abaixo para ativar a câmera e apontar para a etiqueta do barril.
            </p>
            <button
              onClick={startScanner}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Ativar Câmera Scanner
            </button>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder Target frame */}
            <div className="w-56 h-36 border-2 border-amber-400/80 rounded-lg relative shadow-2xl">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              
              {/* Animated Laser Line */}
              <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] scanner-laser" />
            </div>
            <p className="text-[11px] text-amber-300 font-medium mt-3 bg-slate-900/80 px-2 py-0.5 rounded">
              Alinhe o código de barras ou QR Code
            </p>
          </div>
        )}
      </div>

      {isScanning && (
        <div className="mt-3">
          <button
            onClick={stopScanner}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <CameraOff className="w-3.5 h-3.5" />
            Desligar Câmera
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl text-center max-w-sm">
          {errorMessage}
        </div>
      )}

      {/* Manual Input / Physical USB/Bluetooth Laser Barcode Scanner Support */}
      <div className="w-full max-w-sm mt-5 pt-4 border-t border-slate-800">
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" />
            Digitação Rápida / Leitor Laser USB
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: BAR-50L-001 ou CHOP-EL-01"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              Bipar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
