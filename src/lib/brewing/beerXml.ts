/**
 * Parser e Serializador BeerXML 1.0
 * Compatível com Brewfather, BeerSmith e Brewers Friend
 */

import { FermentableItem, HopItem, YeastItem, MashStep } from './calculations';

export interface MiscItem {
  name: string;
  type: string;
  use: string;
  amount: number;
  unit: string;
  timeMinutes?: number;
  notes?: string;
}

export interface ParsedBeerXmlRecipe {
  name: string;
  style: string;
  type: string;
  brewer?: string;
  batchYieldLiters: number;
  boilTimeMinutes: number;
  efficiencyPercent: number;
  og?: number;
  fg?: number;
  abv?: number;
  ibu?: number;
  ebc?: number;
  notes?: string;
  tasteNotes?: string;
  fermentables: FermentableItem[];
  hops: HopItem[];
  yeast?: YeastItem;
  miscs: MiscItem[];
  mashSteps: MashStep[];
}

function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? decodeXmlEntities(match[1]) : null;
}

function extractAllBlocks(xml: string, blockTag: string): string[] {
  const regex = new RegExp(`<${blockTag}>([\\s\\S]*?)<\\/${blockTag}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Lê o conteúdo em texto de um arquivo .xml e converte para o modelo de receita do PintTech.
 */
export function parseBeerXml(xmlContent: string): ParsedBeerXmlRecipe[] {
  const recipes: ParsedBeerXmlRecipe[] = [];
  const recipeBlocks = extractAllBlocks(xmlContent, 'RECIPE');

  const blocksToProcess = recipeBlocks.length > 0 ? recipeBlocks : [xmlContent];

  for (const block of blocksToProcess) {
    const name = extractTagValue(block, 'NAME') || 'Receita Importada';
    const styleName = extractTagValue(block, 'STYLE') ? extractTagValue(extractTagValue(block, 'STYLE') || '', 'NAME') || 'Estilo Desconhecido' : 'Estilo Desconhecido';
    const type = extractTagValue(block, 'TYPE') || 'All Grain';
    const brewer = extractTagValue(block, 'BREWER') || undefined;
    const batchYieldLiters = parseFloat(extractTagValue(block, 'BATCH_SIZE') || '500');
    const boilTimeMinutes = parseInt(extractTagValue(block, 'BOIL_TIME') || '60', 10);
    const efficiencyPercent = parseFloat(extractTagValue(block, 'EFFICIENCY') || '75');
    const og = extractTagValue(block, 'OG') ? parseFloat(extractTagValue(block, 'OG')!) : undefined;
    const fg = extractTagValue(block, 'FG') ? parseFloat(extractTagValue(block, 'FG')!) : undefined;
    const abv = extractTagValue(block, 'ABV') ? parseFloat(extractTagValue(block, 'ABV')!) : undefined;
    const ibu = extractTagValue(block, 'IBU') ? Math.round(parseFloat(extractTagValue(block, 'IBU')!)) : undefined;
    const estColorSrm = extractTagValue(block, 'EST_COLOR') ? parseFloat(extractTagValue(block, 'EST_COLOR')!) : undefined;
    const ebc = estColorSrm ? Math.round(estColorSrm * 1.97 * 10) / 10 : undefined;
    const notes = extractTagValue(block, 'NOTES') || undefined;

    // Fermentables
    const fermentables: FermentableItem[] = [];
    const fermentableBlocks = extractAllBlocks(block, 'FERMENTABLE');
    for (const fBlock of fermentableBlocks) {
      const fName = extractTagValue(fBlock, 'NAME') || 'Malte';
      const amountKg = parseFloat(extractTagValue(fBlock, 'AMOUNT') || '0');
      const yieldPercent = parseFloat(extractTagValue(fBlock, 'YIELD') || '75');
      const colorLovibond = parseFloat(extractTagValue(fBlock, 'COLOR') || '3.5');
      const fType = extractTagValue(fBlock, 'TYPE')?.toUpperCase() || 'GRAIN';

      fermentables.push({
        name: fName,
        amountKg: Math.round(amountKg * 100) / 100,
        potentialYieldPercent: yieldPercent,
        colorEbc: Math.round(colorLovibond * 1.97 * 10) / 10,
        category: fType.includes('SUGAR') ? 'SUGAR' : fType.includes('EXTRACT') ? 'EXTRACT' : fType.includes('ADJUNCT') ? 'ADJUNCT' : 'GRAIN',
      });
    }

    // Hops
    const hops: HopItem[] = [];
    const hopBlocks = extractAllBlocks(block, 'HOP');
    for (const hBlock of hopBlocks) {
      const hName = extractTagValue(hBlock, 'NAME') || 'Lúpulo';
      const amountKg = parseFloat(extractTagValue(hBlock, 'AMOUNT') || '0');
      const alphaAcid = parseFloat(extractTagValue(hBlock, 'ALPHA') || '10');
      const timeMin = parseFloat(extractTagValue(hBlock, 'TIME') || '60');
      const useRaw = extractTagValue(hBlock, 'USE')?.toUpperCase() || 'BOIL';

      let use: 'BOIL' | 'FIRST_WORT' | 'WHIRLPOOL' | 'DRY_HOP' | 'MASH' = 'BOIL';
      if (useRaw.includes('FIRST WORT')) use = 'FIRST_WORT';
      else if (useRaw.includes('AROMA') || useRaw.includes('WHIRLPOOL') || useRaw.includes('HOPSTAND')) use = 'WHIRLPOOL';
      else if (useRaw.includes('DRY')) use = 'DRY_HOP';
      else if (useRaw.includes('MASH')) use = 'MASH';

      hops.push({
        name: hName,
        amountGrams: Math.round(amountKg * 1000 * 10) / 10,
        alphaAcidPercent: alphaAcid,
        timeMinutes: timeMin,
        use,
        tempCelsius: use === 'WHIRLPOOL' ? 85 : undefined,
      });
    }

    // Yeast
    let yeast: YeastItem | undefined = undefined;
    const yeastBlocks = extractAllBlocks(block, 'YEAST');
    if (yeastBlocks.length > 0) {
      const yBlock = yeastBlocks[0];
      const yName = extractTagValue(yBlock, 'NAME') || 'Levedura';
      const yAttenuation = parseFloat(extractTagValue(yBlock, 'ATTENUATION') || '75');
      const yForm = extractTagValue(yBlock, 'FORM')?.toUpperCase() === 'LIQUID' ? 'LIQUID' : 'DRY';
      const yMinTemp = extractTagValue(yBlock, 'MIN_TEMPERATURE') ? parseFloat(extractTagValue(yBlock, 'MIN_TEMPERATURE')!) : undefined;
      const yMaxTemp = extractTagValue(yBlock, 'MAX_TEMPERATURE') ? parseFloat(extractTagValue(yBlock, 'MAX_TEMPERATURE')!) : undefined;

      yeast = {
        name: yName,
        attenuationPercent: yAttenuation,
        form: yForm,
        minTempCelsius: yMinTemp,
        maxTempCelsius: yMaxTemp,
      };
    }

    const tasteNotes = extractTagValue(block, 'TASTE_NOTES') || undefined;

    // Miscs (Adjuntos, Sais, Clarificantes, Açúcares)
    const miscs: MiscItem[] = [];
    const miscBlocks = extractAllBlocks(block, 'MISC');
    for (const mBlock of miscBlocks) {
      const mName = extractTagValue(mBlock, 'NAME') || 'Adjunto';
      const mType = extractTagValue(mBlock, 'TYPE') || 'Other';
      const mUse = extractTagValue(mBlock, 'USE') || 'Boil';
      const mAmountRaw = parseFloat(extractTagValue(mBlock, 'AMOUNT') || '0');
      const mAmountIsWeight = extractTagValue(mBlock, 'AMOUNT_IS_WEIGHT')?.toLowerCase() === 'true';
      const mTime = extractTagValue(mBlock, 'TIME') ? parseFloat(extractTagValue(mBlock, 'TIME')!) : undefined;
      const mNotes = extractTagValue(mBlock, 'NOTES') || undefined;

      // Se for peso e valor pequeno (< 1), geralmente está em kg no XML, converter para g
      let displayAmount = mAmountRaw;
      let displayUnit = mAmountIsWeight ? 'KG' : 'L';
      if (mAmountIsWeight && mAmountRaw < 1 && mAmountRaw > 0) {
        displayAmount = Math.round(mAmountRaw * 1000 * 10) / 10;
        displayUnit = 'G';
      } else if (!mAmountIsWeight && mAmountRaw < 1 && mAmountRaw > 0) {
        displayAmount = Math.round(mAmountRaw * 1000 * 10) / 10;
        displayUnit = 'ML';
      }

      miscs.push({
        name: mName,
        type: mType,
        use: mUse,
        amount: displayAmount,
        unit: displayUnit,
        timeMinutes: mTime,
        notes: mNotes,
      });
    }

    // Mash Steps
    const mashSteps: MashStep[] = [];
    const mashStepBlocks = extractAllBlocks(block, 'MASH_STEP');
    for (const mBlock of mashStepBlocks) {
      const mName = extractTagValue(mBlock, 'NAME') || 'Rampa';
      const mTemp = parseFloat(extractTagValue(mBlock, 'STEP_TEMP') || '66');
      const mTime = parseInt(extractTagValue(mBlock, 'STEP_TIME') || '60', 10);
      const mType = extractTagValue(mBlock, 'TYPE')?.toUpperCase() || 'TEMPERATURE';

      mashSteps.push({
        name: mName,
        type: mType.includes('INFUSION') ? 'INFUSION' : mType.includes('DECOCTION') ? 'DECOCTION' : 'TEMPERATURE',
        stepTempCelsius: mTemp,
        stepTimeMinutes: mTime,
      });
    }

    recipes.push({
      name,
      style: styleName,
      type,
      brewer,
      batchYieldLiters,
      boilTimeMinutes,
      efficiencyPercent,
      og,
      fg,
      abv,
      ibu,
      ebc,
      notes,
      tasteNotes,
      fermentables,
      hops,
      yeast,
      miscs,
      mashSteps,
    });
  }

  return recipes;
}

/**
 * Converte um objeto de receita do PintTech de volta para o padrão BeerXML 1.0 oficial.
 */
export function exportToBeerXml(recipe: {
  name: string;
  style: string;
  batchYieldLiters?: number;
  boilTimeMinutes?: number;
  efficiencyPercent?: number;
  og?: number | null;
  fg?: number | null;
  abv?: number | null;
  ibu?: number | null;
  ebc?: number | null;
  description?: string | null;
  fermentables?: FermentableItem[];
  hops?: HopItem[];
  yeast?: YeastItem;
  mashSteps?: MashStep[];
}): string {
  const batchSize = recipe.batchYieldLiters || 500;
  const boilTime = recipe.boilTimeMinutes || 60;
  const efficiency = recipe.efficiencyPercent || 75;
  const srm = recipe.ebc ? Math.round((recipe.ebc / 1.97) * 10) / 10 : 5;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RECIPES>\n  <RECIPE>\n`;
  xml += `    <NAME>${escapeXml(recipe.name)}</NAME>\n`;
  xml += `    <VERSION>1</VERSION>\n`;
  xml += `    <TYPE>All Grain</TYPE>\n`;
  xml += `    <STYLE>\n      <NAME>${escapeXml(recipe.style)}</NAME>\n      <VERSION>1</VERSION>\n    </STYLE>\n`;
  xml += `    <BREWER>PintTech Brewmaster</BREWER>\n`;
  xml += `    <BATCH_SIZE>${batchSize.toFixed(2)}</BATCH_SIZE>\n`;
  xml += `    <BOIL_SIZE>${(batchSize * 1.15).toFixed(2)}</BOIL_SIZE>\n`;
  xml += `    <BOIL_TIME>${boilTime}</BOIL_TIME>\n`;
  xml += `    <EFFICIENCY>${efficiency.toFixed(1)}</EFFICIENCY>\n`;
  if (recipe.og) xml += `    <OG>${recipe.og.toFixed(3)}</OG>\n`;
  if (recipe.fg) xml += `    <FG>${recipe.fg.toFixed(3)}</FG>\n`;
  if (recipe.abv) xml += `    <ABV>${recipe.abv.toFixed(1)}</ABV>\n`;
  if (recipe.ibu) xml += `    <IBU>${recipe.ibu}</IBU>\n`;
  xml += `    <EST_COLOR>${srm.toFixed(1)}</EST_COLOR>\n`;
  if (recipe.description) xml += `    <NOTES>${escapeXml(recipe.description)}</NOTES>\n`;

  // Fermentables
  xml += `    <FERMENTABLES>\n`;
  for (const f of recipe.fermentables || []) {
    const lovibond = (f.colorEbc || 3.5) / 1.97;
    xml += `      <FERMENTABLE>\n`;
    xml += `        <NAME>${escapeXml(f.name)}</NAME>\n`;
    xml += `        <VERSION>1</VERSION>\n`;
    xml += `        <TYPE>${f.category === 'SUGAR' ? 'Sugar' : f.category === 'EXTRACT' ? 'Extract' : f.category === 'ADJUNCT' ? 'Adjunct' : 'Grain'}</TYPE>\n`;
    xml += `        <AMOUNT>${(f.amountKg || 0).toFixed(3)}</AMOUNT>\n`;
    xml += `        <YIELD>${(f.potentialYieldPercent || 80).toFixed(1)}</YIELD>\n`;
    xml += `        <COLOR>${lovibond.toFixed(1)}</COLOR>\n`;
    xml += `      </FERMENTABLE>\n`;
  }
  xml += `    </FERMENTABLES>\n`;

  // Hops
  xml += `    <HOPS>\n`;
  for (const h of recipe.hops || []) {
    xml += `      <HOP>\n`;
    xml += `        <NAME>${escapeXml(h.name)}</NAME>\n`;
    xml += `        <VERSION>1</VERSION>\n`;
    xml += `        <ALPHA>${(h.alphaAcidPercent || 10).toFixed(1)}</ALPHA>\n`;
    xml += `        <AMOUNT>${((h.amountGrams || 0) / 1000).toFixed(4)}</AMOUNT>\n`;
    xml += `        <USE>${h.use === 'FIRST_WORT' ? 'First Wort' : h.use === 'WHIRLPOOL' ? 'Aroma' : h.use === 'DRY_HOP' ? 'Dry Hop' : 'Boil'}</USE>\n`;
    xml += `        <TIME>${h.timeMinutes || 0}</TIME>\n`;
    xml += `      </HOP>\n`;
  }
  xml += `    </HOPS>\n`;

  // Yeast
  if (recipe.yeast) {
    xml += `    <YEASTS>\n      <YEAST>\n`;
    xml += `        <NAME>${escapeXml(recipe.yeast.name)}</NAME>\n`;
    xml += `        <VERSION>1</VERSION>\n`;
    xml += `        <TYPE>Ale</TYPE>\n`;
    xml += `        <FORM>${recipe.yeast.form === 'LIQUID' ? 'Liquid' : 'Dry'}</FORM>\n`;
    xml += `        <ATTENUATION>${(recipe.yeast.attenuationPercent || 75).toFixed(1)}</ATTENUATION>\n`;
    xml += `      </YEAST>\n    </YEASTS>\n`;
  }

  // Mash
  if (recipe.mashSteps && recipe.mashSteps.length > 0) {
    xml += `    <MASH>\n      <NAME>Perfil de Mostura</NAME>\n      <VERSION>1</VERSION>\n      <GRAIN_TEMP>22.0</GRAIN_TEMP>\n      <MASH_STEPS>\n`;
    for (const step of recipe.mashSteps) {
      xml += `        <MASH_STEP>\n`;
      xml += `          <NAME>${escapeXml(step.name)}</NAME>\n`;
      xml += `          <VERSION>1</VERSION>\n`;
      xml += `          <TYPE>${step.type === 'INFUSION' ? 'Infusion' : step.type === 'DECOCTION' ? 'Decoction' : 'Temperature'}</TYPE>\n`;
      xml += `          <STEP_TEMP>${step.stepTempCelsius.toFixed(1)}</STEP_TEMP>\n`;
      xml += `          <STEP_TIME>${step.stepTimeMinutes}</STEP_TIME>\n`;
      xml += `        </MASH_STEP>\n`;
    }
    xml += `      </MASH_STEPS>\n    </MASH>\n`;
  }

  xml += `  </RECIPE>\n</RECIPES>\n`;
  return xml;
}

function escapeXml(unsafe?: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
