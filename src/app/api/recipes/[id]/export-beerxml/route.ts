import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { exportToBeerXml } from '@/lib/brewing/beerXml';
import { FermentableItem, HopItem, YeastItem, MashStep } from '@/lib/brewing/calculations';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const recipe = await prisma.beerRecipe.findUnique({
      where: { id: params.id },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    }

    let fermentables: FermentableItem[] = [];
    let hops: HopItem[] = [];
    let yeast: YeastItem | undefined = undefined;
    let mashSteps: MashStep[] = [];

    if (recipe.recipeDataJson) {
      try {
        const parsed = JSON.parse(recipe.recipeDataJson);
        fermentables = parsed.fermentables || [];
        hops = parsed.hops || [];
        yeast = parsed.yeast;
        mashSteps = parsed.mashSteps || [];
      } catch (e) {
        console.error('Error parsing recipeDataJson:', e);
      }
    }

    // Se recipeDataJson não tiver sido populado, sintetiza a partir de recipe.ingredients
    if (fermentables.length === 0 && hops.length === 0 && recipe.ingredients.length > 0) {
      for (const ing of recipe.ingredients) {
        if (ing.category === 'MALTE' || ing.category === 'ADJUNTO') {
          fermentables.push({
            name: ing.name,
            amountKg: ing.amount,
            colorEbc: 4.0,
            potentialYieldPercent: 80,
            category: ing.category === 'ADJUNTO' ? 'ADJUNCT' : 'GRAIN',
          });
        } else if (ing.category === 'LUPULO') {
          hops.push({
            name: ing.name,
            amountGrams: ing.unit === 'KG' ? ing.amount * 1000 : ing.amount,
            alphaAcidPercent: 10.0,
            timeMinutes: ing.stage?.includes('60') ? 60 : ing.stage?.includes('15') ? 15 : 10,
            use: ing.stage === 'FIRST_WORT' ? 'FIRST_WORT' : ing.stage === 'WHIRLPOOL' ? 'WHIRLPOOL' : ing.stage === 'DRY_HOPPING' ? 'DRY_HOP' : 'BOIL',
          });
        } else if (ing.category === 'LEVEDURA' && !yeast) {
          yeast = {
            name: ing.name,
            attenuationPercent: 78,
            form: 'DRY',
          };
        }
      }
    }

    const xml = exportToBeerXml({
      name: recipe.name,
      style: recipe.style,
      batchYieldLiters: recipe.batchYieldLiters || 500,
      boilTimeMinutes: recipe.boilTimeMinutes || 60,
      efficiencyPercent: recipe.efficiencyPercent || 75,
      og: recipe.og,
      fg: recipe.fg,
      abv: recipe.abv,
      ibu: recipe.ibu,
      ebc: recipe.ebc,
      description: recipe.description,
      fermentables,
      hops,
      yeast,
      mashSteps,
    });

    const sanitizedFilename = recipe.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}.xml"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting BeerXML:', error);
    return NextResponse.json({ error: 'Erro ao gerar arquivo BeerXML' }, { status: 500 });
  }
}
