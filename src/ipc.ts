import TaskManager from './task-manager';
import { firebot, logger } from './main';

export function registerFrontendCommunicatorHandlers(
    taskManager: TaskManager
): void {
    const { frontendCommunicator } = firebot.modules;

    // Handler to fetch all pending tasks sorted by execution time
    frontendCommunicator.onAsync('deferred-action:get-tasks', async () => {
        try {
            const tasks = taskManager.getTasks();
            return {
                success: true,
                tasks
            };
        } catch (error) {
            logger.error(`Error fetching deferred tasks: ${String(error)}`);
            return {
                success: false,
                error: String(error),
                tasks: []
            };
        }
    });

    // Handler to delete a task by ID
    frontendCommunicator.onAsync('deferred-action:delete-task', async (taskId: string) => {
        try {
            const cancelled = taskManager.cancelTask(taskId, 'user');
            return {
                success: cancelled,
                taskId
            };
        } catch (error) {
            logger.error(`Error deleting deferred task ${taskId}: ${String(error)}`);
            return {
                success: false,
                error: String(error),
                taskId
            };
        }
    });

    // Handler to delete all tasks
    frontendCommunicator.onAsync('deferred-action:delete-all-tasks', async () => {
        try {
            const cancelledCount = taskManager.cancelAllTasks();
            return {
                success: true,
                cancelledCount
            };
        } catch (error) {
            logger.error(`Error deleting all deferred tasks: ${String(error)}`);
            return {
                success: false,
                error: String(error),
                cancelledCount: 0
            };
        }
    });

    // Handler to execute a task immediately
    frontendCommunicator.onAsync('deferred-action:execute-task', async (taskId: string) => {
        try {
            const executed = taskManager.executeTask(taskId);

            return {
                success: executed,
                error: executed ? undefined : 'Task not found',
                taskId
            };
        } catch (error) {
            logger.error(`Error executing deferred task ${taskId}: ${String(error)}`);
            return {
                success: false,
                error: String(error),
                taskId
            };
        }
    });

    logger.debug('Registered frontend communicator handlers for deferred actions');
}
