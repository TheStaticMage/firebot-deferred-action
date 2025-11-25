import TaskManager from '../task-manager';

jest.mock('../main', () => ({
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
            },
            effectManager: {
                registerEffect: jest.fn()
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
    randomUUID: jest.fn(() => 'test-task-id')
}));

const MOCK_NOW = 1234567890000;

describe('TaskManager.executeTask', () => {
    let taskManager: TaskManager;
    let mockFirebot: any;
    let mockLogger: any;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(MOCK_NOW);
        jest.clearAllMocks();

        const { firebot, logger } = require('../main');
        mockFirebot = firebot;
        mockLogger = logger;

        taskManager = new TaskManager();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('executes the stored callback immediately and does not fire the timer again', () => {
        const onExecute = jest.fn();

        const taskId = taskManager.scheduleTask(
            5,
            'Immediate run',
            1,
            'Test trigger',
            undefined,
            'effect-123',
            onExecute
        );

        const result = taskManager.executeTask(taskId);

        expect(result).toBe(true);
        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-executed',
            expect.objectContaining({
                effectId: 'effect-123',
                taskId,
                userComment: 'Immediate run'
            })
        );
        expect(onExecute).toHaveBeenCalledTimes(1);
        expect(taskManager.getTasks()).toHaveLength(0);

        jest.advanceTimersByTime(5000);
        expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('returns false and warns when the task is missing', () => {
        const result = taskManager.executeTask('missing-task');

        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to execute non-existent task missing-task');
        expect(mockFirebot.modules.eventManager.triggerEvent).not.toHaveBeenCalled();
    });
});
