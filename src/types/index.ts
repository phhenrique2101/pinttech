export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'BREWER' | 'LOGISTICS' | 'SALES' | 'FINANCE';

export type KegStatus =
  | 'VAZIO_SUJO'
  | 'HIGIENIZADO'
  | 'ENVASADO'
  | 'EM_ESTOQUE'
  | 'EM_TRANSITO'
  | 'NO_CLIENTE'
  | 'MANUTENCAO'
  | 'INATIVO';

export type EquipmentType =
  | 'CHOPEIRA_ELETRICA'
  | 'CHOPEIRA_GELO'
  | 'CILINDRO_CO2'
  | 'EXTRATORA'
  | 'MANOMETRO'
  | 'PINGADEIRA'
  | 'OUTRO';

export type EquipmentStatus =
  | 'DISPONIVEL'
  | 'EM_USO_CLIENTE'
  | 'EM_TRANSITO'
  | 'MANUTENCAO'
  | 'INATIVO';

export type BatchStatus =
  | 'PLANEJADO'
  | 'BRASSAGEM'
  | 'FERMENTANDO'
  | 'MATURANDO'
  | 'PRONTO_ENVASE'
  | 'ENVASADO'
  | 'FINALIZADO';

export type OrderStatus =
  | 'ORCAMENTO'
  | 'CONFIRMADO'
  | 'EM_SEPARACAO'
  | 'EM_ROTA'
  | 'ENTREGUE'
  | 'CANCELADO'
  | 'CONCLUIDO';
