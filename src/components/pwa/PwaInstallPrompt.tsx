'use client';

import { useEffect } from 'react';

/**
 * PwaInstallPrompt:
 * Registra silenciosamente o Service Worker do PWA sem exibir pop-ups,
 * banners ou modais de instalação para o usuário.
 */
export default function PwaInstallPrompt() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('PWA ServiceWorker registrado com sucesso:', reg.scope))
        .catch((err) => console.error('Erro ao registrar ServiceWorker:', err));
    }
  }, []);

  return null;
}
