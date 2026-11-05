import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, getSessionFromCookies } from '@/lib/auth';
import { parseBeerXml } from '@/lib/brewing/beerXml';
import { calculateColor, calculateOg, calculateFg, calculateAbv, calculateIbu } from '@/lib/brewing/calculations';
import { findBjcpStyle } from '@/lib/brewing/bjcpStyles';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const batchId = params.id;
    if (!batchId) {
      return NextResponse.json({ error: 'ID do lote não fornecido' }, { status: 400 });
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        recipe: true,
        ingredients: true,
        tank: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    // Validação de isolamento multi-tenant
    if (session.role !== 'SUPER_ADMIN' && batch.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado a este lote' }, { status: 403 });
    }

    const body = await req.json();
    const { xmlContent, fileName, syncRecipe = true, syncIngredients = true } = body;

    if (!xmlContent || typeof xmlContent !== 'string') {
      return NextResponse.json({ error: 'Conteúdo BeerXML não fornecido' }, { status: 400 });
    }

    const parsedRecipes = parseBeerXml(xmlContent);
    if (parsedRecipes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma receita cervejeira válida encontrada no arquivo XML' }, { status: 400 });
    }

    const p = parsedRecipes[0];
    const batchSize = p.batchYieldLiters || batch.volumePlannedLiters || 500;
    const efficiency = p.efficiencyPercent || 75;

    const og = p.og || calculateOg(p.fermentables, batchSize, efficiency);
    const fg = p.fg || calculateFg(og, p.yeast?.attenuationPercent || 75);
    const abv = p.abv || calculateAbv(og, fg);
    const ibuObj = calculateIbu(p.hops, og, batchSize);
    const ibu = p.ibu !== undefined ? p.ibu : ibuObj.totalIbu;
    const colorObj = calculateColor(p.fermentables, batchSize);
    const ebc = p.ebc || colorObj.ebc;
    const bjcpMatch = findBjcpStyle(p.style);

    const xmlName = fileName || `${p.name.trim().replace(/\s+/g, '_')}.xml`;
    const xmlNotes = p.tasteNotes?.trim() || p.notes?.trim() || `Importado via BeerXML (${p.name})`;

    // 1. ATUALIZAR A RECEITA VINCULADA (SE EXISTIR E syncRecipe FOR TRUE)
    if (syncRecipe && batch.recipeId) {
      await prisma.beerRecipe.update({
        where: { id: batch.recipeId },
        data: {
          style: p.style?.trim() || batch.recipe?.style || 'Cerveja Especial',
          og,
          fg,
          abv,
          ibu,
          ebc,
          batchYieldLiters: batchSize,
          boilTimeMinutes: p.boilTimeMinutes || 60,
          efficiencyPercent: efficiency,
          bjcpStyleCode: bjcpMatch ? bjcpMatch.code : null,
          recipeDataJson: JSON.stringify(p),
          xmlFileName: xmlName,
          xmlContent: xmlContent,
          description: xmlNotes || batch.recipe?.description,
        },
      });

      // Atualiza os ingredientes do catálogo da receita
      const recipeIngredientsData = [
        ...p.fermentables.map((f) => ({
          recipeId: batch.recipeId,
          name: f.name,
          category: f.category || 'MALTE',
          amount: f.amountKg,
          unit: 'KG',
          stage: 'MOSTURA',
          costPerUnit: 0,
          notes: f.potentialYieldPercent ? `Rendimento: ${f.potentialYieldPercent}% | Cor: ${f.colorEbc} EBC` : null,
        })),
        ...p.hops.map((h) => ({
          recipeId: batch.recipeId,
          name: h.name,
          category: 'LUPULO',
          amount: h.amountGrams,
          unit: 'G',
          stage: h.use === 'FIRST_WORT' ? 'FIRST_WORT' : h.use === 'WHIRLPOOL' ? 'WHIRLPOOL' : h.use === 'DRY_HOP' ? 'DRY_HOPPING' : 'FERVURA_60MIN',
          costPerUnit: 0,
          notes: `Alfa-Ácido: ${h.alphaAcidPercent}% | Tempo: ${h.timeMinutes}min`,
        })),
      ];

      if (p.yeast) {
        recipeIngredientsData.push({
          recipeId: batch.recipeId,
          name: p.yeast.name,
          category: 'LEVEDURA',
          amount: 1,
          unit: 'PACOTE',
          stage: 'FERMENTACAO',
          costPerUnit: 0,
          notes: `Atenuação: ${p.yeast.attenuationPercent}%`,
        });
      }

      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: batch.recipeId },
      });

      if (recipeIngredientsData.length > 0) {
        await prisma.recipeIngredient.createMany({
          data: recipeIngredientsData,
        });
      }
    }

    // 2. ATUALIZAR INSUMOS DO LOTE PARA A FICHA MAPA (BatchIngredient)
    if (syncIngredients) {
      await prisma.batchIngredient.deleteMany({
        where: { batchId: batch.id },
      });

      const batchIngredientsToInsert: any[] = [
        ...p.fermentables.map((f) => ({
          batchId: batch.id,
          name: f.name,
          category: f.category || 'MALTE',
          quantityUsed: f.amountKg,
          unit: 'KG',
          stage: 'MOSTURA',
          supplierName: f.manufacturer || 'Fornecedor Cadastrado',
          supplierLot: f.lot || 'LOTE-XML',
        })),
        ...p.hops.map((h) => ({
          batchId: batch.id,
          name: h.name,
          category: 'LUPULO',
          quantityUsed: h.amountGrams ? Math.round((h.amountGrams / 1000) * 1000) / 1000 : 0.1,
          unit: 'KG',
          stage: h.use === 'FIRST_WORT' ? 'FIRST_WORT' : h.use === 'WHIRLPOOL' ? 'WHIRLPOOL' : h.use === 'DRY_HOP' ? 'DRY_HOPPING' : 'FERVURA_60MIN',
          supplierName: h.manufacturer || 'Fornecedor Cadastrado',
          supplierLot: h.lot || 'LOTE-XML',
        })),
      ];

      if (p.yeast) {
        batchIngredientsToInsert.push({
          batchId: batch.id,
          name: p.yeast.name,
          category: 'LEVEDURA',
          quantityUsed: 1,
          unit: 'PACOTE',
          stage: 'FERMENTACAO',
          supplierName: p.yeast.manufacturer || 'Fornecedor Cadastrado',
          supplierLot: p.yeast.lot || 'LOTE-XML',
        });
      }

      (p.miscs || []).forEach((m) => {
        batchIngredientsToInsert.push({
          batchId: batch.id,
          name: m.name,
          category: 'ADJUNTO',
          quantityUsed: m.amount || 1,
          unit: m.unit || 'UN',
          stage: m.use === 'Mash' ? 'MOSTURA' : 'FERVURA_15MIN',
          supplierName: m.manufacturer || 'Fornecedor Cadastrado',
          supplierLot: m.lot || 'LOTE-XML',
        });
      });

      if (batchIngredientsToInsert.length > 0) {
        await prisma.batchIngredient.createMany({
          data: batchIngredientsToInsert,
        });
      }
    }

    // 3. ATUALIZAR METAS E DADOS DO LOTE (ProductionBatch)
    let customData: any = {};
    if (batch.customRecipeDataJson) {
      try {
        customData = typeof batch.customRecipeDataJson === 'string'
          ? JSON.parse(batch.customRecipeDataJson)
          : batch.customRecipeDataJson;
      } catch {}
    }
    customData.parsedBeerXml = p;
    customData.attachedXmlFileName = xmlName;
    customData.attachedXmlAt = new Date().toISOString();
    customData.targetFg = fg;

    const updatedBatch = await prisma.productionBatch.update({
      where: { id: batch.id },
      data: {
        measuredOg: batch.measuredOg || og,
        measuredFg: batch.measuredFg || fg,
        measuredAbv: batch.measuredAbv || abv,
        measuredIbu: ibu,
        measuredEbc: ebc,
        yeastStrain: p.yeast?.name || batch.yeastStrain,
        sensoryNotes: xmlNotes || batch.sensoryNotes,
        notes: batch.notes ? `${batch.notes}\n[BeerXML]: ${xmlNotes}` : xmlNotes,
        customRecipeDataJson: JSON.stringify(customData),
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
        ingredients: true,
        tank: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `BeerXML "${xmlName}" anexado com sucesso ao lote #${updatedBatch.batchNumber}!`,
      batch: updatedBatch,
      recipe: updatedBatch.recipe,
    });
  } catch (error: any) {
    console.error('Erro ao anexar BeerXML ao lote:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao processar BeerXML' }, { status: 500 });
  }
}
