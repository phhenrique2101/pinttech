/**
 * PintTech Brew Engine — Motor de Cálculos Físico-Químicos Cervejeiros
 * 
 * Fórmulas implementadas:
 * - Gravidade: Extrato potencial de grãos x Eficiência -> OG, FG, Plato, Atenuação, ABV (ASBC)
 * - Amargor: Fórmula Tinseth completa com escala térmica para Whirlpool/Hop Stand e FWH
 * - Cor: Fórmula Morey para SRM/EBC e conversão para HEX/RGB
 * - Equilíbrio: BU:GU Ratio
 * - Química da Água: Balanço de íons (Ca, Mg, Na, SO4, Cl, HCO3), relação SO4/Cl, acidificação para pH da mostura
 * - Mostura & Volumes: Água de arriação (Strike Water), temperatura de arriação (Strike Temp), água de lavagem (Sparge)
 */

export interface FermentableItem {
  id?: string;
  name: string;
  amountKg: number;
  potentialSg?: number; // ex: 1.037
  potentialYieldPercent?: number; // ex: 80%
  colorEbc: number; // ex: 4.5
  category?: 'GRAIN' | 'EXTRACT' | 'SUGAR' | 'ADJUNCT';
  inventoryItemId?: string | null;
  costPerKg?: number;
}

export interface HopItem {
  id?: string;
  name: string;
  amountGrams: number;
  alphaAcidPercent: number; // ex: 12.5%
  timeMinutes: number; // tempo de fervura ou contato
  use: 'BOIL' | 'FIRST_WORT' | 'WHIRLPOOL' | 'DRY_HOP' | 'MASH';
  tempCelsius?: number; // temperatura no whirlpool (ex: 85°C)
  inventoryItemId?: string | null;
  costPerGram?: number;
}

export interface YeastItem {
  id?: string;
  name: string;
  attenuationPercent: number; // ex: 78%
  minTempCelsius?: number;
  maxTempCelsius?: number;
  form?: 'DRY' | 'LIQUID';
  inventoryItemId?: string | null;
  costPerUnit?: number;
}

export interface WaterProfile {
  name: string;
  ca: number;  // Cálcio (ppm)
  mg: number;  // Magnésio (ppm)
  na: number;  // Sódio (ppm)
  so4: number; // Sulfato (ppm)
  cl: number;  // Cloreto (ppm)
  hco3: number;// Bicarbonato (ppm)
}

export interface WaterSaltsAddition {
  gypsumGrams: number;       // CaSO4 (Sulfato de Cálcio / Gipsita)
  calciumChlorideGrams: number; // CaCl2 (Cloreto de Cálcio)
  epsomSaltGrams: number;    // MgSO4 (Sulfato de Magnésio)
  tableSaltGrams: number;    // NaCl (Cloreto de Sódio)
  bakingSodaGrams: number;   // NaHCO3 (Bicarbonato de Sódio)
  lacticAcid85Ml: number;    // Ácido Lático 85% (ml)
}

export interface MashStep {
  name: string;
  type: 'INFUSION' | 'TEMPERATURE' | 'DECOCTION';
  stepTempCelsius: number;
  stepTimeMinutes: number;
  rampTimeMinutes?: number;
}

// ----------------------------------------------------
// 1. CONVERSÕES BÁSICAS
// ----------------------------------------------------

export function sgToPlato(sg: number): number {
  if (!sg || sg <= 1.0) return 0;
  return -616.868 + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3));
}

export function platoToSg(plato: number): number {
  if (!plato || plato <= 0) return 1.000;
  return 1 + (plato / (258.6 - ((plato / 258.2) * 227.1)));
}

export function litersToGallons(liters: number): number {
  return liters * 0.264172;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function ebcToSrm(ebc: number): number {
  return ebc / 1.97;
}

export function srmToEbc(srm: number): number {
  return srm * 1.97;
}

// ----------------------------------------------------
// 2. GRAVIDADE, ATENUAÇÃO E ÁLCOOL (ABV)
// ----------------------------------------------------

/**
 * Calcula a Gravidade Inicial (OG) baseada nos fermentáveis, volume e eficiência do equipamento.
 */
export function calculateOg(
  fermentables: FermentableItem[],
  batchVolumeLiters: number,
  efficiencyPercent: number = 75
): number {
  if (!batchVolumeLiters || batchVolumeLiters <= 0 || !fermentables || fermentables.length === 0) {
    return 1.000;
  }

  const volGallons = litersToGallons(batchVolumeLiters);
  let totalGravityPoints = 0;

  for (const f of fermentables) {
    const weightLbs = kgToLbs(f.amountKg || 0);
    // Potencial padrão de grão se não informado: 1.037 (37 pontos por libra/galão)
    let potentialPts = 37;
    if (f.potentialSg && f.potentialSg > 1.0) {
      potentialPts = (f.potentialSg - 1) * 1000;
    } else if (f.potentialYieldPercent && f.potentialYieldPercent > 0) {
      potentialPts = f.potentialYieldPercent * 0.462;
    }

    // Açúcares e extratos têm 100% de rendimento (não dependem da eficiência da brassagem)
    const isExtractOrSugar = f.category === 'SUGAR' || f.category === 'EXTRACT';
    const effFactor = isExtractOrSugar ? 1.0 : efficiencyPercent / 100;

    totalGravityPoints += (weightLbs * potentialPts * effFactor) / volGallons;
  }

  const calculatedOg = 1 + totalGravityPoints / 1000;
  return Math.round(calculatedOg * 1000) / 1000;
}

/**
 * Calcula a Gravidade Final (FG) estimada baseada no OG e atenuação da levedura.
 */
export function calculateFg(og: number, attenuationPercent: number = 75): number {
  if (!og || og <= 1.0) return 1.000;
  const ogPoints = (og - 1.0) * 1000;
  const attenuation = Math.max(1, Math.min(100, attenuationPercent)) / 100;
  const fgPoints = ogPoints * (1 - attenuation);
  const fg = 1 + fgPoints / 1000;
  return Math.round(fg * 1000) / 1000;
}

/**
 * Calcula o Teor Alcoólico (ABV % v/v) usando a fórmula precisa ASBC.
 */
export function calculateAbv(og: number, fg: number): number {
  if (!og || !fg || og <= fg) return 0;
  // Fórmula ASBC avançada
  const abv = ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return Math.max(0, Math.round(abv * 10) / 10);
}

/**
 * Calcula as calorias estimadas por 100ml e por pint (473ml).
 */
export function calculateCalories(og: number, fg: number): { cal100ml: number; calPint: number } {
  if (!og || !fg || og <= 1.0) return { cal100ml: 0, calPint: 0 };
  const realExtract = 0.1808 * sgToPlato(og) + 0.8192 * sgToPlato(fg);
  const abw = (0.79 * calculateAbv(og, fg)) / fg;
  const cal100g = 6.9 * abw + 4.0 * (realExtract - 0.1);
  const cal100ml = Math.round(cal100g * fg);
  const calPint = Math.round(cal100ml * 4.73);
  return { cal100ml, calPint };
}

// ----------------------------------------------------
// 3. AMARGOR (IBU) — FÓRMULA TINSETH COM WHIRLPOOL
// ----------------------------------------------------

/**
 * Calcula o IBU total e individual de cada adição de lúpulo (Tinseth).
 */
export function calculateIbu(
  hops: HopItem[],
  og: number,
  batchVolumeLiters: number
): { totalIbu: number; hopDetails: Array<HopItem & { ibu: number }> } {
  if (!batchVolumeLiters || batchVolumeLiters <= 0 || !hops || hops.length === 0 || og <= 1.0) {
    return { totalIbu: 0, hopDetails: [] };
  }

  // Fator de densidade do mosto (Bivalence factor de Tinseth)
  const bFactor = 1.65 * Math.pow(0.000125, og - 1.0);

  let totalIbu = 0;
  const hopDetails = hops.map((hop) => {
    let utilization = 0;
    const time = hop.timeMinutes || 0;
    const aa = hop.alphaAcidPercent || 0;
    const weightGrams = hop.amountGrams || 0;

    if (hop.use === 'BOIL') {
      const tFactor = (1 - Math.exp(-0.04 * time)) / 4.15;
      utilization = bFactor * tFactor;
    } else if (hop.use === 'FIRST_WORT') {
      // First Wort Hopping confere cerca de 10% a mais de isomerização
      const tFactor = (1 - Math.exp(-0.04 * Math.max(60, time))) / 4.15;
      utilization = bFactor * tFactor * 1.1;
    } else if (hop.use === 'WHIRLPOOL') {
      // Whirlpool: isomerização cai exponencialmente abaixo de 100°C
      const temp = hop.tempCelsius || 85;
      const tempFactor = temp >= 100 ? 1.0 : temp < 75 ? 0.05 : Math.pow((temp - 70) / 30, 2);
      const tFactor = (1 - Math.exp(-0.04 * time)) / 4.15;
      utilization = bFactor * tFactor * tempFactor * 0.5; // whirlpool decay factor
    } else if (hop.use === 'DRY_HOP' || hop.use === 'MASH') {
      // Dry hopping e Mash hopping não contribuem com IBU significativo de isomerização
      utilization = 0;
    }

    const ibu = (weightGrams * (aa / 100) * utilization * 1000) / batchVolumeLiters;
    const roundedIbu = Math.max(0, Math.round(ibu * 10) / 10);
    totalIbu += roundedIbu;

    return {
      ...hop,
      ibu: roundedIbu,
    };
  });

  return {
    totalIbu: Math.round(totalIbu),
    hopDetails,
  };
}

// ----------------------------------------------------
// 4. COR (EBC / SRM) — FÓRMULA MOREY & PREVIEW RGB/HEX
// ----------------------------------------------------

/**
 * Calcula a cor EBC e SRM usando a equação de Morey.
 */
export function calculateColor(
  fermentables: FermentableItem[],
  batchVolumeLiters: number
): { srm: number; ebc: number; hexColor: string } {
  if (!batchVolumeLiters || batchVolumeLiters <= 0 || !fermentables || fermentables.length === 0) {
    return { srm: 2, ebc: 4, hexColor: '#FFE699' };
  }

  const volGallons = litersToGallons(batchVolumeLiters);
  let totalMcu = 0;

  for (const f of fermentables) {
    const weightLbs = kgToLbs(f.amountKg || 0);
    const lovibond = ebcToSrm(f.colorEbc || 3.0);
    totalMcu += (weightLbs * lovibond) / volGallons;
  }

  // Equação de Morey: SRM = 1.4922 * (MCU ^ 0.6859)
  const srm = totalMcu > 0 ? 1.4922 * Math.pow(totalMcu, 0.6859) : 2;
  const roundedSrm = Math.max(1, Math.min(80, Math.round(srm * 10) / 10));
  const roundedEbc = Math.round(srmToEbc(roundedSrm) * 10) / 10;
  const hexColor = srmToHex(roundedSrm);

  return {
    srm: roundedSrm,
    ebc: roundedEbc,
    hexColor,
  };
}

/**
 * Mapeamento preciso de SRM para cor HEX realista de cerveja.
 */
export function srmToHex(srm: number): string {
  const srmColors: Record<number, string> = {
    1: '#F8F753',
    2: '#F6F513',
    3: '#ECE61A',
    4: '#D5BC26',
    5: '#BF923B',
    6: '#BF813A',
    7: '#BC6733',
    8: '#8D4C32',
    9: '#5D341A',
    10: '#261716',
    11: '#8B4513',
    12: '#80340A',
    13: '#772506',
    14: '#6F1804',
    15: '#660D02',
    16: '#5D0701',
    17: '#550300',
    18: '#4D0200',
    19: '#450100',
    20: '#3D0100',
    25: '#280000',
    30: '#1C0000',
    35: '#120000',
    40: '#080000',
  };

  const rounded = Math.round(srm);
  if (rounded <= 1) return srmColors[1];
  if (rounded >= 40) return srmColors[40];

  if (srmColors[rounded]) return srmColors[rounded];

  // Interpolação aproximada
  if (rounded < 5) return '#E8D459';
  if (rounded < 8) return '#D39C38';
  if (rounded < 12) return '#B75D27';
  if (rounded < 16) return '#8A3215';
  if (rounded < 22) return '#571607';
  if (rounded < 30) return '#310903';
  return '#150302';
}

// ----------------------------------------------------
// 5. EQUILÍBRIO BU:GU
// ----------------------------------------------------

export function calculateBuGu(ibu: number, og: number): { ratio: number; balance: 'MALT_FORWARD' | 'BALANCED' | 'HOP_FORWARD' | 'EXTREME_HOP' } {
  if (!og || og <= 1.000) return { ratio: 0, balance: 'BALANCED' };
  const gravityPoints = (og - 1.000) * 1000;
  const ratio = Math.round((ibu / gravityPoints) * 100) / 100;

  let balance: 'MALT_FORWARD' | 'BALANCED' | 'HOP_FORWARD' | 'EXTREME_HOP' = 'BALANCED';
  if (ratio < 0.45) balance = 'MALT_FORWARD';
  else if (ratio <= 0.85) balance = 'BALANCED';
  else if (ratio <= 1.30) balance = 'HOP_FORWARD';
  else balance = 'EXTREME_HOP';

  return { ratio, balance };
}

// ----------------------------------------------------
// 6. QUÍMICA DA ÁGUA & SAIS
// ----------------------------------------------------

/**
 * Calcula a composição iônica final após adição de sais em gramas para determinado volume total de água.
 */
export function calculateWaterProfile(
  baseWater: WaterProfile,
  salts: WaterSaltsAddition,
  totalWaterLiters: number
): WaterProfile & { sulfateChlorideRatio: number; profileCharacter: string } {
  if (!totalWaterLiters || totalWaterLiters <= 0) {
    return {
      ...baseWater,
      sulfateChlorideRatio: baseWater.cl > 0 ? baseWater.so4 / baseWater.cl : 1,
      profileCharacter: 'Equilibrado',
    };
  }

  // Contribuições iônicas por grama de sal em 1L de água (ppm = mg/L):
  // Gipsita (CaSO4.2H2O): 232.8 ppm Ca, 558 ppm SO4
  // Cloreto de Cálcio (CaCl2.2H2O): 272.6 ppm Ca, 482.3 ppm Cl
  // Sal de Epsom (MgSO4.7H2O): 98.6 ppm Mg, 389.6 ppm SO4
  // Sal de Cozinha (NaCl): 393.4 ppm Na, 606.6 ppm Cl
  // Bicarbonato de Sódio (NaHCO3): 273.6 ppm Na, 726.4 ppm HCO3

  const vol = totalWaterLiters;

  const addedCa = (salts.gypsumGrams * 232.8 + salts.calciumChlorideGrams * 272.6) / vol;
  const addedMg = (salts.epsomSaltGrams * 98.6) / vol;
  const addedNa = (salts.tableSaltGrams * 393.4 + salts.bakingSodaGrams * 273.6) / vol;
  const addedSo4 = (salts.gypsumGrams * 558.0 + salts.epsomSaltGrams * 389.6) / vol;
  const addedCl = (salts.calciumChlorideGrams * 482.3 + salts.tableSaltGrams * 606.6) / vol;
  const addedHco3 = (salts.bakingSodaGrams * 726.4) / vol;

  const finalCa = Math.round(baseWater.ca + addedCa);
  const finalMg = Math.round(baseWater.mg + addedMg);
  const finalNa = Math.round(baseWater.na + addedNa);
  const finalSo4 = Math.round(baseWater.so4 + addedSo4);
  const finalCl = Math.round(baseWater.cl + addedCl);
  const finalHco3 = Math.round(baseWater.hco3 + addedHco3);

  const ratio = finalCl > 0 ? Math.round((finalSo4 / finalCl) * 100) / 100 : finalSo4;

  let profileCharacter = 'Equilibrado';
  if (ratio > 2.5) profileCharacter = 'Muito Amarga / Seca (West Coast IPA)';
  else if (ratio >= 1.5) profileCharacter = 'Amargor Realçado (Pale Ale / IPA)';
  else if (ratio >= 0.8) profileCharacter = 'Equilibrado (Pilsen / Amber / Stout)';
  else if (ratio >= 0.4) profileCharacter = 'Corpo & Suculência (NEIPA / Hazy IPA)';
  else profileCharacter = 'Muito Maltada / Aveludada';

  return {
    name: 'Água Ajustada',
    ca: finalCa,
    mg: finalMg,
    na: finalNa,
    so4: finalSo4,
    cl: finalCl,
    hco3: finalHco3,
    sulfateChlorideRatio: ratio,
    profileCharacter,
  };
}

/**
 * Estima a quantidade de Ácido Lático 85% (em ml) necessária para baixar o pH da mostura para o alvo (ex: 5.3).
 */
export function estimateLacticAcidRequirement(
  mashWaterLiters: number,
  totalGrainsKg: number,
  baseWaterHco3Ppm: number,
  targetPh: number = 5.3
): number {
  if (!mashWaterLiters || mashWaterLiters <= 0) return 0;
  // Bicarbonato consome ~0.015 ml de ácido lático 85% por ppm/L
  const alkalinityCorrection = (baseWaterHco3Ppm * 0.015 * mashWaterLiters) / 10;
  // Grãos base naturalmente puxam para ~5.6, grãos escuros descem mais
  const grainCorrection = totalGrainsKg * 0.4;
  const estimatedMl = Math.max(0, alkalinityCorrection + grainCorrection);
  return Math.round(estimatedMl * 10) / 10;
}

// ----------------------------------------------------
// 7. VOLUMES DE MOSTURA & STRIKE WATER TEMPERATURE
// ----------------------------------------------------

export interface MashVolumePlan {
  totalGrainKg: number;
  mashWaterRatio: number; // L/kg (ex: 3.0)
  mashWaterLiters: number;
  spargeWaterLiters: number;
  totalWaterLiters: number;
  strikeTempCelsius: number;
  preBoilVolumeLiters: number;
  grainAbsorptionLiters: number;
  boilOffLiters: number;
  trubLossLiters: number;
}

/**
 * Calcula todo o balanço hídrico da brassagem e a temperatura de arriação dos grãos (Strike Temp).
 */
export function calculateMashAndWaterVolumes(
  fermentables: FermentableItem[],
  batchVolumeLiters: number,
  targetMashTempCelsius: number = 66,
  grainTempCelsius: number = 22,
  mashRatioLPerKg: number = 3.0,
  boilTimeMinutes: number = 60,
  boilOffRatePercentPerHour: number = 10
): MashVolumePlan {
  const totalGrainKg = fermentables.reduce((acc, f) => acc + (f.amountKg || 0), 0);
  const mashRatio = Math.max(2.0, Math.min(5.0, mashRatioLPerKg));

  const mashWaterLiters = Math.round(totalGrainKg * mashRatio);

  // Perda por absorção nos grãos (aproximadamente 0.96 L/kg)
  const grainAbsorptionLiters = Math.round(totalGrainKg * 0.96);

  // Perda de trub / fundo de panela / contra-fluxo (~5% do volume do lote)
  const trubLossLiters = Math.round(batchVolumeLiters * 0.05);

  // Evaporação na fervura
  const boilHours = boilTimeMinutes / 60;
  const postBoilVolumeTarget = batchVolumeLiters + trubLossLiters;
  const boilOffLiters = Math.round(postBoilVolumeTarget * (boilOffRatePercentPerHour / 100) * boilHours);

  const preBoilVolumeLiters = postBoilVolumeTarget + boilOffLiters;

  // Água de lavagem necessária
  const wortFromMash = Math.max(0, mashWaterLiters - grainAbsorptionLiters);
  const spargeWaterLiters = Math.max(0, Math.round(preBoilVolumeLiters - wortFromMash));
  const totalWaterLiters = mashWaterLiters + spargeWaterLiters;

  // Fórmula Palmer / Beersmith de Strike Temperature:
  // T_strike = (0.41 / R) * (T_alvo - T_grao) + T_alvo
  const strikeTempCelsius = Math.round(((0.41 / mashRatio) * (targetMashTempCelsius - grainTempCelsius) + targetMashTempCelsius) * 10) / 10;

  return {
    totalGrainKg: Math.round(totalGrainKg * 10) / 10,
    mashWaterRatio: mashRatio,
    mashWaterLiters,
    spargeWaterLiters,
    totalWaterLiters,
    strikeTempCelsius,
    preBoilVolumeLiters,
    grainAbsorptionLiters,
    boilOffLiters,
    trubLossLiters,
  };
}
