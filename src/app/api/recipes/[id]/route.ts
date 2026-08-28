import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const recipe = await prisma.beerRecipe.findUnique({
      where: { id: params.id },
      include: {
        batches: {
          orderBy: { brewDate: 'desc' },
        },
      },
    });

    if (!recipe) return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar receita' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.beerRecipe.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });

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
      pricingModel,
      profitMarginPercent,
      styleCategory,
    } = body;

    const cost = costPerLiter !== undefined ? parseFloat(costPerLiter) : existing.costPerLiter || 0;
    const margin = profitMarginPercent !== undefined ? parseFloat(profitMarginPercent) : existing.profitMarginPercent || 50.0;
    const model = pricingModel || existing.pricingModel || 'MANUAL';

    let calculatedSalePrice = salePricePerLiter !== undefined ? parseFloat(salePricePerLiter) : existing.salePricePerLiter || 18.0;

    if (model === 'AT_COST') {
      calculatedSalePrice = cost > 0 ? cost : calculatedSalePrice;
    } else if (model === 'MARKUP' && cost > 0) {
      calculatedSalePrice = cost * (1 + margin / 100);
    }

    const updated = await prisma.beerRecipe.update({
      where: { id: params.id },
      data: {
        name: name ?? existing.name,
        style: style ?? existing.style,
        og: og !== undefined ? (og ? parseFloat(og) : null) : existing.og,
        fg: fg !== undefined ? (fg ? parseFloat(fg) : null) : existing.fg,
        abv: abv !== undefined ? (abv ? parseFloat(abv) : null) : existing.abv,
        ibu: ibu !== undefined ? (ibu ? parseInt(ibu, 10) : null) : existing.ibu,
        ebc: ebc !== undefined ? (ebc ? parseFloat(ebc) : null) : existing.ebc,
        description: description !== undefined ? description : existing.description,
        costPerLiter: cost,
        salePricePerLiter: calculatedSalePrice,
        suggestedPricePerLiter: calculatedSalePrice,
        pricingModel: model,
        profitMarginPercent: margin,
        styleCategory: styleCategory ?? existing.styleCategory,
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'RECIPE_UPDATE',
        description: `Atualizada receita ${updated.name} - Preço Venda: R$ ${updated.salePricePerLiter?.toFixed(2)}/L (Custo: R$ ${updated.costPerLiter?.toFixed(2)}/L)`,
        entityType: 'BeerRecipe',
        entityId: updated.id,
        previousData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Recipe update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar receita' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.beerRecipe.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });

    await prisma.beerRecipe.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir receita' }, { status: 500 });
  }
}
