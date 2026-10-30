'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import MapaTraceabilitySheetModal from '@/components/brew/MapaTraceabilitySheetModal';
import { Loader2 } from 'lucide-react';

export default function MapaStandalonePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [batch, setBatch] = useState<any>(null);
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/batches/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/brewery').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([batchData, breweryData]) => {
        if (!batchData || batchData.error) {
          setError('Lote não encontrado ou acesso não autorizado');
        } else {
          setBatch(batchData);
          setBrewery(breweryData);
        }
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar dados do lote');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-600 bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-800">
          Carregando Dossiê Oficial de Rastreabilidade MAPA...
        </p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <h2 className="text-lg font-bold text-rose-600 mb-2">Erro ao carregar documento</h2>
        <p className="text-sm text-slate-600 mb-4">{error || 'Lote não encontrado.'}</p>
        <button
          onClick={() => router.push('/producao')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-800 transition"
        >
          Voltar para Produção
        </button>
      </div>
    );
  }

  return (
    <MapaTraceabilitySheetModal
      batch={batch}
      brewery={brewery}
      onBreweryUpdated={(updated) => setBrewery(updated)}
      onClose={() => router.push('/producao')}
      isStandalone={true}
      autoPrint={shouldAutoPrint}
    />
  );
}
