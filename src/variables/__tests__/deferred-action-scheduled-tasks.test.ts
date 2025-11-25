import TaskManager from '../../task-manager';
import { createDeferredActionScheduledTasks } from '../deferred-action-scheduled-tasks';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            effectRunner: {
                processEffects: jest.fn()
            },
            eventManager: {
                triggerEvent: jest.fn()
            },
            frontendCommunicator: {
                send: jest.fn()
            }
        }
    },
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('crypto', () => ({
    randomUUID: (() => {
        let counter = 1;
        return jest.fn(() => `test-uuid-${counter++}`);
    })()
}));

describe('deferredActionScheduledTasks evaluator', () => {
    it('returns the number of scheduled tasks', async () => {
        jest.useFakeTimers();
        const taskManager = new TaskManager();
        const variable = createDeferredActionScheduledTasks(taskManager);

        const onExecute = jest.fn();

        taskManager.scheduleTask(10, 'Task one', 1, 'Test trigger', undefined, 'effect-1', onExecute);
        taskManager.scheduleTask(20, 'Task two', 1, 'Test trigger', undefined, 'effect-2', onExecute);

        const result = await variable.evaluator({} as any);

        expect(result).toBe(2);

        taskManager.cleanup();
        jest.useRealTimers();
    });
});
