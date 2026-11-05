'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { DEFAULT_TASK_PRESETS, TaskShortcut } from '@/types/shortcuts';

interface TaskShortcutManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShortcuts: TaskShortcut[];
  onSaveSuccess: (updatedShortcuts: TaskShortcut[]) => void;
}

const COMMON_EMOJIS = ['🌿', '🪣', '❄️', '🧪', '💨', '🧼', '🍺', '🌾', '🏷️', '📦', '🔥', '⏱️', '⚙️', '📋'];

export default function TaskShortcutManagerModal({
  isOpen,
  onClose,
  currentShortcuts,
  onSaveSuccess,
}: TaskShortcutManagerModalProps) {
  const [shortcuts, setShortcuts] = useState<TaskShortcut[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for creating / editing
  const [formLabel, setFormLabel] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('DRY_HOPPING');
  const [formTargetType, setFormTargetType] = useState<'TANK' | 'FABRICA'>('TANK');
  const [formAmount, setFormAmount] = useState('');
  const [formUnit, setFormUnit] = useState('KG');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShortcuts(currentShortcuts && currentShortcuts.length > 0 ? [...currentShortcuts] : [...DEFAULT_TASK_PRESETS]);
      setIsFormOpen(false);
      setEditingId(null);
      setErrorMsg(null);
    }
  }, [isOpen, currentShortcuts]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormLabel('✨ Novo Atalho');
    setFormTitle('');
    setFormType('OTHER');
    setFormTargetType('TANK');
    setFormAmount('');
    setFormUnit('KG');
    setIsFormOpen(true);
    setErrorMsg(null);
  };

  const handleOpenEditForm = (item: TaskShortcut) => {
    setEditingId(item.id);
    setFormLabel(item.label);
    setFormTitle(item.defaultTitle);
    setFormType(item.type || 'OTHER');
    setFormTargetType(item.targetType || 'TANK');
    setFormAmount(item.defaultAmount !== undefined ? String(item.defaultAmount) : '');
    setFormUnit(item.unit || 'KG');
    setIsFormOpen(true);
    setErrorMsg(null);
  };

  const handleSelectEmoji = (emoji: string) => {
    // If the label starts with an emoji, replace it; otherwise prepend it
    const trimmed = formLabel.trim();
    const firstChar = Array.from(trimmed)[0] || '';
    if (COMMON_EMOJIS.includes(firstChar)) {
      const remaining = trimmed.slice(firstChar.length).trim();
      setFormLabel(`${emoji} ${remaining}`);
    } else {
      setFormLabel(`${emoji} ${trimmed}`);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setErrorMsg('O botão/rótulo do atalho é obrigatório.');
      return;
    }
    if (!formTitle.trim()) {
      setErrorMsg('O título padrão da tarefa é obrigatório.');
      return;
    }

    const shortcutItem: TaskShortcut = {
      id: editingId || `shortcut-${Date.now()}`,
      label: formLabel.trim(),
      defaultTitle: formTitle.trim(),
      type: formType,
      targetType: formTargetType,
      unit: formUnit.trim() || undefined,
      defaultAmount: formAmount && !isNaN(parseFloat(formAmount)) ? parseFloat(formAmount) : undefined,
    };

    if (editingId) {
      setShortcuts((prev) => prev.map((s) => (s.id === editingId ? shortcutItem : s)));
    } else {
      setShortcuts((prev) => [...prev, shortcutItem]);
    }

    setIsFormOpen(false);
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleDeleteShortcut = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      setIsFormOpen(false);
      setEditingId(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setShortcuts((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === shortcuts.length - 1) return;
    setShortcuts((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Deseja realmente restaurar os atalhos para o padrão do PintTech?')) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/brewery/shortcuts', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setShortcuts(data.shortcuts || DEFAULT_TASK_PRESETS);
        onSaveSuccess(data.shortcuts || DEFAULT_TASK_PRESETS);
        onClose();
      } else {
        setErrorMsg('Erro ao restaurar padrões.');
      }
    } catch {
      setErrorMsg('Erro de conexão com o servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (shortcuts.length === 0) {
      setErrorMsg('A cervejaria deve ter pelo menos 1 atalho configurado.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/brewery/shortcuts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcuts }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao salvar atalhos.');
      }

      const data = await res.json();
      onSaveSuccess(data.shortcuts || shortcuts);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar atalhos da cervejaria.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* CABEÇALHO */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Personalizar Atalhos da Fábrica
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Crie e organize atalhos rápidos salvos exclusivamente para sua cervejaria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO SCROLLÁVEL */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULÁRIO DE ADIÇÃO/EDIÇÃO */}
          {isFormOpen ? (
            <form onSubmit={handleSaveForm} className="bg-slate-800/90 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {editingId ? 'Editar Atalho' : 'Novo Atalho'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* SELETOR DE EMOJIS */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                  Ícone / Emoji Rápido:
                </label>
                <div className="flex flex-wrap gap-1">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectEmoji(emoji)}
                      className="px-2 py-1 text-base bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 rounded-lg active:scale-95 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* RÓTULO DO BOTÃO */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Nome do Atalho (Botão): *
                  </label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="Ex: 🌿 Dry Hopping"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  />
                </div>

                {/* TÍTULO PADRÃO DA TAREFA */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Título Padrão da Tarefa: *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Dry Hopping Citra + Mosaic"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* DESTINO DA TAREFA */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Destino da Tarefa:
                  </label>
                  <select
                    value={formTargetType}
                    onChange={(e) => setFormTargetType(e.target.value as 'TANK' | 'FABRICA')}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="TANK">🛢️ Tanque / Lote em Andamento</option>
                    <option value="FABRICA">🏭 Fábrica / Rotina Geral</option>
                  </select>
                </div>

                {/* TIPO / CATEGORIA */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Categoria da Ação:
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="DRY_HOPPING">🌿 Dry Hopping</option>
                    <option value="PURGE">🪣 Purga de Levedura</option>
                    <option value="COLD_CRASH">❄️ Cold Crash (0°C)</option>
                    <option value="MEASUREMENT">🧪 Medição Densidade & pH</option>
                    <option value="OTHER">💨 Processo Geral / Tanque</option>
                    <option value="CIP">🧼 Higienização CIP / Linhas</option>
                  </select>
                </div>
              </div>

              {/* QUANTIDADE E UNIDADE SUGERIDAS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Quantidade Sugerida:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Ex: 2.0"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                    Unidade:
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="KG">KG (Quilos)</option>
                    <option value="G">G (Gramas)</option>
                    <option value="L">L (Litros)</option>
                    <option value="ML">ML (Mililitros)</option>
                    <option value="UN">UN (Unidades)</option>
                    <option value="BAR">BAR (Pressão)</option>
                    <option value="°C">°C (Temperatura)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  {editingId ? 'Salvar Edição' : 'Adicionar Atalho'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-400/60 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all group"
            >
              <Plus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Adicionar Novo Atalho Personalizado</span>
            </button>
          )}

          {/* LISTA DE ATALHOS */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase text-slate-400 block px-1">
              Atalhos Atuais da Cervejaria ({shortcuts.length}):
            </span>

            {shortcuts.length === 0 ? (
              <div className="text-center py-6 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                Nenhum atalho configurado. Clique em &quot;Adicionar Novo Atalho&quot; acima.
              </div>
            ) : (
              shortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-slate-600 transition-all gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* BOTÕES DE REORDENAÇÃO */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className={`p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-700 ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === shortcuts.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className={`p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-700 ${
                          index === shortcuts.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-amber-300">{shortcut.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                          {shortcut.targetType === 'FABRICA' ? '🏭 Fábrica' : '🛢️ Tanque'}
                        </span>
                        {shortcut.defaultAmount && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            {shortcut.defaultAmount} {shortcut.unit || ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        Título gerado: &ldquo;{shortcut.defaultTitle}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(shortcut)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-700 transition-all"
                      title="Editar atalho"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShortcut(shortcut.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all"
                      title="Excluir atalho"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all border border-slate-700 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Padrões</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg border border-amber-300 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Atalhos</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
