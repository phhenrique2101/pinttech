'use client';

import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Copy, Check, ExternalLink, RefreshCw, AlertCircle, Unlink, Shield } from 'lucide-react';

export default function TelegramConnectCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botConfigured, setBotConfigured] = useState(false);

  // Link generation
  const [generating, setGenerating] = useState(false);
  const [linkData, setLinkData] = useState<{ token: string; link: string; botUsername?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Admin webhook setup
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/telegram/link');
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setUsername(data.username);
        setBotUsername(data.botUsername);
        setBotConfigured(data.botConfigured);
      }
    } catch (e) {
      console.error('Erro ao verificar status do Telegram:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerateLink = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/telegram/link', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLinkData(data);
      }
    } catch (e) {
      console.error('Erro ao gerar código:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar sua conta do Telegram? Você deixará de receber alertas e comandos pelo bot.')) {
      return;
    }

    try {
      setLoading(true);
      await fetch('/api/telegram/link', { method: 'DELETE' });
      setConnected(false);
      setUsername(null);
      setLinkData(null);
    } catch (e) {
      console.error('Erro ao desconectar:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (linkData?.token) {
      navigator.clipboard.writeText(linkData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSetupWebhook = async () => {
    try {
      setSettingWebhook(true);
      const res = await fetch('/api/telegram/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWebhookStatus('Webhook registrado e ativo com o Telegram!');
      } else {
        setWebhookStatus(`Erro: ${data.telegramResponse?.description || 'Falha ao registrar'}`);
      }
    } catch (err: any) {
      setWebhookStatus(`Erro: ${err.message}`);
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-xs text-slate-400 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
        <span>Carregando integração com Telegram...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white via-sky-50/20 to-indigo-50/30 rounded-2xl border border-sky-200/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                PintTech Bot no Telegram (Custo Zero)
              </h3>
              {connected ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Conectado
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                  Não conectado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lance densidades, consulte status da adega, execute tarefas e registre envases direto do seu celular.
            </p>
          </div>
        </div>

        {connected ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Desconectar Telegram</span>
          </button>
        ) : (
          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition self-start sm:self-auto disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{generating ? 'Gerando Código...' : 'Conectar meu Telegram'}</span>
          </button>
        )}
      </div>

      {connected && (
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Sua conta está conectada ao Telegram{' '}
              {username ? <b>(@{username})</b> : ''}.
            </span>
          </div>
          <a
            href={botUsername ? `https://t.me/${botUsername}` : 'https://t.me'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:underline"
          >
            <span>Abrir Conversa com o Bot</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* PAINEL DE CONEXÃO (QUANDO GERADO O CÓDIGO) */}
      {!connected && linkData && (
        <div className="p-4 bg-white border-2 border-sky-300 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-600" />
              Código de Ativação Único:
            </span>
            <span className="text-[10px] text-slate-400">Válido para esta ativação</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 px-4 py-2 rounded-xl">
              <code className="text-base font-black font-mono text-sky-700 tracking-wider">
                {linkData.token}
              </code>
              <button
                onClick={handleCopyCode}
                className="p-1 text-slate-500 hover:text-slate-800 transition"
                title="Copiar código"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <a
              href={linkData.link}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition w-full sm:w-auto justify-center"
            >
              <span>Abrir no Telegram e Conectar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Ao clicar no botão acima, seu Telegram abrirá automaticamente com o comando de ativação pronto. Se preferir, você também pode abrir a conversa com <b>@{linkData.botUsername || 'PintTechBot'}</b> e apenas digitar o código <code>{linkData.token}</code>.
          </p>
        </div>
      )}

      {/* DICA DE RECURSOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
          <strong className="text-slate-800 block mb-0.5">🧪 Medições no Tanque</strong>
          <span className="text-slate-500">Envie <code>tq 1 1016 18</code> e a densidade/ABV é calculada e salva no lote.</span>
        </div>
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
          <strong className="text-slate-800 block mb-0.5">📋 Tarefas da Adega</strong>
          <span className="text-slate-500">Receba a lista de purgas e dry hoppings e marque como concluída com 1 toque.</span>
        </div>
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
          <strong className="text-slate-800 block mb-0.5">🛢️ Envase de Barris</strong>
          <span className="text-slate-500">Cadastre barris envasados pelo código e dê baixa no tanque na mesma hora.</span>
        </div>
      </div>

      {/* CONFIGURAÇÃO DO WEBHOOK (ADMINISTRADOR) */}
      {!botConfigured && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <b>Atenção:</b> A variável de ambiente <code>TELEGRAM_BOT_TOKEN</code> ainda não foi adicionada. Crie seu bot no <b>@BotFather</b> no Telegram e adicione o token para ativar o serviço.
          </span>
        </div>
      )}

      {botConfigured && (
        <div className="pt-2 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Bot Configurado: <b>@{botUsername || 'Online'}</b></span>
            {webhookStatus && <span className="text-emerald-700 font-bold ml-2">({webhookStatus})</span>}
          </div>

          <button
            onClick={handleSetupWebhook}
            disabled={settingWebhook}
            className="text-[11px] font-bold text-sky-700 hover:text-sky-900 underline flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${settingWebhook ? 'animate-spin' : ''}`} />
            <span>Sincronizar Webhook com o Telegram</span>
          </button>
        </div>
      )}
    </div>
  );
}
