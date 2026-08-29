import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const where: any = {};
    if (session.role !== 'SUPER_ADMIN' || session.breweryId) {
      if (session.breweryId) where.breweryId = session.breweryId;
    }

    const recipes = await prisma.beerRecipe.findMany({
      where,
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              include: { supplier: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { batches: true, ingredients: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      style,
      og,
      fg,
      abv,
      ibu,
      ebc,
      description,
      costPerLiter,
      salePricePerLiter,
      suggestedPricePerLiter,
      pricingModel,
      profitMarginPercent,
      styleCategory,
      ingredients,
    } = body;

    if (!name || !style) {
      return NextResponse.json({ error: 'Nome e estilo da cerveja são obrigatórios' }, { status: 400 });
    }

    const cost = costPerLiter !== undefined ? parseFloat(costPerLiter) : 0;
    const margin = profitMarginPercent !== undefined ? parseFloat(profitMarginPercent) : 50.0;
    const model = pricingModel || 'MANUAL';

    let calculatedSalePrice = salePricePerLiter !== undefined
      ? parseFloat(salePricePerLiter)
      : suggestedPricePerLiter !== undefined
      ? parseFloat(suggestedPricePerLiter)
      : 18.0;

    if (model === 'AT_COST') {
      calculatedSalePrice = cost > 0 ? cost : calculatedSalePrice;
    } else if (model === 'MARKUP' && cost > 0) {
      calculatedSalePrice = cost * (1 + margin / 100);
    }

    const recipe = await prisma.beerRecipe.create({
      data: {
        breweryId: session.breweryId,
        name: name.trim(),
        style: style.trim(),
        og: og ? parseFloat(og) : null,
        fg: fg ? parseFloat(fg) : null,
        abv: abv ? parseFloat(abv) : null,
        ibu: ibu ? parseInt(ibu, 10) : null,
        ebc: ebc ? parseFloat(ebc) : null,
        description: description?.trim() || null,
        costPerLiter: cost,
        salePricePerLiter: calculatedSalePrice,
        suggestedPricePerLiter: calculatedSalePrice,
        pricingModel: model,
        profitMarginPercent: margin,
        styleCategory: styleCategory || 'STANDARD',
        ingredients: Array.isArray(ingredients) && ingredients.length > 0
          ? {
              create: ingredients.map((ing: any) => ({
                inventoryItemId: ing.inventoryItemId || null,
                name: ing.name?.trim() || 'Insumo',
                category: ing.category || 'MALTE',
                amount: parseFloat(ing.amount) || 0,
                unit: (ing.unit || 'KG').toUpperCase(),
                stage: ing.stage || 'MOSTURA',
                costPerUnit: ing.costPerUnit ? parseFloat(ing.costPerUnit) : 0,
                notes: ing.notes?.trim() || null,
              })),
            }
          : undefined,
      },
      include: {
        ingredients: {
          include: { inventoryItem: { include: { supplier: true } } },
        },
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'RECIPE_CREATE',
        description: `Criada receita ${recipe.name} (${recipe.style}) com ${recipe.ingredients.length} insumos cadastrados`,
        entityType: 'BeerRecipe',
        entityId: recipe.id,
        previousData: null,
        newData: JSON.stringify(recipe),
      },
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar receita' }, { status: 500 });
  }
}
