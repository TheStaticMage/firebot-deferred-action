import { randomUUID } from 'crypto';
import { firebot, logger } from './main';

export type CancelReason = 'user' | 'conflict' | 'effect';

export interface DeferredActionMetadata extends Record<string, unknown> {
    effectId?: string;
    taskId: string;
    userComment?: string;
    taskGroup?: string;
    cancelReason?: CancelReason;
    scheduledTime?: number;
}

export interface DeferredTask {
    id: string;
    createdAt: number;
    scheduledTime: number;
    delayMs: number;
    userComment?: string;
    effectCount: number;
    triggerDescription: string;
    description: string;
    taskGroup?: string;
    effectId?: string;
    timerId: NodeJS.Timeout;
    onExecute: () => void | Promise<void>;
}

export interface TaskInfo {
    id: string;
    createdAt: number;
    scheduledTime: number;
    userComment?: string;
    effectCount: number;
    triggerDescription: string;
    description: string;
    taskGroup?: string;
    countdownSeconds: number;
}

class TaskManager {
    private tasks: Map<string, DeferredTask> = new Map<string, DeferredTask>();

    private removeTask(taskId: string): void {
        this.tasks.delete(taskId);
        const { frontendCommunicator } = firebot.modules;
        frontendCommunicator.send('deferred-action:task-removed', { id: taskId });
    }

    findTasksByGroup(groupName: string): DeferredTask[] {
        if (!groupName || !groupName.trim()) {
            return [];
        }
        const trimmedGroup = groupName.trim();
        return Array.from(this.tasks.values()).filter(task => task.taskGroup === trimmedGroup);
    }

    scheduleTask(
        delaySeconds: number,
        userComment: string | undefined,
        effectCount: number,
        triggerDescription: string,
        taskGroup: string | undefined,
        effectId: string | undefined,
        onExecute: () => void | Promise<void>
    ): string {
        const taskId = randomUUID();
        const delayMs = delaySeconds * 1000;
        const createdAt = Date.now();
        const scheduledTime = createdAt + delayMs;

        // Auto-generate description if no user comment
        const description = userComment || this.generateDescription(effectCount);

        const timerId = setTimeout(() => {
            this.executeStoredTask(taskId, 'timer');
        }, delayMs);

        const task: DeferredTask = {
            id: taskId,
            createdAt,
            scheduledTime,
            delayMs,
            userComment,
            effectCount,
            triggerDescription,
            description,
            taskGroup: taskGroup?.trim() || undefined,
            effectId,
            timerId,
            onExecute
        };

        this.tasks.set(taskId, task);
        logger.debug(`Scheduled deferred task ${taskId}: ${description} (${delaySeconds}s delay)`);

        // Trigger scheduled event
        const scheduledMetadata: DeferredActionMetadata = {
            effectId,
            taskId,
            userComment,
            taskGroup: taskGroup?.trim(),
            scheduledTime
        };
        firebot.modules.eventManager.triggerEvent('deferred-action', 'deferred-action-scheduled', scheduledMetadata);

        // Emit IPC event for UI refresh
        const { frontendCommunicator } = firebot.modules;
        frontendCommunicator.send('deferred-action:task-added', {
            id: taskId,
            createdAt,
            scheduledTime,
            userComment,
            description,
            effectCount,
            triggerDescription,
            taskGroup: task.taskGroup,
            countdownSeconds: delaySeconds
        });

        return taskId;
    }

    executeTask(taskId: string): boolean {
        return this.executeStoredTask(taskId, 'immediate');
    }

    cancelTask(taskId: string, cancelReason: CancelReason = 'user'): boolean {
        const task = this.tasks.get(taskId);
        if (!task) {
            logger.warn(`Attempted to cancel non-existent task ${taskId}`);
            return false;
        }

        clearTimeout(task.timerId);
        this.removeTask(taskId);
        logger.debug(`Cancelled deferred task ${taskId}: ${task.description} (reason: ${cancelReason})`);

        // Trigger canceled event
        const metadata: DeferredActionMetadata = {
            effectId: task.effectId,
            taskId: task.id,
            userComment: task.userComment,
            taskGroup: task.taskGroup,
            cancelReason
        };
        firebot.modules.eventManager.triggerEvent('deferred-action', 'deferred-action-canceled', metadata);

        return true;
    }

    private executeStoredTask(taskId: string, source: 'timer' | 'immediate'): boolean {
        const task = this.tasks.get(taskId);
        if (!task) {
            logger.warn(`Attempted to execute non-existent task ${taskId}`);
            return false;
        }

        if (source === 'immediate') {
            clearTimeout(task.timerId);
        }

        this.removeTask(taskId);
        const executionType = source === 'immediate' ? 'immediately' : 'after delay';
        logger.debug(`Executing deferred task ${taskId} ${executionType}: ${task.description}`);

        try {
            const metadata: DeferredActionMetadata = {
                effectId: task.effectId,
                taskId,
                userComment: task.userComment,
                taskGroup: task.taskGroup
            };
            firebot.modules.eventManager.triggerEvent('deferred-action', 'deferred-action-executed', metadata);

            const execution = task.onExecute();
            if (execution instanceof Promise) {
                execution.catch((error) => {
                    logger.error(`Error executing deferred task ${taskId}: ${String(error)}`);
                });
            }

            return true;
        } catch (error) {
            logger.error(`Error executing deferred task ${taskId}: ${String(error)}`);
            return false;
        }
    }

    cancelAllTasks(): number {
        const taskCount = this.tasks.size;
        if (taskCount === 0) {
            return 0;
        }

        for (const task of this.tasks.values()) {
            clearTimeout(task.timerId);
        }
        this.tasks.clear();

        const { frontendCommunicator } = firebot.modules;
        frontendCommunicator.send('deferred-action:all-tasks-removed', { count: taskCount });
        logger.debug(`Cancelled all deferred tasks (${taskCount})`);

        return taskCount;
    }

    getTasks(): TaskInfo[] {
        const now = Date.now();
        const taskList = Array.from(this.tasks.values()).map(task => ({
            id: task.id,
            createdAt: task.createdAt,
            scheduledTime: task.scheduledTime,
            userComment: task.userComment,
            effectCount: task.effectCount,
            triggerDescription: task.triggerDescription,
            description: task.description,
            taskGroup: task.taskGroup,
            countdownSeconds: Math.max(0, Math.ceil((task.scheduledTime - now) / 1000))
        }));

        // Sort by scheduled time (earliest first)
        return taskList.sort((a, b) => a.scheduledTime - b.scheduledTime);
    }

    cleanup(): void {
        logger.debug(`Cleaning up ${this.tasks.size} deferred tasks`);
        for (const task of this.tasks.values()) {
            clearTimeout(task.timerId);
        }
        this.tasks.clear();
    }

    private generateDescription(effectCount: number): string {
        if (effectCount === 1) {
            return 'Run 1 effect';
        }
        return `Run ${effectCount} effects`;
    }
}

export default TaskManager;
