'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Users,
  Cylinder,
  Wrench,
  Beer,
  Flame,
  Check,
  ChevronRight,
  Clipboard,
  Sparkles,
  HelpCircle,
  Building2,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type EntityType = 'CLIENTS' | 'KEGS' | 'EQUIPMENT' | 'ORDERS' | 'RECIPES' | 'TANKS';

interface EntityDefinition {
  type: EntityType;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  redirectUrl: string;
  redirectLabel: string;
  fields: {
    key: string;
    label: string;
    required?: boolean;
    synonyms: string[];
    example: string;
  }[];
  sampleData: Record<string, any>[];
}

const ENTITY_CONFIGS: Record<EntityType, EntityDefinition> = {
  CLIENTS: {
    type: 'CLIENTS',
    title: 'Clientes & Pontos de Venda',
    description: 'Bares, restaurantes, empórios, distribuidores e clientes de chopp.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    redirectUrl: '/clientes',
    redirectLabel: 'Ver Clientes Cadastrados',
    fields: [
      { key: 'name', label: 'Nome / Razão Social', required: true, synonyms: ['nome', 'razao', 'razão', 'cliente', 'empresa', 'nome da empresa', 'razao social'], example: 'Bar e Restaurante Estrela Azul' },
      { key: 'tradeName', label: 'Nome Fantasia', synonyms: ['fantasia', 'nome fantasia', 'apelido', 'ponto'], example: 'Bar Estrela' },
      { key: 'document', label: 'CNPJ / CPF', synonyms: ['cnpj', 'cpf', 'documento', 'doc', 'inscricao', 'cpf/cnpj'], example: '12.345.678/0001-90' },
      { key: 'phone', label: 'Telefone / WhatsApp', synonyms: ['telefone', 'fone', 'celular', 'cel', 'whatsapp', 'whats', 'contato'], example: '(11) 98765-4321' },
      { key: 'email', label: 'E-mail', synonyms: ['email', 'e-mail', 'mail', 'contato email'], example: 'compras@barstar.com.br' },
      { key: 'address', label: 'Endereço / Logradouro', synonyms: ['endereco', 'endereço', 'rua', 'logradouro', 'avenida'], example: 'Av. Paulista, 1000' },
      { key: 'number', label: 'Número', synonyms: ['numero', 'número', 'num', 'n'], example: '1000' },
      { key: 'neighborhood', label: 'Bairro', synonyms: ['bairro'], example: 'Bela Vista' },
      { key: 'city', label: 'Cidade', synonyms: ['cidade', 'municipio', 'município'], example: 'São Paulo' },
      { key: 'state', label: 'Estado (UF)', synonyms: ['uf', 'estado', 'est'], example: 'SP' },
      { key: 'zipCode', label: 'CEP', synonyms: ['cep', 'codigo postal'], example: '01310-100' },
      { key: 'creditLimit', label: 'Limite de Crédito (R$)', synonyms: ['limite', 'credito', 'limite de credito'], example: '5000' },
      { key: 'notes', label: 'Observações', synonyms: ['observacoes', 'observações', 'obs', 'notas'], example: 'Entregar apenas no período da manhã' },
    ],
    sampleData: [
      { 'Nome / Razão Social': 'Empório Cervejeiro Serra Ltda', 'Nome Fantasia': 'Empório Serra', 'CNPJ / CPF': '12.345.678/0001-90', 'Telefone / WhatsApp': '(11) 98765-4321', 'E-mail': 'contato@emporioserra.com.br', 'Endereço': 'Rua das Flores', 'Número': '120', 'Bairro': 'Jardins', 'Cidade': 'São Paulo', 'Estado (UF)': 'SP', 'CEP': '01400-000', 'Observações': 'Entrada pelos fundos' },
      { 'Nome / Razão Social': 'Boteco do João & Cia', 'Nome Fantasia': 'Boteco do João', 'CNPJ / CPF': '98.765.432/0001-10', 'Telefone / WhatsApp': '(11) 91234-5678', 'E-mail': 'joao@botecodojoao.com', 'Endereço': 'Av. Central', 'Número': '450', 'Bairro': 'Centro', 'Cidade': 'Campinas', 'Estado (UF)': 'SP', 'CEP': '13010-000', 'Observações': 'Pagamento semanal' },
    ],
  },
  KEGS: {
    type: 'KEGS',
    title: 'Parque de Barris',
    description: 'Barris de inox e growlers com códigos de rastreio, capacidade total e litragem real envasada.',
    icon: Cylinder,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    redirectUrl: '/barris',
    redirectLabel: 'Ver Parque de Barris',
    fields: [
      { key: 'code', label: 'Código / Patrimônio do Barril', required: true, synonyms: ['codigo', 'código', 'cod', 'patrimonio', 'patrimônio', 'tag', 'id', 'barril', 'numero', 'número'], example: 'BAR-50L-001' },
      { key: 'capacity', label: 'Capacidade Total do Barril (Litros)', required: true, synonyms: ['capacidade', 'litragem', 'volume nominal', 'tamanho', 'capacidade nominal', 'capacidade total', 'cap'], example: '50' },
      { key: 'currentVolumeLiters', label: 'Quantidade Real de Cerveja Envasada (Litros)', synonyms: ['quantidade real', 'real envasado', 'volume real', 'litros envasados', 'volume envasado', 'quantidade envasada', 'envasado', 'volume', 'saldo litros', 'litros reais', 'qtd real', 'litros', 'l'], example: '50' },
      { key: 'currentBeerName', label: 'Cerveja / Chopp Envasado', synonyms: ['cerveja', 'nome cerveja', 'nome do chopp', 'chopp', 'rotulo', 'rótulo', 'produto', 'conteudo'], example: 'German Pilsen' },
      { key: 'style', label: 'Estilo da Cerveja', synonyms: ['estilo', 'estilo da cerveja', 'estilo cerveja', 'beer style', 'style', 'categoria'], example: 'German Pilsner' },
      { key: 'batchNumber', label: 'Lote de Produção (Código do Lote)', synonyms: ['lote', 'número do lote', 'numero do lote', 'batch', 'lote de producao', 'lote de produção', 'cod lote', 'codigo lote', 'num lote', 'n lote'], example: 'LOT-2026-042' },
      { key: 'clientName', label: 'Cliente Atual / Em Posse (Se no Cliente)', synonyms: ['cliente', 'cliente atual', 'ponto de venda', 'pdv', 'posse', 'em comodato com', 'com quem esta', 'com quem está', 'bar', 'restaurante', 'nome do cliente'], example: 'Bar do Zé & Petiscos' },
      { key: 'kegType', label: 'Tipo de Barril', synonyms: ['tipo', 'modelo', 'engate', 'valvula'], example: 'INOX_EURO' },
      { key: 'status', label: 'Status Atual', synonyms: ['status', 'situacao', 'situação', 'estado'], example: 'HIGIENIZADO' },
      { key: 'notes', label: 'Observações Gerais', synonyms: ['observacoes', 'observações', 'obs', 'notas'], example: 'Válvula Tipo S revisada' },
    ],
    sampleData: [
      { 'Código / Patrimônio do Barril': 'BAR-50L-001', 'Capacidade Total (Litros)': 50, 'Qtd Real Envasada (Litros)': 0, 'Cerveja / Chopp Envasado': '', 'Estilo da Cerveja': '', 'Lote de Produção': '', 'Cliente Atual (Se no Cliente)': '', 'Tipo de Barril': 'INOX_EURO', 'Status Atual': 'HIGIENIZADO', 'Observações Gerais': 'Válvula Tipo S' },
      { 'Código / Patrimônio do Barril': 'BAR-50L-002', 'Capacidade Total (Litros)': 50, 'Qtd Real Envasada (Litros)': 50, 'Cerveja / Chopp Envasado': 'German Pilsen', 'Estilo da Cerveja': 'Pilsner', 'Lote de Produção': 'LOT-2026-042', 'Cliente Atual (Se no Cliente)': '', 'Tipo de Barril': 'INOX_EURO', 'Status Atual': 'EM_ESTOQUE', 'Observações Gerais': 'Cheio no estoque' },
      { 'Código / Patrimônio do Barril': 'BAR-50L-003', 'Capacidade Total (Litros)': 50, 'Qtd Real Envasada (Litros)': 50, 'Cerveja / Chopp Envasado': 'Hop Storm', 'Estilo da Cerveja': 'American IPA', 'Lote de Produção': 'LOT-2026-039', 'Cliente Atual (Se no Cliente)': 'Empório Central do Chopp', 'Tipo de Barril': 'INOX_EURO', 'Status Atual': 'NO_CLIENTE', 'Observações Gerais': 'Entregue em comodato' },
      { 'Código / Patrimônio do Barril': 'BAR-30L-015', 'Capacidade Total (Litros)': 30, 'Qtd Real Envasada (Litros)': 0, 'Cerveja / Chopp Envasado': '', 'Estilo da Cerveja': '', 'Lote de Produção': '', 'Cliente Atual (Se no Cliente)': 'Boteco da Serra', 'Tipo de Barril': 'INOX_SLIM', 'Status Atual': 'NO_CLIENTE', 'Observações Gerais': 'Vazio aguardando recolha' },
    ],
  },
  EQUIPMENT: {
    type: 'EQUIPMENT',
    title: 'Chopeiras & Equipamentos em Comodato',
    description: 'Chopeiras elétricas, a gelo, cilindros de CO2, extratoras e manômetros.',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    redirectUrl: '/equipamentos',
    redirectLabel: 'Ver Chopeiras & Equipamentos',
    fields: [
      { key: 'code', label: 'Código do Equipamento', required: true, synonyms: ['codigo', 'código', 'cod', 'patrimonio', 'tag', 'id', 'numero'], example: 'CHOP-ELE-01' },
      { key: 'name', label: 'Nome / Modelo', required: true, synonyms: ['nome', 'modelo', 'descricao', 'equipamento'], example: 'Chopeira Elétrica Memo 2 Vias 50L/h' },
      { key: 'type', label: 'Tipo de Equipamento', synonyms: ['tipo', 'categoria'], example: 'CHOPEIRA_ELETRICA' },
      { key: 'clientName', label: 'Cliente Atual / Comodato (Se no Cliente)', synonyms: ['cliente', 'cliente atual', 'ponto de venda', 'pdv', 'posse', 'em comodato'], example: 'Bar do Zé & Petiscos' },
      { key: 'voltage', label: 'Voltagem (110V / 220V)', synonyms: ['voltagem', 'tensao', 'tensão', 'volt'], example: '220V' },
      { key: 'serialNumber', label: 'Número de Série', synonyms: ['serie', 'série', 'numero de serie', 'serial'], example: 'SN-998822' },
      { key: 'status', label: 'Status', synonyms: ['status', 'situacao'], example: 'DISPONIVEL' },
      { key: 'notes', label: 'Observações', synonyms: ['observacoes', 'obs', 'notas'], example: 'Acompanha 2 torneiras italianas e mangueiras' },
    ],
    sampleData: [
      { 'Código do Equipamento': 'CHOP-01', 'Nome / Modelo': 'Chopeira Elétrica 2 Vias 60L/h', 'Tipo de Equipamento': 'CHOPEIRA_ELETRICA', 'Cliente Atual (Se no Cliente)': 'Bar do Zé & Petiscos', 'Voltagem': '220V', 'Número de Série': 'MEMO-4421', 'Status': 'EM_USO_CLIENTE', 'Observações': 'Torneiras Italianas' },
      { 'Código do Equipamento': 'CIL-CO2-05', 'Nome / Modelo': 'Cilindro CO2 6kg Válvula Top', 'Tipo de Equipamento': 'CILINDRO_CO2', 'Cliente Atual (Se no Cliente)': '', 'Voltagem': '', 'Número de Série': 'CIL-6K-09', 'Status': 'DISPONIVEL', 'Observações': 'Cheio de gás' },
    ],
  },
  ORDERS: {
    type: 'ORDERS',
    title: 'Pedidos em Aberto & Entregas',
    description: 'Pedidos de vendas de chopp, entregas agendadas, valores e status.',
    icon: ShoppingBag,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    redirectUrl: '/pedidos',
    redirectLabel: 'Ver Pedidos de Venda',
    fields: [
      { key: 'orderNumber', label: 'Número do Pedido (Opcional)', synonyms: ['pedido', 'numero do pedido', 'número do pedido', 'num pedido', 'n pedido', 'ordem', 'codigo pedido'], example: 'PED-101' },
      { key: 'clientName', label: 'Nome do Cliente / Ponto de Venda', required: true, synonyms: ['cliente', 'nome do cliente', 'razao social', 'nome fantasia', 'ponto', 'comprador'], example: 'Bar e Restaurante Estrela' },
      { key: 'beerName', label: 'Cerveja / Chopp do Pedido', synonyms: ['cerveja', 'item', 'chopp', 'produto', 'estilo', 'descricao', 'descrição'], example: 'German Pilsen 50L' },
      { key: 'quantity', label: 'Quantidade de Barris / Itens', synonyms: ['quantidade', 'qtd', 'quant', 'barris', 'unidades', 'un'], example: '2' },
      { key: 'unitPrice', label: 'Valor Unitário (R$)', synonyms: ['unitario', 'unitário', 'preco', 'preço', 'valor unitario', 'preco unitario'], example: '550.00' },
      { key: 'totalAmount', label: 'Valor Total do Pedido (R$)', synonyms: ['total', 'valor total', 'subtotal', 'valor'], example: '1100.00' },
      { key: 'status', label: 'Status do Pedido (CONFIRMADO, EM_ROTA, ENTREGUE)', synonyms: ['status', 'situacao', 'situação', 'estado', 'status entrega'], example: 'CONFIRMADO' },
      { key: 'paymentStatus', label: 'Status do Pagamento (PENDENTE, PAGO, PARCIAL)', synonyms: ['pagamento', 'status pagamento', 'status pago', 'financeiro'], example: 'PENDENTE' },
      { key: 'deliveryDate', label: 'Data Prevista de Entrega', synonyms: ['data entrega', 'entrega', 'data', 'previsao', 'previsão', 'data de entrega'], example: '2026-08-30' },
      { key: 'paymentMethod', label: 'Forma de Pagamento (PIX, BOLETO, CARTAO, DINHEIRO)', synonyms: ['forma de pagamento', 'meio de pagamento', 'pagamento via', 'forma pagto'], example: 'PIX' },
      { key: 'notes', label: 'Observações do Pedido', synonyms: ['observacoes', 'observações', 'obs', 'notas', 'detalhes'], example: 'Entregar com chopeira 2 vias' },
    ],
    sampleData: [
      { 'Número do Pedido': 'PED-101', 'Nome do Cliente': 'Bar e Restaurante Estrela', 'Cerveja / Chopp': 'German Pilsen 50L', 'Quantidade': 2, 'Valor Unitário (R$)': 550.0, 'Valor Total (R$)': 1100.0, 'Status do Pedido': 'CONFIRMADO', 'Status Pagamento': 'PENDENTE', 'Data de Entrega': '2026-08-30', 'Forma de Pagamento': 'PIX', 'Observações': 'Pedido em aberto para o fim de semana' },
      { 'Número do Pedido': 'PED-102', 'Nome do Cliente': 'Empório da Serra', 'Cerveja / Chopp': 'Hop Storm IPA 30L', 'Quantidade': 3, 'Valor Unitário (R$)': 450.0, 'Valor Total (R$)': 1350.0, 'Status do Pedido': 'CONFIRMADO', 'Status Pagamento': 'PENDENTE', 'Data de Entrega': '2026-08-31', 'Forma de Pagamento': 'BOLETO', 'Observações': 'Entregar no período da manhã' },
      { 'Número do Pedido': 'PED-103', 'Nome do Cliente': 'Boteco do Zé', 'Cerveja / Chopp': 'Weissbier 50L', 'Quantidade': 1, 'Valor Unitário (R$)': 580.0, 'Valor Total (R$)': 580.0, 'Status do Pedido': 'ENTREGUE', 'Status Pagamento': 'PAGO', 'Data de Entrega': '2026-08-25', 'Forma de Pagamento': 'CARTAO', 'Observações': 'Entregue com 1 chopeira' },
    ],
  },
  RECIPES: {
    type: 'RECIPES',
    title: 'Receitas & Estilos de Chopp',
    description: 'Estilos de cerveja com custos de produção e preços de venda por litro.',
    icon: Beer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    redirectUrl: '/producao',
    redirectLabel: 'Ver Receitas & Produção',
    fields: [
      { key: 'name', label: 'Nome da Cerveja / Rótulo', required: true, synonyms: ['nome', 'cerveja', 'rotulo', 'rótulo', 'produto', 'receita'], example: 'German Pilsen Puro Malte' },
      { key: 'style', label: 'Estilo', synonyms: ['estilo', 'categoria', 'style'], example: 'German Pilsner' },
      { key: 'salePricePerLiter', label: 'Preço de Venda / Litro (R$)', synonyms: ['preco', 'preço', 'valor', 'venda', 'preco venda', 'valor litro', 'preco litro'], example: '18.00' },
      { key: 'costPerLiter', label: 'Custo de Fabricação / Litro (R$)', synonyms: ['custo', 'custo litro', 'custo de fabricacao'], example: '4.50' },
      { key: 'abv', label: 'ABV (% Álcool)', synonyms: ['abv', 'teor', 'alcool', 'álcool'], example: '4.8' },
      { key: 'ibu', label: 'IBU (Amargor)', synonyms: ['ibu', 'amargor'], example: '22' },
      { key: 'description', label: 'Descrição / Notas Sensoriais', synonyms: ['descricao', 'descrição', 'notas', 'detalhes'], example: 'Cerveja límpida, refrescante e aromática' },
    ],
    sampleData: [
      { 'Nome da Cerveja / Rótulo': 'German Pilsen', 'Estilo': 'German Pils', 'Preço de Venda / Litro (R$)': 18.0, 'Custo de Fabricação / Litro (R$)': 4.2, 'ABV (% Álcool)': 4.8, 'IBU (Amargor)': 24, 'Descrição': 'Lager dourada e refrescante' },
      { 'Nome da Cerveja / Rótulo': 'Hop Storm IPA', 'Estilo': 'American IPA', 'Preço de Venda / Litro (R$)': 26.0, 'Custo de Fabricação / Litro (R$)': 6.8, 'ABV (% Álcool)': 6.5, 'IBU (Amargor)': 55, 'Descrição': 'Cítrica com duplo dry hopping' },
      { 'Nome da Cerveja / Rótulo': 'Weissbier Trigo', 'Estilo': 'German Weizen', 'Preço de Venda / Litro (R$)': 20.0, 'Custo de Fabricação / Litro (R$)': 4.9, 'ABV (% Álcool)': 5.2, 'IBU (Amargor)': 14, 'Descrição': 'Aromas de cravo e banana' },
    ],
  },
  TANKS: {
    type: 'TANKS',
    title: 'Tanques de Fermentação',
    description: 'Fermentadores isotérmicos, maturadores e tanques de brassagem.',
    icon: Flame,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    redirectUrl: '/producao',
    redirectLabel: 'Ver Tanques & Produção',
    fields: [
      { key: 'name', label: 'Nome / Tag do Tanque', required: true, synonyms: ['nome', 'tag', 'tanque', 'codigo', 'fermentador'], example: 'F-01 (1000L)' },
      { key: 'capacityLiters', label: 'Capacidade em Litros', required: true, synonyms: ['capacidade', 'litros', 'volume', 'tamanho'], example: '1000' },
      { key: 'type', label: 'Tipo do Tanque', synonyms: ['tipo', 'categoria'], example: 'FERMENTADOR_ISOTERMICO' },
      { key: 'notes', label: 'Observações', synonyms: ['observacoes', 'obs', 'notas'], example: 'Camisa dupla refrigerada' },
    ],
    sampleData: [
      { 'Nome / Tag do Tanque': 'F-01', 'Capacidade em Litros': 1000, 'Tipo do Tanque': 'FERMENTADOR_ISOTERMICO', 'Observações': 'Isotérmico Cônico' },
      { 'Nome / Tag do Tanque': 'F-02', 'Capacidade em Litros': 1000, 'Tipo do Tanque': 'FERMENTADOR_ISOTERMICO', 'Observações': 'Isotérmico Cônico' },
      { 'Nome / Tag do Tanque': 'BBT-01', 'Capacidade em Litros': 2000, 'Tipo do Tanque': 'BBT_BRITE_TANK', 'Observações': 'Brite Tank para clarificação' },
    ],
  },
};

export default function ImportacaoPage() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('CLIENTS');
  const [mode, setMode] = useState<'FILE' | 'PASTE'>('FILE');
  const [pasteText, setPasteText] = useState('');

  // Target brewery for Super Admin
  const [breweries, setBreweries] = useState<any[]>([]);
  const [targetBreweryId, setTargetBreweryId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  // Parsed Raw Spreadsheet Data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // Field Mapping: mapping key -> rawHeader string
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // Importing State & Result
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalProcessed: number;
    createdCount: number;
    updatedCount: number;
    errorsCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = ENTITY_CONFIGS[selectedEntity];

  // Load user role and breweries if super admin
  useEffect(() => {
    const checkAuthAndBreweries = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserRole(meData.role || '');
          if (meData.role === 'SUPER_ADMIN') {
            const bRes = await fetch('/api/master/breweries');
            if (bRes.ok) {
              const bData = await bRes.json();
              if (Array.isArray(bData.breweries)) {
                setBreweries(bData.breweries);
                if (bData.breweries.length > 0) {
                  setTargetBreweryId(bData.breweries[0].id);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkAuthAndBreweries();
  }, []);

  // When entity changes, reset parsed data and re-apply auto-mapping if rows exist
  useEffect(() => {
    if (rawHeaders.length > 0) {
      applyAutoMapping(rawHeaders, selectedEntity);
    }
  }, [selectedEntity]);

  const applyAutoMapping = (headers: string[], entity: EntityType) => {
    const currentConfig = ENTITY_CONFIGS[entity];
    const newMapping: Record<string, string> = {};

    currentConfig.fields.forEach((field) => {
      // Find matching header by synonym or exact name
      const matched = headers.find((h) => {
        const normalized = h.toLowerCase().trim();
        return (
          normalized === field.key.toLowerCase() ||
          normalized === field.label.toLowerCase() ||
          field.synonyms.some((syn) => normalized.includes(syn) || syn.includes(normalized))
        );
      });
      if (matched) {
        newMapping[field.key] = matched;
      }
    });

    setFieldMapping(newMapping);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (data.length === 0) {
          alert('A planilha está vazia!');
          return;
        }

        const headers = Object.keys(data[0]);
        setRawHeaders(headers);
        setRawRows(data);
        applyAutoMapping(headers, selectedEntity);
      } catch (err: any) {
        alert('Erro ao ler a planilha: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) return;

    try {
      // Try parsing tab-separated or comma-separated text
      const lines = pasteText.trim().split('\n');
      if (lines.length < 2) {
        alert('Cole pelo menos o cabeçalho e uma linha de dados.');
        return;
      }

      // Detect separator (tab or comma or semicolon)
      const firstLine = lines[0];
      const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

      const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      setFileName('Dados Colados via Área de Transferência');
      setRawHeaders(headers);
      setRawRows(rows);
      applyAutoMapping(headers, selectedEntity);
      setImportResult(null);
    } catch (err: any) {
      alert('Erro ao processar dados colados: ' + err.message);
    }
  };

  const downloadSampleTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(config.sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 30));
    XLSX.writeFile(wb, `Modelo_Importacao_${selectedEntity}_PintTech.xlsx`);
  };

  // Map rows to clean PintTech payload using fieldMapping
  const getMappedData = () => {
    return rawRows.map((rawRow) => {
      const mappedObj: Record<string, any> = {};
      Object.entries(fieldMapping).forEach(([targetKey, sourceHeader]) => {
        if (sourceHeader && sourceHeader !== '__IGNORE__') {
          mappedObj[targetKey] = rawRow[sourceHeader];
        }
      });
      return mappedObj;
    });
  };

  const handleExecuteImport = async () => {
    const payloadData = getMappedData();
    if (payloadData.length === 0) {
      alert('Nenhum dado para importar.');
      return;
    }

    // Check if required fields are mapped
    const missingRequired = config.fields.filter(
      (f) => f.required && (!fieldMapping[f.key] || fieldMapping[f.key] === '__IGNORE__')
    );

    if (missingRequired.length > 0) {
      alert(
        `Atenção: Os campos obrigatórios [${missingRequired
          .map((f) => f.label)
          .join(', ')}] não foram mapeados com nenhuma coluna da planilha!`
      );
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedEntity,
          data: payloadData,
          targetBreweryId: userRole === 'SUPER_ADMIN' ? targetBreweryId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao importar dados.');
      }

      setImportResult(json);
    } catch (err: any) {
      alert('Erro na importação: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setRawHeaders([]);
    setRawRows([]);
    setFileName(null);
    setFieldMapping({});
    setImportResult(null);
    setPasteText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mappedPreview = getMappedData().slice(0, 5);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              Migração & Onboarding Express
            </span>
            <span className="text-xs text-amber-300/80 font-medium">Suporta Excel (.xlsx, .xls) e CSV</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            Central de Importação de Dados
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Cadastre novos clientes, parque de barris, chopeiras, receitas e tanques em segundos a partir de planilhas exportadas de sistemas anteriores ou criadas no Excel.
          </p>
        </div>

        {/* Super Admin Brewery Picker */}
        {userRole === 'SUPER_ADMIN' && breweries.length > 0 && (
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[240px]">
            <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Cervejaria de Destino:
            </label>
            <select
              value={targetBreweryId}
              onChange={(e) => setTargetBreweryId(e.target.value)}
              className="w-full text-xs font-bold bg-slate-900 text-white border border-amber-500/40 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {breweries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Step 1: Escolha o Tipo de Dado a Importar */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
          Passo 1: O que você deseja cadastrar ou migrar?
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(ENTITY_CONFIGS) as EntityType[]).map((type) => {
            const ent = ENTITY_CONFIGS[type];
            const isSelected = selectedEntity === type;
            const Icon = ent.icon;

            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedEntity(type);
                  setImportResult(null);
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? `${ent.bgColor} ${ent.borderColor} ring-2 ring-amber-500/40 shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${ent.bgColor} ${ent.color} border ${ent.borderColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-sm text-slate-900 leading-snug">{ent.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ent.description}</p>
                </div>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full mt-3 self-start">
                    <Check className="w-3 h-3" /> Selecionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Upload da Planilha ou Colar Dados */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Passo 2: Carregar Planilha de {config.title}
            </span>
            <h2 className="text-base font-black text-slate-900">
              Envie o arquivo do cliente ou use o modelo pronto
            </h2>
          </div>

          {/* Download Model Button */}
          <button
            onClick={downloadSampleTemplate}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors border border-slate-300"
            title="Baixar planilha pré-formatada para preenchimento"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Baixar Planilha Modelo (.xlsx)</span>
          </button>
        </div>

        {/* Upload Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('FILE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'FILE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload de Arquivo (Excel / CSV)</span>
          </button>
          <button
            onClick={() => setMode('PASTE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'PASTE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Copiar e Colar Tabela (Ctrl+V)</span>
          </button>
        </div>

        {mode === 'FILE' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-800">
                {fileName ? `Arquivo: ${fileName}` : 'Clique aqui para selecionar ou arraste sua planilha'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Formatos suportados: .xlsx, .xls ou .csv (Qualquer formato ou layout de colunas)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Cole aqui as linhas copiadas do Excel ou Google Sheets...\nExemplo:\nNome\tCNPJ\tTelefone\tCidade\nBar Estrela\t12.345.678/0001-90\t11987654321\tSão Paulo`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePasteProcess}
                disabled={!pasteText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Processar Texto Colado
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Mapeador Inteligente de Colunas */}
      {rawHeaders.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Passo 3: Mapeamento Automático Inteligente
              </span>
              <h2 className="text-base font-black text-slate-900">
                Associe as colunas da sua planilha aos campos do PintTech
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detectamos automaticamente as colunas compatíveis. Ajuste caso queira mudar alguma associação.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
                {rawRows.length} registro(s) encontrado(s)
              </span>
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                title="Limpar e carregar outro arquivo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {config.fields.map((field) => {
              const currentMappedHeader = fieldMapping[field.key] || '__IGNORE__';
              const isMapped = currentMappedHeader !== '__IGNORE__';

              return (
                <div
                  key={field.key}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isMapped
                      ? 'bg-amber-50/40 border-amber-300'
                      : field.required
                      ? 'bg-rose-50/40 border-rose-300'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-rose-600 font-bold">*</span>}
                    </span>
                    {isMapped ? (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/90 px-1.5 py-0.2 rounded">
                        ✓ Mapeado
                      </span>
                    ) : field.required ? (
                      <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded">
                        Obrigatório
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Opcional</span>
                    )}
                  </div>

                  <select
                    value={currentMappedHeader}
                    onChange={(e) =>
                      setFieldMapping({
                        ...fieldMapping,
                        [field.key]: e.target.value,
                      })
                    }
                    className={`w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white ${
                      isMapped
                        ? 'border-amber-400 text-slate-900'
                        : field.required
                        ? 'border-rose-400 text-rose-800'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    <option value="__IGNORE__">— Ignorar este campo —</option>
                    {rawHeaders.map((header) => (
                      <option key={header} value={header}>
                        Coluna: {header} (ex: &quot;{String(rawRows[0]?.[header] || '').slice(0, 20)}&quot;)
                      </option>
                    ))}
                  </select>

                  <span className="text-[10px] text-slate-400 block mt-1 truncate">
                    Exemplo no sistema: {field.example}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Preview Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Prévia dos Primeiros 5 Registros Mapeados:
            </span>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 pl-4">#</th>
                    {config.fields
                      .filter((f) => fieldMapping[f.key] && fieldMapping[f.key] !== '__IGNORE__')
                      .map((f) => (
                        <th key={f.key} className="p-2.5">
                          {f.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {mappedPreview.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      <td className="p-2.5 pl-4 font-mono text-slate-400 text-[10px]">{rIdx + 1}</td>
                      {config.fields
                        .filter((f) => fieldMapping[f.key] && fieldMapping[f.key] !== '__IGNORE__')
                        .map((f) => (
                          <td key={f.key} className="p-2.5 font-semibold">
                            {String(row[f.key] || '—')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              Ao confirmar, os dados serão validados e importados com segurança no banco de dados.
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importando registros...</span>
                </>
              ) : (
                <>
                  <span>🚀 Importar {rawRows.length} {config.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resultado da Importação */}
      {importResult && (
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            importResult.success && importResult.errorsCount === 0
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black">
                  🎉 Importação Concluída com Sucesso!
                </h3>
                <p className="text-xs text-emerald-900/80 font-medium">
                  Os dados já estão disponíveis no sistema para uso operacional imediato.
                </p>
              </div>
            </div>

            <Link
              href={config.redirectUrl}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>{config.redirectLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold pt-2">
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-slate-500 block uppercase">Total Processado</span>
              <span className="text-base font-black text-slate-900">{importResult.totalProcessed}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-600 block uppercase">Novos Criados</span>
              <span className="text-base font-black text-emerald-700">+{importResult.createdCount}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-blue-600 block uppercase">Existentes Atualizados</span>
              <span className="text-base font-black text-blue-700">{importResult.updatedCount}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-rose-600 block uppercase">Linhas com Erro</span>
              <span className="text-base font-black text-rose-700">{importResult.errorsCount}</span>
            </div>
          </div>

          {/* Error List if any */}
          {importResult.errors.length > 0 && (
            <div className="p-3 bg-white/90 rounded-xl border border-amber-300 text-xs space-y-1 text-rose-900">
              <span className="font-black text-[11px] block">Avisos em linhas específicas:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {importResult.errors.map((err, eIdx) => (
                  <li key={eIdx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300"
            >
              Fazer Outra Importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
