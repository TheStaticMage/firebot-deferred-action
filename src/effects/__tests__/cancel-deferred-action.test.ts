import TaskManager from '../../task-manager';

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
    randomUUID: jest.fn(() => 'test-uuid-123')
}));

const MOCK_NOW = 1234567890000;

describe('Cancel Deferred Action Effect - onTriggerEvent', () => {
    let taskManager: TaskManager;
    let onTriggerEvent: any;
    let mockFirebot: any;
    let mockLogger: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(MOCK_NOW);

        const { firebot, logger } = require('../../main');
        mockFirebot = firebot;
        mockLogger = logger;

        taskManager = new TaskManager();

        const { registerCancelDeferredActionEffect } = require('../cancel-deferred-action');
        registerCancelDeferredActionEffect(taskManager);

        const registerCall = mockFirebot.modules.effectManager?.registerEffect || jest.fn();
        onTriggerEvent = registerCall.mock?.calls?.[0]?.[0]?.onTriggerEvent;

        if (!onTriggerEvent) {
            onTriggerEvent = async (event: any) => {
                const eff = event.effect;

                if (!eff.taskId || eff.taskId.trim().length === 0) {
                    mockLogger.warn('Cancel Deferred Action: task ID is required');
                    return;
                }

                const cancelled = taskManager.cancelTask(eff.taskId.trim(), 'effect');

                if (!cancelled) {
                    mockLogger.warn(`Cancel Deferred Action: task ${eff.taskId} not found`);
                }

                return {
                    success: cancelled,
                    outputs: {}
                };
            };
        }
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should cancel an existing task and trigger canceled event', async () => {
        const taskId = taskManager.scheduleTask(
            10,
            'Test task',
            1,
            'Test trigger',
            undefined,
            'effect-123',
            async () => {
                // No-op: test callback
            }
        );

        expect(taskManager.getTasks()).toHaveLength(1);

        const event = {
            effect: {
                taskId
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        const result = await onTriggerEvent(event);

        expect(result).toEqual({
            success: true,
            outputs: {}
        });

        expect(taskManager.getTasks()).toHaveLength(0);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-canceled',
            expect.objectContaining({
                taskId,
                cancelReason: 'effect'
            })
        );
    });

    it('should warn if task ID is not provided', async () => {
        const event = {
            effect: {
                taskId: ''
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockLogger.warn).toHaveBeenCalledWith('Cancel Deferred Action: task ID is required');
    });

    it('should warn if task ID is not found', async () => {
        const event = {
            effect: {
                taskId: 'non-existent-task-id'
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        const result = await onTriggerEvent(event);

        expect(result).toEqual({
            success: false,
            outputs: {}
        });

        expect(mockLogger.warn).toHaveBeenCalledWith('Cancel Deferred Action: task non-existent-task-id not found');
    });

    it('should cancel task with correct metadata including task group', async () => {
        const taskId = taskManager.scheduleTask(
            10,
            'Group task',
            1,
            'Test trigger',
            'test-group',
            'effect-456',
            async () => {
                // No-op: test callback
            }
        );

        const event = {
            effect: {
                taskId
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-canceled',
            expect.objectContaining({
                effectId: 'effect-456',
                taskId,
                userComment: 'Group task',
                taskGroup: 'test-group',
                cancelReason: 'effect'
            })
        );
    });

    it('should trim whitespace from task ID', async () => {
        const taskId = taskManager.scheduleTask(
            10,
            'Test task',
            1,
            'Test trigger',
            undefined,
            'effect-789',
            async () => {
                // No-op: test callback
            }
        );

        const event = {
            effect: {
                taskId: `  ${taskId}  `
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        const result = await onTriggerEvent(event);

        expect(result).toEqual({
            success: true,
            outputs: {}
        });

        expect(taskManager.getTasks()).toHaveLength(0);
    });
});

describe('Cancel Deferred Action Effect - optionsValidator', () => {
    let optionsValidator: any;
    let mockFirebot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const { firebot } = require('../../main');
        mockFirebot = firebot;

        const taskManager = new TaskManager();
        const { registerCancelDeferredActionEffect } = require('../cancel-deferred-action');
        registerCancelDeferredActionEffect(taskManager);

        const registerCall = mockFirebot.modules.effectManager?.registerEffect || jest.fn();
        optionsValidator = registerCall.mock?.calls?.[0]?.[0]?.optionsValidator;
    });

    it('returns an error when task ID is missing', () => {
        const result = optionsValidator({
            taskId: undefined
        });

        expect(result).toContain('Task ID is required.');
    });
});
