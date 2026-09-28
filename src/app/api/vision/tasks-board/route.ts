import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autenticado ou cervejaria não identificada' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageBase64, apiKey: customApiKey } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada para análise.' }, { status: 400 });
    }

    // Resolve chave de API (fornecida pelo usuário na tela ou salva no .env)
    const geminiKey =
      customApiKey ||
      req.headers.get('x-gemini-key') ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const openaiKey =
      !geminiKey ? (process.env.OPENAI_API_KEY || req.headers.get('x-openai-key')) : null;

    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'Chave de IA não configurada. Por favor, insira sua chave gratuita do Google Gemini (ou configure GEMINI_API_KEY).',
        },
        { status: 400 }
      );
    }

    // 1. Busca os tanques e lotes ativos da cervejaria para alimentar o contexto da IA
    const [tanks, activeBatches] = await Promise.all([
      prisma.tank.findMany({
        where: { breweryId: session.breweryId },
        select: { id: true, name: true, type: true, capacityLiters: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.productionBatch.findMany({
        where: {
          breweryId: session.breweryId,
          status: { notIn: ['FINALIZADO', 'CANCELADO'] },
        },
        include: {
          tank: true,
          recipe: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Prepara a lista de contexto para a IA
    const todayStr = getLocalDateString();
    const breweryContext = {
      today: todayStr,
      tanks: tanks.map((t) => ({
        tankId: t.id,
        name: t.name,
        type: t.type,
        capacityLiters: t.capacityLiters,
        status: t.status,
      })),
      activeBatches: activeBatches.map((b) => {
        let existingTasks: any[] = [];
        try {
          if (b.tankTasksJson) {
            const p = JSON.parse(b.tankTasksJson);
            if (Array.isArray(p)) existingTasks = p;
          }
        } catch {}

        return {
          batchId: b.id,
          batchNumber: b.batchNumber,
          recipeName: b.recipe?.name || b.commercialDenomination || 'Cerveja',
          style: b.recipe?.style || '',
          tankId: b.tankId,
          tankName: b.tank?.name || 'Sem tanque',
          status: b.status,
          existingTasks: existingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type || 'OTHER',
            dueDate: t.dueDate,
            completed: !!t.completed,
          })),
        };
      }),
    };

    // Extrai dados limpos do Base64
    let mimeType = 'image/jpeg';
    let base64Clean = imageBase64;
    const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Clean = match[2];
    }

    const systemPrompt = `
Você é o assistente inteligente de visão do sistema PintTech Brewery OS, especializado em operações de cervejaria artesanal.
Sua missão é analisar uma foto de um QUADRO BRANCO FÍSICO (ou quadro de tarefas/produção da fábrica) e transcrever as tarefas da adega.

ESTE É O CONTEXTO ATUAL DA CERVEJARIA NO PINTTECH (Hoje: ${todayStr}):
${JSON.stringify(breweryContext, null, 2)}

INSTRUÇÕES DE ANÁLISE:
1. Examine a caligrafia, tabelas, colunas e anotações escritas no quadro.
2. Identifique os tanques mencionados (ex: "Tq 01", "Tanque 2", "TQ03", "T04", "Maturador 1", etc.) e correlacione com a lista de tanques e lotes ativos da cervejaria.
3. Tipos de tarefas comuns em cervejaria:
   - PURGE: Purga de levedura, descarte de fundo, descarte de trub.
   - DRY_HOPPING: Dry hopping, DH, adição de lúpulo no tanque.
   - MEASUREMENT: Medir densidade, medir FG, medir SG, Brix, pH, medir atenuação.
   - ADDITIVE: Clarificante, Biofine, gelatina, antioxidante, taninos.
   - TEMPERATURE: Baixar temperatura, crash cooling, subir temp (diacetil), controle térmico.
   - TRANSFER: Transferência, puxar para BBT, trasfega.
   - OTHER: Qualquer outra anotação de processo.
4. Identifique o STATUS DE CONCLUSÃO no quadro:
   - SE A LINHA ESTÁ RISCADA COM TRAÇO, com um "X", um check "V", carimbo "OK", "feito", "pronto", "concluído":
     -> Adicione a "tasksToComplete".
     -> Se bater com uma tarefa existente no lote (em existingTasks), retorne o "taskId" exato correspondente! Se não existir tarefa prévia com esse nome mas o quadro diz que foi feita, inclua o título e tankId.
   - SE É UMA TAREFA PENDENTE / NOVA (anotada no quadro para fazer hoje ou em dias futuros):
     -> Adicione a "tasksToCreate" com batchId correspondente (ou tankId), título claro, tipo de processo, dueDate estimada (formato YYYY-MM-DD, padrão hoje ou a data indicada no quadro), amount/unit se houver (ex: 2kg, 0°C).
5. Se houver anotações gerais ou avisos importantes no quadro, inclua em "rawObservations".

RETORNE ESTRITAMENTE UM JSON COM O SEGUINTE FORMATO (sem markdown envolvente):
{
  "tasksToComplete": [
    {
      "batchId": "ID do lote",
      "taskId": "ID da tarefa existente se houver correspondência ou vazio",
      "tankName": "Nome do Tanque (ex: Tq 01)",
      "batchNumber": "Número do lote",
      "recipeName": "Nome da receita",
      "title": "Título da tarefa",
      "reason": "Motivo da conclusão (ex: Riscada com traço no quadro, marcada com OK)"
    }
  ],
  "tasksToCreate": [
    {
      "batchId": "ID do lote que está no tanque",
      "tankId": "ID do tanque se lote não encontrado",
      "tankName": "Nome do Tanque",
      "batchNumber": "Número do lote",
      "recipeName": "Nome da receita",
      "title": "Título descritivo da tarefa",
      "type": "PURGE" | "DRY_HOPPING" | "MEASUREMENT" | "ADDITIVE" | "TEMPERATURE" | "TRANSFER" | "OTHER",
      "dueDate": "YYYY-MM-DD",
      "amount": null,
      "unit": null,
      "notes": "Observações se houver"
    }
  ],
  "rawObservations": "Resumo objetivo do que foi visto no quadro"
}
`;

    // Processamento via Gemini API
    if (geminiKey) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Clean,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const geminiRes = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error('Erro na API Gemini:', errorText);
        return NextResponse.json(
          {
            error: 'FALHA_GEMINI',
            message: `Erro ao comunicar com a IA do Gemini: ${geminiRes.status} ${geminiRes.statusText}. Verifique se a chave de API é válida.`,
          },
          { status: 502 }
        );
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return NextResponse.json(
          { error: 'RESPOSTA_VAZIA', message: 'A IA não retornou dados para a imagem enviada.' },
          { status: 500 }
        );
      }

      let parsedResult: any = {};
      try {
        parsedResult = JSON.parse(rawText);
      } catch (err) {
        // Tenta extrair json caso venha encapsulado
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Falha ao interpretar resposta estruturada da IA');
        }
      }

      return NextResponse.json({
        success: true,
        tasksToComplete: parsedResult.tasksToComplete || [],
        tasksToCreate: parsedResult.tasksToCreate || [],
        rawObservations: parsedResult.rawObservations || '',
        activeBatchesCount: activeBatches.length,
      });
    }

    // Processamento alternativo via OpenAI Vision (se configurado)
    if (openaiKey) {
      const openAiEndpoint = 'https://api.openai.com/v1/chat/completions';
      const openAiPayload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em ler anotações de quadros de cervejaria artesanal e retornar estritamente JSON.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Clean}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      };

      const openAiRes = await fetch(openAiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(openAiPayload),
      });

      if (!openAiRes.ok) {
        const errorText = await openAiRes.text();
        console.error('Erro na API OpenAI:', errorText);
        return NextResponse.json(
          { error: 'FALHA_OPENAI', message: `Erro na OpenAI: ${openAiRes.statusText}` },
          { status: 502 }
        );
      }

      const openAiData = await openAiRes.json();
      const content = openAiData?.choices?.[0]?.message?.content;
      const parsedResult = JSON.parse(content || '{}');

      return NextResponse.json({
        success: true,
        tasksToComplete: parsedResult.tasksToComplete || [],
        tasksToCreate: parsedResult.tasksToCreate || [],
        rawObservations: parsedResult.rawObservations || '',
        activeBatchesCount: activeBatches.length,
      });
    }

    return NextResponse.json({ error: 'Nenhum provedor de IA disponível' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no processador de quadro de tarefas:', error);
    return NextResponse.json(
      { error: 'ERRO_INTERNO', message: error.message || 'Erro inesperado ao processar foto do quadro' },
      { status: 500 }
    );
  }
}
