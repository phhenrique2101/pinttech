import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, getSessionFromCookies } from '@/lib/auth';
import { DEFAULT_TASK_PRESETS, TaskShortcut } from '@/types/shortcuts';

export const dynamic = 'force-dynamic';

function sanitizeShortcut(item: any, index: number): TaskShortcut {
  return {
    id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `shortcut-${Date.now()}-${index}`,
    label: typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : '⚡ Nova Ação',
    type: typeof item?.type === 'string' && item.type.trim() ? item.type.trim() : 'OTHER',
    defaultTitle: typeof item?.defaultTitle === 'string' && item.defaultTitle.trim() ? item.defaultTitle.trim() : 'Tarefa Operacional',
    targetType: item?.targetType === 'FABRICA' ? 'FABRICA' : 'TANK',
    unit: typeof item?.unit === 'string' && item.unit.trim() ? item.unit.trim() : undefined,
    defaultAmount: typeof item?.defaultAmount === 'number' && !isNaN(item.defaultAmount)
      ? item.defaultAmount
      : typeof item?.defaultAmount === 'string' && !isNaN(parseFloat(item.defaultAmount))
      ? parseFloat(item.defaultAmount)
      : undefined,
    color: typeof item?.color === 'string' ? item.color.trim() : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBreweryId = searchParams.get('breweryId');

    const breweryId = session.role === 'SUPER_ADMIN' && requestedBreweryId ? requestedBreweryId : session.breweryId;

    if (!breweryId) {
      return NextResponse.json({ shortcuts: DEFAULT_TASK_PRESETS, isCustom: false });
    }

    const brewery = await prisma.brewery.findUnique({
      where: { id: breweryId },
      select: { id: true, taskShortcutsJson: true },
    });

    if (!brewery || !brewery.taskShortcutsJson) {
      return NextResponse.json({ shortcuts: DEFAULT_TASK_PRESETS, isCustom: false });
    }

    try {
      const parsed = JSON.parse(brewery.taskShortcutsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json({ shortcuts: parsed, isCustom: true });
      }
    } catch {
      // JSON corrompido ou inválido, retorna padrão seguro
    }

    return NextResponse.json({ shortcuts: DEFAULT_TASK_PRESETS, isCustom: false });
  } catch (error: any) {
    console.error('Erro ao carregar atalhos da cervejaria:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar atalhos', shortcuts: DEFAULT_TASK_PRESETS }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isAuthorized = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'BREWER';
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Apenas gestores ou cervejeiros podem alterar os atalhos da fábrica' }, { status: 403 });
    }

    const body = await req.json();
    const targetBreweryId = session.role === 'SUPER_ADMIN' && body.breweryId ? body.breweryId : session.breweryId;

    if (!targetBreweryId) {
      return NextResponse.json({ error: 'ID da cervejaria não informado' }, { status: 400 });
    }

    if (!Array.isArray(body.shortcuts)) {
      return NextResponse.json({ error: 'A lista de atalhos fornecida é inválida' }, { status: 400 });
    }

    const sanitizedShortcuts: TaskShortcut[] = body.shortcuts.map(sanitizeShortcut);
    const jsonString = JSON.stringify(sanitizedShortcuts);

    await prisma.brewery.update({
      where: { id: targetBreweryId },
      data: { taskShortcutsJson: jsonString },
    });

    return NextResponse.json({
      success: true,
      message: 'Atalhos atualizados com sucesso!',
      shortcuts: sanitizedShortcuts,
      isCustom: true,
    });
  } catch (error: any) {
    console.error('Erro ao salvar atalhos da cervejaria:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar atalhos' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isAuthorized = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'BREWER';
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Apenas gestores ou cervejeiros podem restaurar os atalhos da fábrica' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBreweryId = searchParams.get('breweryId');
    const targetBreweryId = session.role === 'SUPER_ADMIN' && requestedBreweryId ? requestedBreweryId : session.breweryId;

    if (!targetBreweryId) {
      return NextResponse.json({ error: 'ID da cervejaria não informado' }, { status: 400 });
    }

    await prisma.brewery.update({
      where: { id: targetBreweryId },
      data: { taskShortcutsJson: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Atalhos restaurados para o padrão do sistema!',
      shortcuts: DEFAULT_TASK_PRESETS,
      isCustom: false,
    });
  } catch (error: any) {
    console.error('Erro ao restaurar atalhos da cervejaria:', error);
    return NextResponse.json({ error: 'Erro interno ao restaurar atalhos' }, { status: 500 });
  }
}
