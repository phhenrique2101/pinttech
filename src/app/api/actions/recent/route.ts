import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json(null);

    const lastAction = await prisma.actionLog.findFirst({
      where: {
        breweryId: session.breweryId,
        undone: false,
        canUndo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(lastAction);
  } catch (error) {
    return NextResponse.json(null);
  }
}
