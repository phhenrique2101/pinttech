import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { parseCurrencyInput } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const breweryId = session.breweryId;

    const recipes = await prisma.beerRecipe.findMany({
      where: { breweryId },
      include: {
        _count: {
          select: {
            batches: true,
            orderItems: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calcular dados da matriz
    const matrix = recipes.map((r) => {
      const cost = r.costPerLiter || 0;
      const margin = r.profitMarginPercent || 50;
      const model = r.pricingModel || 'MANUAL';
      const salePrice = r.salePricePerLiter || r.suggestedPricePerLiter || (cost > 0 ? cost * 1.5 : 18.0);

      let parsedExt: any = {};
      if (r.recipeDataJson) {
        try {
          parsedExt = JSON.parse(r.recipeDataJson);
        } catch {}
      }

      const costPlusFixedValue = parsedExt.costPlusFixedValue !== undefined ? Number(parsedExt.costPlusFixedValue) : 5.0;
      const roundingRule = parsedExt.roundingRule || 'NONE';
      const calculatedMarkupPrice = cost > 0 ? cost * (1 + margin / 100) : salePrice;

      return {
        id: r.id,
        name: r.name,
        style: r.style,
        abv: r.abv,
        ibu: r.ibu,
        costPerLiter: cost,
        salePricePerLiter: salePrice,
        suggestedPricePerLiter: r.suggestedPricePerLiter || salePrice,
        pricingModel: model,
        profitMarginPercent: margin,
        costPlusFixedValue,
        roundingRule,
        calculatedMarkupPrice: parseFloat(calculatedMarkupPrice.toFixed(2)),
        // Preços dos tamanhos padrão de barril
        keg20L: parseFloat((salePrice * 20).toFixed(2)),
        keg30L: parseFloat((salePrice * 30).toFixed(2)),
        keg50L: parseFloat((salePrice * 50).toFixed(2)),
        // Margem real em R$ e %
        grossMarginPerLiter: parseFloat((salePrice - cost).toFixed(2)),
        grossMarginPercent: cost > 0 ? parseFloat((((salePrice - cost) / salePrice) * 100).toFixed(1)) : 100,
        batchesCount: r._count.batches,
      };
    });

    return NextResponse.json(matrix);
  } catch (error: any) {
    console.error('Error fetching pricing matrix:', error);
    return NextResponse.json({ error: 'Erro ao buscar matriz de precificação' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'SALES', 'FINANCE'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada para alterar precificação' }, { status: 403 });
    }

    const breweryId = session.breweryId;
    const body = await req.json().catch(() => ({}));
    const { updates, action } = body;

    // Se a ação for "APPLY_AT_COST_ALL", ajusta todas as receitas para vender ao preço de custo
    if (action === 'APPLY_AT_COST_ALL') {
      const allRecipes = await prisma.beerRecipe.findMany({
        where: { breweryId },
      });

      for (const rec of allRecipes) {
        const cost = rec.costPerLiter || 0;
        if (cost > 0) {
          await prisma.beerRecipe.update({
            where: { id: rec.id },
            data: {
              pricingModel: 'AT_COST',
              salePricePerLiter: cost,
              suggestedPricePerLiter: cost,
            },
          });
        }
      }

      await prisma.actionLog.create({
        data: {
          breweryId,
          userId: session.userId,
          userName: session.name,
          actionType: 'PRICING_MATRIX_BULK_UPDATE',
          description: 'Aplicação de Preço de Custo em todas as cervejas',
          entityType: 'BeerRecipe',
          entityId: 'ALL_RECIPES',
          canUndo: false,
          newData: JSON.stringify({ action: 'APPLY_AT_COST_ALL' }),
        },
      });

      return NextResponse.json({ success: true, message: 'Preço de custo aplicado a todas as receitas.' });
    }

    // Se for lista de atualizações manuais
    if (Array.isArray(updates)) {
      await prisma.$transaction(async (tx) => {
        for (const up of updates) {
          if (!up.id) continue;

          const cost = up.costPerLiter !== undefined ? parseCurrencyInput(up.costPerLiter) : undefined;
          const margin = up.profitMarginPercent !== undefined ? parseCurrencyInput(up.profitMarginPercent) : undefined;
          const fixedAddition = up.costPlusFixedValue !== undefined ? parseCurrencyInput(up.costPlusFixedValue) : undefined;
          const roundingRule = up.roundingRule || 'NONE';
          const model = up.pricingModel;

          let salePrice = up.salePricePerLiter !== undefined ? parseCurrencyInput(up.salePricePerLiter) : undefined;

          // Se salePrice não foi explicitamente enviado, calcula conforme o modelo
          if (salePrice === undefined) {
            if (model === 'AT_COST' && cost !== undefined && cost > 0) {
              salePrice = cost;
            } else if ((model === 'MARKUP' || model === 'PERCENT') && cost !== undefined && margin !== undefined && cost > 0) {
              salePrice = parseFloat((cost * (1 + margin / 100)).toFixed(2));
            } else if (model === 'COST_PLUS_FIXED' && cost !== undefined && fixedAddition !== undefined && cost > 0) {
              salePrice = parseFloat((cost + fixedAddition).toFixed(2));
            }
          }

          const existingRecipe = await tx.beerRecipe.findUnique({
            where: { id: up.id },
            select: { recipeDataJson: true },
          });

          let extData: any = {};
          if (existingRecipe?.recipeDataJson) {
            try {
              extData = JSON.parse(existingRecipe.recipeDataJson);
            } catch {}
          }
          if (fixedAddition !== undefined) extData.costPlusFixedValue = fixedAddition;
          if (roundingRule !== undefined) extData.roundingRule = roundingRule;

          const updateData: any = {
            recipeDataJson: JSON.stringify(extData),
          };
          if (cost !== undefined) updateData.costPerLiter = cost;
          if (margin !== undefined) updateData.profitMarginPercent = margin;
          if (model !== undefined) updateData.pricingModel = model;
          if (salePrice !== undefined) {
            updateData.salePricePerLiter = salePrice;
            updateData.suggestedPricePerLiter = salePrice;
          }

          await tx.beerRecipe.update({
            where: { id: up.id },
            data: updateData,
          });
        }
      });

      await prisma.actionLog.create({
        data: {
          breweryId,
          userId: session.userId,
          userName: session.name,
          actionType: 'PRICING_MATRIX_UPDATE',
          description: `Atualização da matriz de precificação de ${updates.length} cerveja(s)`,
          entityType: 'BeerRecipe',
          entityId: updates[0]?.id || 'MATRIX',
          canUndo: false,
          newData: JSON.stringify({ count: updates.length }),
        },
      });

      return NextResponse.json({ success: true, message: 'Matriz de preços atualizada com sucesso.' });
    }

    return NextResponse.json({ error: 'Nenhuma alteração enviada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating pricing matrix:', error);
    return NextResponse.json({ error: 'Erro ao salvar matriz de preços: ' + error.message }, { status: 500 });
  }
}
