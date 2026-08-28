'use client';

import React, { useEffect, useRef } from 'react';
import { X, Printer, Download, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  keg: {
    id: string;
    code: string;
    capacity: number;
    kegType: string;
    currentBeerName?: string | null;
  } | null;
  breweryName?: string;
}

export default function BarcodeModal({ isOpen, onClose, keg, breweryName = 'PintTech Brewery' }: BarcodeModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isOpen && keg) {
      // Generate QR Code
      if (qrCanvasRef.current) {
        QRCode.toCanvas(qrCanvasRef.current, keg.code, {
          width: 140,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      }

      // Generate Code 128 Barcode
      if (barcodeSvgRef.current) {
        try {
          JsBarcode(barcodeSvgRef.current, keg.code, {
            format: 'CODE128',
            lineColor: '#000000',
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 14,
            font: 'monospace',
            margin: 5,
          });
        } catch (e) {
          console.error('Error generating barcode', e);
        }
      }
    }
  }, [isOpen, keg]);

  if (!isOpen || !keg) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Etiqueta de Identificação</h3>
              <p className="text-xs text-slate-500">{keg.code} • {keg.capacity}L</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Card */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-100/50">
          <div
            id="printable-keg-label"
            className="w-full max-w-[340px] bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 shadow-sm flex flex-col items-center text-center print:border-none print:shadow-none print:m-0 print:p-2"
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">
              {breweryName}
            </p>
            <h4 className="text-lg font-black text-slate-900 mt-0.5">{keg.code}</h4>
            <p className="text-xs font-semibold text-slate-600">
              BARRIL {keg.capacity}L • {keg.kegType.replace('_', ' ')}
            </p>

            {/* QR Code */}
            <div className="my-3 p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <canvas ref={qrCanvasRef} className="w-[120px] h-[120px]" />
            </div>

            {/* Barcode */}
            <div className="w-full flex justify-center overflow-hidden">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
            </div>

            <p className="text-[9px] text-slate-400 mt-2 font-mono">
              RASTREABILIDADE PINTTECH • LEITURA VIA SCANNER
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
