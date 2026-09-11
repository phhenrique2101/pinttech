import { prisma } from '@/lib/prisma';
import { sendMessage, sendInlineKeyboard } from '../client';
import { formatDateShort } from '@/lib/utils';

export async function handleListTasks(chatId: string, user: any, specificBatchId?: string) {
  if (!user.breweryId) return;

  const batches = await prisma.productionBatch.findMany({
    where: {
      breweryId: user.breweryId,
      ...(specificBatchId ? { id: specificBatchId } : {}),
      status: { notIn: ['FINALIZADO', 'CANCELADO'] },
    },
    include: { recipe: true, tank: true },
  });

  const allPendingTasks: {
    batchId: string;
    batchNumber: string;
    recipeName: string;
    tankName: string;
    task: any;
  }[] = [];

  for (const batch of batches) {
    if (batch.tankTasksJson) {
      try {
        const parsed = JSON.parse(batch.tankTasksJson);
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            if (!t.completed) {
              allPendingTasks.push({
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                recipeName: batch.recipe?.name || 'Cerveja',
                tankName: batch.tank?.name || 'Tanque',
                task: t,
              });
            }
          }
        }
      } catch (e) {}
    }
  }

  // Ordena por data de vencimento
  allPendingTasks.sort((a, b) => (a.task.dueDate || '').localeCompare(b.task.dueDate || ''));

  if (allPendingTasks.length === 0) {
    await sendInlineKeyboard(
      chatId,
      '🎉 <b>Nenhuma tarefa pendente na adega no momento!</b>\n\nTodas as purgas, dry hoppings e medições foram realizadas.',
      [
        [{ text: '🏺 Ver Tanques', callback_data: 'nav:tanks' }],
        [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
      ]
    );
    return;
  }

  let text = `📋 <b>Tarefas da Adega (${allPendingTasks.length} pendentes):</b>\n\n`;
  const buttons: any[][] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (const item of allPendingTasks) {
    const isToday = item.task.dueDate === todayStr;
    const isLate = (item.task.dueDate || '') < todayStr;
    const icon = isLate ? '🔴' : isToday ? '🟡' : '⚪';

    const dueFormatted = item.task.dueDate ? formatDateShort(item.task.dueDate) : 'Sem data';

    text += `${icon} <b>${item.task.title}</b>\n` +
            `   • Tanque: <b>${item.tankName}</b> (${item.recipeName} #${item.batchNumber})\n` +
            `   • Data: <b>${dueFormatted}</b> ${isToday ? '<i>(HOJE!)</i>' : isLate ? '<i>(Atrasada!)</i>' : ''}\n` +
            (item.task.amount ? `   • Quantidade: ${item.task.amount} ${item.task.unit || 'KG'}\n` : '') +
            (item.task.notes ? `   • Obs: <i>${item.task.notes}</i>\n` : '') +
            `\n`;

    buttons.push([
      {
        text: `✅ Concluir: ${item.task.title.substring(0, 24)} (${item.tankName})`,
        callback_data: `task:done:${item.batchId}:${item.task.id}`,
      },
    ]);
  }

  buttons.push([{ text: '🔙 Menu Principal', callback_data: 'nav:menu' }]);

  await sendInlineKeyboard(chatId, text, buttons);
}

export async function handleCompleteTask(
  chatId: string,
  user: any,
  batchId: string,
  taskId: string
) {
  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, breweryId: user.breweryId },
    include: { recipe: true, tank: true },
  });

  if (!batch || !batch.tankTasksJson) {
    await sendMessage(chatId, '❌ Lote ou tarefa não encontrada.');
    return;
  }

  let tasks: any[] = [];
  try {
    tasks = JSON.parse(batch.tankTasksJson);
  } catch (e) {}

  let foundTitle = '';
  tasks = tasks.map((t) => {
    if (t.id === taskId) {
      foundTitle = t.title;
      return {
        ...t,
        completed: true,
        completedAt: new Date().toISOString(),
      };
    }
    return t;
  });

  await prisma.productionBatch.update({
    where: { id: batch.id },
    data: { tankTasksJson: JSON.stringify(tasks) },
  });

  await prisma.actionLog.create({
    data: {
      breweryId: user.breweryId,
      userId: user.id,
      userName: user.name,
      actionType: 'TELEGRAM_BATCH_TASK_COMPLETE',
      description: `Tarefa concluída via Telegram: "${foundTitle}" no tanque ${batch.tank?.name || 'Adega'} (${batch.recipe?.name})`,
      entityType: 'ProductionBatch',
      entityId: batch.id,
    },
  });

  await sendInlineKeyboard(
    chatId,
    `✅ <b>Tarefa Concluída com Sucesso!</b>\n\n` +
    `• Tarefa: <b>${foundTitle}</b>\n` +
    `• Tanque: <b>${batch.tank?.name || 'Tanque'}</b> (${batch.recipe?.name})\n` +
    `• Concluída por: <b>${user.name}</b>`,
    [
      [{ text: '📋 Ver Tarefas Restantes', callback_data: 'nav:tasks' }],
      [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
    ]
  );
}
