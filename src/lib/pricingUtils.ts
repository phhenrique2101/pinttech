/**
 * PintTech Pricing & Rounding Engine
 * Utilitários para cálculo de preços de cerveja e regras de arredondamento comercial.
 */

export type RoundingRule = 'NONE' | 'ROUND_INT' | 'ROUND_HALF' | 'ROUND_NINE' | 'ROUND_CEIL';

export type PricingModel =
  | 'MANUAL'
  | 'CUSTOM'
  | 'AT_COST'
  | 'PERCENT'
  | 'MARKUP'
  | 'COST_PLUS_PERCENT'
  | 'COST_PLUS_FIXED'
  | 'DISCOUNT_PERCENT'
  | 'MARKUP_PERCENT';

/**
 * Aplica regra de arredondamento a um valor monetário
 */
export function applyRounding(val: number, rule: RoundingRule | string = 'NONE'): number {
  if (isNaN(val) || val <= 0) return 0;

  switch (rule) {
    case 'ROUND_INT':
      // Arredonda para o inteiro mais próximo (ex: 14.33 -> 14.00, 14.60 -> 15.00)
      return Math.round(val);

    case 'ROUND_HALF':
      // Arredonda para múltiplo de 0.50 mais próximo (ex: 14.20 -> 14.00, 14.35 -> 14.50, 14.70 -> 14.50, 14.85 -> 15.00)
      return Math.round(val * 2) / 2;

    case 'ROUND_NINE': {
      // Arredonda com terminação comercial .90 (ex: 14.20 -> 14.90, 14.00 -> 13.90)
      const floor = Math.floor(val);
      if (val === floor && floor > 0) {
        return parseFloat((floor - 0.10).toFixed(2));
      }
      return parseFloat((floor + 0.90).toFixed(2));
    }

    case 'ROUND_CEIL':
      // Arredonda sempre para cima inteiro (ex: 14.10 -> 15.00)
      return Math.ceil(val);

    case 'NONE':
    default:
      return parseFloat(val.toFixed(2));
  }
}

/**
 * Calcula o preço por litro com base no custo, preço base, modelo e arredondamento
 */
export function computeCalculatedPrice({
  cost,
  basePrice,
  model,
  adjustmentValue = 0,
  roundingRule = 'NONE',
}: {
  cost: number;
  basePrice: number;
  model: string;
  adjustmentValue?: number;
  roundingRule?: RoundingRule | string;
}): number {
  const c = Math.max(0, parseFloat(String(cost)) || 0);
  const bp = Math.max(0, parseFloat(String(basePrice)) || 0);
  const adj = parseFloat(String(adjustmentValue)) || 0;
  let price = bp;

  switch (model) {
    case 'AT_COST':
      price = c > 0 ? c : bp;
      break;

    case 'PERCENT':
    case 'MARKUP':
    case 'COST_PLUS_PERCENT':
      // Preço = Custo * (1 + Margem% / 100)
      price = c > 0 ? c * (1 + adj / 100) : bp * (1 + adj / 100);
      break;

    case 'COST_PLUS_FIXED':
      // Preço = Custo + Valor Fixo R$ X
      price = c > 0 ? c + adj : bp + adj;
      break;

    case 'DISCOUNT_PERCENT':
    case 'BASE_DISCOUNT':
      // Desconto sobre o Preço Base da Cerveja
      price = bp * (1 - adj / 100);
      break;

    case 'MARKUP_PERCENT':
    case 'BASE_MARKUP':
      // Acréscimo sobre o Preço Base da Cerveja
      price = bp * (1 + adj / 100);
      break;

    case 'MANUAL':
    case 'CUSTOM':
    default:
      price = bp;
      break;
  }

  return applyRounding(Math.max(0, price), roundingRule);
}
