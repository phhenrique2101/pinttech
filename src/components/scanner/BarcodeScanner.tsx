'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isProcessing?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
  title?: string;
}

export default function BarcodeScanner({
  onScan,
  isProcessing = false,
  collapsible = true,
  defaultCollapsed = false,
  storageKey = 'pinttech_scanner_camera_collapsed',
  title = 'Câmera do Scanner',
}: BarcodeScannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    if (!collapsible || !storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {
      // Ignore in private/restricted browsing
    }
  }, [collapsible, storageKey]);

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
    setScannerInstance(null);
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(() => {});
      }
    };
  }, [scannerInstance]);

  const setCollapsedMode = async (collapsed: boolean) => {
    if (collapsed === isCollapsed) return;
    if (collapsed && isScanning) {
      await stopScanner();
    }
    setIsCollapsed(collapsed);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(collapsed));
      } catch (e) {}
    }
    if (collapsed) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const toggleCollapse = () => {
    setCollapsedMode(!isCollapsed);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScan(manualCode.trim().toUpperCase());
    setManualCode('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center transition-all duration-300">
      {/* Scanner Mode Tabs & Retract Controls Header */}
      <div className="w-full flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        {/* Segmented Tabs: Câmera vs Manual / Laser */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setCollapsedMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isCollapsed
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Câmera</span>
            {isScanning && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setCollapsedMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isCollapsed
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Manual / Laser</span>
          </button>
        </div>

        {/* Action Controls: Sound Toggle & Quick Retract/Expand */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            title={soundEnabled ? 'Desativar Som do Bip' : 'Ativar Som do Bip'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>

          {collapsible && (
            <button
              type="button"
              onClick={toggleCollapse}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isCollapsed
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
              title={isCollapsed ? 'Abrir visor da câmera' : 'Recolher câmera para limpar a tela'}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px]">Abrir Câmera</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-[11px]">Recolher</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Retracted / Collapsed Banner */}
      {isCollapsed && (
        <div className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Câmera recolhida. Tela livre para bipar ou consultar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsedMode(false)}
            className="text-[11px] font-black text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2"
          >
            Ativar Câmera
          </button>
        </div>
      )}

      {/* Expanded Camera Viewport */}
      {!isCollapsed && (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center">
            <div id="qr-reader-viewport" className="w-full h-full" />

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                <Camera className="w-12 h-12 text-slate-500 mb-3 animate-bounce" />
                <p className="text-sm font-black text-slate-100 mb-1">Câmera em Espera</p>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  Toque no botão abaixo para ativar a câmera e apontar para a etiqueta do barril.
                </p>
                <button
                  type="button"
                  onClick={startScanner}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-slate-950" />
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
                <p className="text-[11px] text-amber-300 font-bold mt-3 bg-slate-900/90 px-2 py-0.5 rounded">
                  Alinhe o código de barras ou QR Code
                </p>
              </div>
            )}
          </div>

          {/* Active Camera Action Bar */}
          {isScanning && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Desligar Câmera
              </button>
              <button
                type="button"
                onClick={toggleCollapse}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5"
                title="Recolher câmera"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Recolher
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 text-xs font-bold rounded-xl text-center max-w-sm">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Manual Input / Physical USB/Bluetooth Laser Barcode Scanner Form */}
      <div
        className={`w-full max-w-sm transition-all ${
          isCollapsed ? 'mt-2' : 'mt-4 pt-4 border-t border-slate-100 dark:border-slate-800'
        }`}
      >
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Digitação Rápida / Leitor Laser USB
            </label>
            {isCollapsed && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-black">
                Modo Rápido
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: BAR-50L-001 ou CHOP-EL-01"
              className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 uppercase font-mono shadow-inner transition-colors"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-sm"
            >
              Bipar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
