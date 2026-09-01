import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { parseBeerXml } from '@/lib/brewing/beerXml';
import { calculateColor, calculateOg, calculateFg, calculateAbv, calculateIbu } from '@/lib/brewing/calculations';
import { findBjcpStyle } from '@/lib/brewing/bjcpStyles';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { xmlContent } = await req.json();
    if (!xmlContent || typeof xmlContent !== 'string') {
      return NextResponse.json({ error: 'Conteúdo BeerXML não fornecido' }, { status: 400 });
    }

    const parsedRecipes = parseBeerXml(xmlContent);
    if (parsedRecipes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma receita válida encontrada no arquivo XML' }, { status: 400 });
    }

    const createdRecipes = [];

    for (const p of parsedRecipes) {
      // Recalcula ou ajusta dados
      const batchSize = p.batchYieldLiters || 500;
      const efficiency = p.efficiencyPercent || 75;

      const og = p.og || calculateOg(p.fermentables, batchSize, efficiency);
      const fg = p.fg || calculateFg(og, p.yeast?.attenuationPercent || 75);
      const abv = p.abv || calculateAbv(og, fg);
      const ibuObj = calculateIbu(p.hops, og, batchSize);
      const ibu = p.ibu !== undefined ? p.ibu : ibuObj.totalIbu;
      const colorObj = calculateColor(p.fermentables, batchSize);
      const ebc = p.ebc || colorObj.ebc;

      const bjcpMatch = findBjcpStyle(p.style);

      // Prepara lista de ingredientes para inserção
      const ingredientsData = [
        ...p.fermentables.map((f) => ({
          name: f.name,
          category: f.category || 'MALTE',
          amount: f.amountKg,
          unit: 'KG',
          stage: 'MOSTURA',
          costPerUnit: 0,
          notes: f.potentialYieldPercent ? `Rendimento: ${f.potentialYieldPercent}% | Cor: ${f.colorEbc} EBC` : null,
        })),
        ...p.hops.map((h) => ({
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
        ingredientsData.push({
          name: p.yeast.name,
          category: 'LEVEDURA',
          amount: 1,
          unit: 'PACOTE',
          stage: 'FERMENTACAO',
          costPerUnit: 0,
          notes: `Atenuação: ${p.yeast.attenuationPercent}%`,
        });
      }

      const recipe = await prisma.beerRecipe.create({
        data: {
          breweryId: session.breweryId,
          name: p.name.trim(),
          style: p.style.trim(),
          og,
          fg,
          abv,
          ibu,
          ebc,
          batchYieldLiters: batchSize,
          boilTimeMinutes: p.boilTimeMinutes || 60,
          efficiencyPercent: efficiency,
          description: p.notes || `Importada via BeerXML (Brewfather / BeerSmith)`,
          bjcpStyleCode: bjcpMatch?.code || null,
          mashScheduleJson: p.mashSteps.length > 0 ? JSON.stringify(p.mashSteps) : null,
          recipeDataJson: JSON.stringify({
            fermentables: p.fermentables,
            hops: p.hops,
            yeast: p.yeast,
            mashSteps: p.mashSteps,
          }),
          ingredients: {
            create: ingredientsData,
          },
        },
        include: {
          ingredients: true,
        },
      });

      createdRecipes.push(recipe);
    }

    return NextResponse.json({
      success: true,
      count: createdRecipes.length,
      recipes: createdRecipes,
    });
  } catch (error: any) {
    console.error('Error importing BeerXML:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar arquivo BeerXML' }, { status: 500 });
  }
}
