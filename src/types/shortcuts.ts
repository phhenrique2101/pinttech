export interface TaskShortcut {
  id: string;
  label: string;
  type: string;
  defaultTitle: string;
  targetType?: 'TANK' | 'FABRICA';
  unit?: string;
  defaultAmount?: number;
  color?: string;
}

export const DEFAULT_TASK_PRESETS: TaskShortcut[] = [
  {
    id: 'preset-dry-hopping',
    label: '🌿 Dry Hopping',
    type: 'DRY_HOPPING',
    defaultTitle: 'Dry Hopping',
    targetType: 'TANK',
    unit: 'KG',
    defaultAmount: 2.0,
  },
  {
    id: 'preset-purge',
    label: '🪣 Purga Levedura',
    type: 'PURGE',
    defaultTitle: 'Purga de Levedura / Sedimento',
    targetType: 'TANK',
    unit: 'L',
  },
  {
    id: 'preset-cold-crash',
    label: '❄️ Cold Crash (0°C)',
    type: 'COLD_CRASH',
    defaultTitle: 'Baixar Temperatura para Cold Crash (0°C)',
    targetType: 'TANK',
  },
  {
    id: 'preset-measurement',
    label: '🧪 Medição Densidade',
    type: 'MEASUREMENT',
    defaultTitle: 'Medição Diária de Densidade & pH',
    targetType: 'TANK',
  },
  {
    id: 'preset-carbonation',
    label: '💨 Carbonatação',
    type: 'OTHER',
    defaultTitle: 'Subir Pressão / Carbonatação no Tanque',
    targetType: 'TANK',
  },
  {
    id: 'preset-cip',
    label: '🧼 Limpeza CIP',
    type: 'OTHER',
    defaultTitle: 'Higienização CIP de Linhas / Válvulas',
    targetType: 'FABRICA',
  },
];
