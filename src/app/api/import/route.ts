import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, data, targetBreweryId } = body;

    // Determine target brewery
    let breweryId = session.breweryId;
    if (session.role === 'SUPER_ADMIN' && targetBreweryId) {
      breweryId = targetBreweryId;
    }

    if (!breweryId) {
      return NextResponse.json(
        { error: 'Cervejaria de destino não especificada.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado válido fornecido para importação.' },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Helper functions for cleaning / sanitizing data
    const cleanStr = (val: any) => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      return s.length > 0 ? s : null;
    };

    const cleanNumber = (val: any, defaultVal = 0) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
      const cleaned = String(val).replace('R$', '').replace(/\s+/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const cleanInt = (val: any, defaultVal = 50) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      if (typeof val === 'number') return Math.round(val);
      const digitsOnly = String(val).replace(/[^0-9]/g, '');
      const parsed = parseInt(digitsOnly, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    if (entityType === 'CLIENTS') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const name = cleanStr(row.name || row.tradeName);
        if (!name) {
          errors.push(`Linha ${i + 1}: Nome do cliente é obrigatório.`);
          continue;
        }

        const tradeName = cleanStr(row.tradeName || row.name);
        const document = cleanStr(row.document)?.replace(/[^0-9a-zA-Z]/g, '');
        const email = cleanStr(row.email);
        const phone = cleanStr(row.phone);
        const address = cleanStr(row.address);
        const number = cleanStr(row.number);
        const complement = cleanStr(row.complement);
        const neighborhood = cleanStr(row.neighborhood);
        const city = cleanStr(row.city);
        const state = cleanStr(row.state)?.toUpperCase();
        const zipCode = cleanStr(row.zipCode)?.replace(/[^0-9]/g, '');
        const creditLimit = cleanNumber(row.creditLimit, 0);
        const notes = cleanStr(row.notes);

        try {
          // Check if client already exists in this brewery by document or name
          let existing = null;
          if (document && document.length >= 8) {
            existing = await prisma.client.findFirst({
              where: { breweryId, document },
            });
          }
          if (!existing) {
            existing = await prisma.client.findFirst({
              where: { breweryId, name: { equals: name, mode: 'insensitive' } },
            });
          }

          if (existing) {
            await prisma.client.update({
              where: { id: existing.id },
              data: {
                tradeName: tradeName || existing.tradeName,
                document: document || existing.document,
                email: email || existing.email,
                phone: phone || existing.phone,
                address: address || existing.address,
                number: number || existing.number,
                complement: complement || existing.complement,
                neighborhood: neighborhood || existing.neighborhood,
                city: city || existing.city,
                state: state || existing.state,
                zipCode: zipCode || existing.zipCode,
                creditLimit: creditLimit > 0 ? creditLimit : existing.creditLimit,
                notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
              },
            });
            updatedCount++;
          } else {
            await prisma.client.create({
              data: {
                breweryId,
                name,
                tradeName: tradeName || name,
                document,
                email,
                phone,
                address,
                number,
                complement,
                neighborhood,
                city,
                state,
                zipCode,
                creditLimit: creditLimit > 0 ? creditLimit : null,
                notes,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 1} (${name}): ${err.message}`);
        }
      }
    } else if (entityType === 'KEGS') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const code = cleanStr(row.code)?.toUpperCase();
        if (!code) {
          errors.push(`Linha ${i + 1}: Código do barril é obrigatório.`);
          continue;
        }

        const capacity = cleanInt(row.capacity, 50);
        const kegType = cleanStr(row.kegType)?.toUpperCase() || 'INOX_EURO';
        const rawStatus = cleanStr(row.status)?.toUpperCase() || 'HIGIENIZADO';
        
        let status = 'HIGIENIZADO';
        if (rawStatus.includes('CHEIO') || rawStatus.includes('ENVASADO') || rawStatus.includes('ESTOQUE')) {
          status = 'EM_ESTOQUE';
        } else if (rawStatus.includes('CLIENTE') || rawStatus.includes('COMODATO')) {
          status = 'NO_CLIENTE';
        } else if (rawStatus.includes('SUJO') || rawStatus.includes('VAZIO')) {
          status = 'VAZIO_SUJO';
        } else if (rawStatus.includes('MANUT')) {
          status = 'MANUTENCAO';
        } else if (rawStatus.includes('INATIV')) {
          status = 'INATIVO';
        }

        const notes = cleanStr(row.notes);
        const currentBeerName = cleanStr(row.currentBeerName || row.beerName);
        const batchNumber = cleanStr(row.batchNumber || row.lote || row.batch);

        let currentVolumeLiters: number | null = null;
        if (row.currentVolumeLiters !== undefined && row.currentVolumeLiters !== null && row.currentVolumeLiters !== '') {
          currentVolumeLiters = cleanNumber(row.currentVolumeLiters, 0);
        } else if (status === 'EM_ESTOQUE' || status === 'ENVASADO' || currentBeerName) {
          currentVolumeLiters = capacity;
        } else {
          currentVolumeLiters = 0;
        }

        try {
          let currentBatchId: string | null = null;
          if (batchNumber) {
            let batch = await prisma.productionBatch.findUnique({
              where: { breweryId_batchNumber: { breweryId, batchNumber } },
            });

            if (!batch) {
              const recipeName = currentBeerName || 'Chopp Artesanal';
              let recipe = await prisma.beerRecipe.findFirst({
                where: { breweryId, name: { equals: recipeName, mode: 'insensitive' } },
              });

              if (!recipe) {
                recipe = await prisma.beerRecipe.create({
                  data: {
                    breweryId,
                    name: recipeName,
                    style: 'Estilo Artesanal',
                    suggestedPricePerLiter: 20.0,
                    costPerLiter: 4.5,
                  },
                });
              }

              batch = await prisma.productionBatch.create({
                data: {
                  breweryId,
                  recipeId: recipe.id,
                  batchNumber,
                  volumePlannedLiters: 1000,
                  volumeProducedLiters: 1000,
                  status: 'PRONTO_ENVASE',
                  notes: 'Importado via planilha de dados',
                },
              });
            }

            if (batch) {
              currentBatchId = batch.id;
            }
          }

          const existing = await prisma.keg.findUnique({
            where: { breweryId_code: { breweryId, code } },
          });

          if (existing) {
            await prisma.keg.update({
              where: { id: existing.id },
              data: {
                capacity: capacity > 0 ? capacity : existing.capacity,
                currentVolumeLiters: currentVolumeLiters !== null ? currentVolumeLiters : existing.currentVolumeLiters,
                kegType: kegType || existing.kegType,
                status: status || existing.status,
                currentBeerName: currentBeerName || existing.currentBeerName,
                currentBatchId: currentBatchId || existing.currentBatchId,
                notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
              },
            });
            updatedCount++;
          } else {
            await prisma.keg.create({
              data: {
                breweryId,
                code,
                capacity,
                currentVolumeLiters,
                kegType,
                status,
                currentBeerName,
                currentBatchId,
                notes,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 1} (${code}): ${err.message}`);
        }
      }
    } else if (entityType === 'EQUIPMENT') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const code = cleanStr(row.code)?.toUpperCase();
        const name = cleanStr(row.name);
        if (!code || !name) {
          errors.push(`Linha ${i + 1}: Código e Nome do equipamento são obrigatórios.`);
          continue;
        }

        const rawType = cleanStr(row.type)?.toUpperCase() || 'CHOPEIRA_ELETRICA';
        let type = 'CHOPEIRA_ELETRICA';
        if (rawType.includes('GELO')) type = 'CHOPEIRA_GELO';
        else if (rawType.includes('CILINDRO') || rawType.includes('CO2')) type = 'CILINDRO_CO2';
        else if (rawType.includes('EXTRA')) type = 'EXTRATORA';
        else if (rawType.includes('MANO')) type = 'MANOMETRO';
        else if (rawType.includes('OUTRO')) type = 'OUTRO';

        const rawStatus = cleanStr(row.status)?.toUpperCase() || 'DISPONIVEL';
        let status = 'DISPONIVEL';
        if (rawStatus.includes('USO') || rawStatus.includes('CLIENTE')) status = 'EM_USO_CLIENTE';
        else if (rawStatus.includes('TRANSIT')) status = 'EM_TRANSITO';
        else if (rawStatus.includes('MANUT')) status = 'MANUTENCAO';
        else if (rawStatus.includes('INATIV')) status = 'INATIVO';

        const serialNumber = cleanStr(row.serialNumber);
        const voltage = cleanStr(row.voltage);
        const notes = cleanStr(row.notes);

        try {
          const existing = await prisma.equipment.findUnique({
            where: { breweryId_code: { breweryId, code } },
          });

          if (existing) {
            await prisma.equipment.update({
              where: { id: existing.id },
              data: {
                name: name || existing.name,
                type: type || existing.type,
                status: status || existing.status,
                serialNumber: serialNumber || existing.serialNumber,
                voltage: voltage || existing.voltage,
                notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
              },
            });
            updatedCount++;
          } else {
            await prisma.equipment.create({
              data: {
                breweryId,
                code,
                name,
                type,
                status,
                serialNumber,
                voltage,
                notes,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 1} (${code}): ${err.message}`);
        }
      }
    } else if (entityType === 'RECIPES') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const name = cleanStr(row.name);
        if (!name) {
          errors.push(`Linha ${i + 1}: Nome da cerveja/estilo é obrigatório.`);
          continue;
        }

        const style = cleanStr(row.style) || 'Estilo Artesanal';
        const abv = cleanNumber(row.abv, 5.0);
        const ibu = cleanInt(row.ibu, 20);
        const costPerLiter = cleanNumber(row.costPerLiter, 4.5);
        const salePricePerLiter = cleanNumber(row.salePricePerLiter || row.price, 20.0);
        const description = cleanStr(row.description);

        try {
          const existing = await prisma.beerRecipe.findFirst({
            where: { breweryId, name: { equals: name, mode: 'insensitive' } },
          });

          if (existing) {
            await prisma.beerRecipe.update({
              where: { id: existing.id },
              data: {
                style: style || existing.style,
                abv: abv > 0 ? abv : existing.abv,
                ibu: ibu > 0 ? ibu : existing.ibu,
                costPerLiter: costPerLiter > 0 ? costPerLiter : existing.costPerLiter,
                salePricePerLiter: salePricePerLiter > 0 ? salePricePerLiter : existing.salePricePerLiter,
                suggestedPricePerLiter: salePricePerLiter > 0 ? salePricePerLiter : existing.suggestedPricePerLiter,
                description: description || existing.description,
              },
            });
            updatedCount++;
          } else {
            await prisma.beerRecipe.create({
              data: {
                breweryId,
                name,
                style,
                abv,
                ibu,
                costPerLiter,
                salePricePerLiter,
                suggestedPricePerLiter: salePricePerLiter,
                description,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 1} (${name}): ${err.message}`);
        }
      }
    } else if (entityType === 'TANKS') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const name = cleanStr(row.name);
        if (!name) {
          errors.push(`Linha ${i + 1}: Nome ou identificador do tanque é obrigatório.`);
          continue;
        }

        const capacityLiters = cleanNumber(row.capacityLiters || row.capacity, 1000);
        const rawType = cleanStr(row.type)?.toUpperCase() || 'FERMENTADOR_ISOTERMICO';
        let type = 'FERMENTADOR_ISOTERMICO';
        if (rawType.includes('MATUR')) type = 'MATURADOR';
        else if (rawType.includes('BBT') || rawType.includes('BRITE')) type = 'BBT_BRITE_TANK';
        else if (rawType.includes('PANELA') || rawType.includes('BRASSAGEM')) type = 'PANELA_BRASSAGEM';

        const notes = cleanStr(row.notes);

        try {
          const existing = await prisma.tank.findUnique({
            where: { breweryId_name: { breweryId, name } },
          });

          if (existing) {
            await prisma.tank.update({
              where: { id: existing.id },
              data: {
                capacityLiters: capacityLiters > 0 ? capacityLiters : existing.capacityLiters,
                type: type || existing.type,
                notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
              },
            });
            updatedCount++;
          } else {
            await prisma.tank.create({
              data: {
                breweryId,
                name,
                capacityLiters,
                type,
                notes,
              },
            });
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 1} (${name}): ${err.message}`);
        }
      }
    } else {
      return NextResponse.json(
        { error: `Tipo de entidade "${entityType}" não suportado.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      totalProcessed: data.length,
      createdCount,
      updatedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 20), // return first 20 errors if any
    });
  } catch (error: any) {
    console.error('Erro na importação de dados:', error);
    return NextResponse.json(
      { error: error.message || 'Falha interna ao processar importação.' },
      { status: 500 }
    );
  }
}
