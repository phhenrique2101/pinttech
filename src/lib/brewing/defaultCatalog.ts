/**
 * Catálogo padrão de insumos cervejeiros (Maltes, Lúpulos, Leveduras e Perfis de Água)
 */

import { FermentableItem, HopItem, YeastItem, WaterProfile } from './calculations';

export const POPULAR_MALTS: Array<Omit<FermentableItem, 'amountKg'>> = [
  { name: 'Malte Pilsen (Agrária / Weyermann / Chateau)', potentialSg: 1.037, potentialYieldPercent: 81, colorEbc: 3.5, category: 'GRAIN' },
  { name: 'Malte Pale Ale', potentialSg: 1.037, potentialYieldPercent: 81, colorEbc: 6.0, category: 'GRAIN' },
  { name: 'Malte Munich I (15 EBC)', potentialSg: 1.036, potentialYieldPercent: 78, colorEbc: 15.0, category: 'GRAIN' },
  { name: 'Malte Munich II (25 EBC)', potentialSg: 1.035, potentialYieldPercent: 77, colorEbc: 25.0, category: 'GRAIN' },
  { name: 'Malte Vienna', potentialSg: 1.036, potentialYieldPercent: 79, colorEbc: 8.0, category: 'GRAIN' },
  { name: 'Malte de Trigo Claro (Wheat Malt)', potentialSg: 1.038, potentialYieldPercent: 82, colorEbc: 4.0, category: 'GRAIN' },
  { name: 'Aveia em Flocos (Flaked Oats)', potentialSg: 1.033, potentialYieldPercent: 70, colorEbc: 2.5, category: 'ADJUNCT' },
  { name: 'Trigo em Flocos (Flaked Wheat)', potentialSg: 1.035, potentialYieldPercent: 75, colorEbc: 3.0, category: 'ADJUNCT' },
  { name: 'Malte CaraPils / Dextrina', potentialSg: 1.033, potentialYieldPercent: 72, colorEbc: 5.0, category: 'GRAIN' },
  { name: 'Malte CaraMunich I', potentialSg: 1.034, potentialYieldPercent: 74, colorEbc: 90.0, category: 'GRAIN' },
  { name: 'Malte CaraMunich II', potentialSg: 1.034, potentialYieldPercent: 74, colorEbc: 120.0, category: 'GRAIN' },
  { name: 'Malte CaraRed / Red Active', potentialSg: 1.034, potentialYieldPercent: 74, colorEbc: 45.0, category: 'GRAIN' },
  { name: 'Malte Caramelo 60L (Crystal 60)', potentialSg: 1.034, potentialYieldPercent: 74, colorEbc: 150.0, category: 'GRAIN' },
  { name: 'Malte Melanoidina', potentialSg: 1.035, potentialYieldPercent: 76, colorEbc: 70.0, category: 'GRAIN' },
  { name: 'Malte Acidulado / Sauer', potentialSg: 1.033, potentialYieldPercent: 70, colorEbc: 5.0, category: 'GRAIN' },
  { name: 'Malte Chocolate', potentialSg: 1.028, potentialYieldPercent: 60, colorEbc: 900.0, category: 'GRAIN' },
  { name: 'Cevada Torrada (Roasted Barley)', potentialSg: 1.025, potentialYieldPercent: 55, colorEbc: 1200.0, category: 'GRAIN' },
  { name: 'Malte Black / Carafa Special III', potentialSg: 1.025, potentialYieldPercent: 55, colorEbc: 1400.0, category: 'GRAIN' },
  { name: 'Açúcar Cristal / Dextrose (Corn Sugar)', potentialSg: 1.046, potentialYieldPercent: 100, colorEbc: 1.0, category: 'SUGAR' },
  { name: 'Lactose (Leite)', potentialSg: 1.035, potentialYieldPercent: 75, colorEbc: 1.0, category: 'SUGAR' },
];

export const POPULAR_HOPS: Array<Omit<HopItem, 'amountGrams'>> = [
  { name: 'Citra', alphaAcidPercent: 12.5, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Mosaic', alphaAcidPercent: 12.0, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Galaxy', alphaAcidPercent: 14.5, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Cascade', alphaAcidPercent: 5.5, timeMinutes: 60, use: 'BOIL' },
  { name: 'Centennial', alphaAcidPercent: 9.5, timeMinutes: 60, use: 'BOIL' },
  { name: 'Columbus / CTZ', alphaAcidPercent: 14.0, timeMinutes: 60, use: 'BOIL' },
  { name: 'Amarillo', alphaAcidPercent: 9.0, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Simcoe', alphaAcidPercent: 13.0, timeMinutes: 60, use: 'BOIL' },
  { name: 'Saaz', alphaAcidPercent: 3.5, timeMinutes: 60, use: 'BOIL' },
  { name: 'Hallertau Mittelfrüh', alphaAcidPercent: 4.0, timeMinutes: 60, use: 'BOIL' },
  { name: 'Tettnanger', alphaAcidPercent: 4.5, timeMinutes: 60, use: 'BOIL' },
  { name: 'Magnum', alphaAcidPercent: 14.0, timeMinutes: 60, use: 'BOIL' },
  { name: 'El Dorado', alphaAcidPercent: 14.0, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Sabro', alphaAcidPercent: 13.5, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Idaho 7', alphaAcidPercent: 13.0, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'Strata', alphaAcidPercent: 12.5, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85 },
  { name: 'East Kent Goldings (EKG)', alphaAcidPercent: 5.0, timeMinutes: 60, use: 'BOIL' },
  { name: 'Fuggle', alphaAcidPercent: 4.5, timeMinutes: 60, use: 'BOIL' },
];

export const POPULAR_YEASTS: YeastItem[] = [
  { name: 'Fermentis SafAle US-05 (American Ale)', attenuationPercent: 81, minTempCelsius: 18, maxTempCelsius: 22, form: 'DRY' },
  { name: 'Fermentis SafAle S-04 (English Ale)', attenuationPercent: 75, minTempCelsius: 18, maxTempCelsius: 22, form: 'DRY' },
  { name: 'Fermentis SafLager W-34/70 (German Lager)', attenuationPercent: 83, minTempCelsius: 10, maxTempCelsius: 14, form: 'DRY' },
  { name: 'Fermentis SafLager S-23 (European Lager)', attenuationPercent: 82, minTempCelsius: 10, maxTempCelsius: 14, form: 'DRY' },
  { name: 'Fermentis SafAle WB-06 (Wheat / Weiss)', attenuationPercent: 86, minTempCelsius: 18, maxTempCelsius: 24, form: 'DRY' },
  { name: 'Fermentis SafAle BE-134 (Saison / Farmhouse)', attenuationPercent: 90, minTempCelsius: 20, maxTempCelsius: 28, form: 'DRY' },
  { name: 'Fermentis SafAle BE-256 (Abbey / Belgian)', attenuationPercent: 84, minTempCelsius: 18, maxTempCelsius: 24, form: 'DRY' },
  { name: 'Lallemand Verdant IPA (NEIPA / Juicy)', attenuationPercent: 77, minTempCelsius: 18, maxTempCelsius: 22, form: 'DRY' },
  { name: 'Lallemand Nottingham (Clean Ale)', attenuationPercent: 80, minTempCelsius: 14, maxTempCelsius: 21, form: 'DRY' },
  { name: 'Lallemand Philly Sour (Lactic Sour)', attenuationPercent: 76, minTempCelsius: 20, maxTempCelsius: 25, form: 'DRY' },
  { name: 'Lallemand Voss Kveik (Fast Hot Ferment)', attenuationPercent: 78, minTempCelsius: 25, maxTempCelsius: 38, form: 'DRY' },
];

export const STANDARD_WATER_PROFILES: WaterProfile[] = [
  { name: 'Pilsen / Água Muito Mole', ca: 7, mg: 2, na: 2, so4: 5, cl: 5, hco3: 15 },
  { name: 'Hazy / NEIPA (Cloreto Elevado - Corpo & Maciez)', ca: 100, mg: 15, na: 20, so4: 80, cl: 180, hco3: 35 },
  { name: 'West Coast IPA (Sulfato Elevado - Amargor Seco)', ca: 120, mg: 18, na: 25, so4: 250, cl: 50, hco3: 40 },
  { name: 'Equilibrado / Pale Ale / Amber', ca: 80, mg: 10, na: 15, so4: 110, cl: 90, hco3: 50 },
  { name: 'Maltada / Stout & Porter', ca: 90, mg: 15, na: 30, so4: 60, cl: 120, hco3: 140 },
  { name: 'Belgian Ale / Saison', ca: 80, mg: 12, na: 20, so4: 100, cl: 80, hco3: 80 },
];
