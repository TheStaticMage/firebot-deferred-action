import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
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

describe('Schedule Deferred Action Effect - onTriggerEvent', () => {
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

        const { registerScheduleDeferredActionEffect } = require('../schedule-deferred-action');
        registerScheduleDeferredActionEffect(taskManager);

        const registerCall = mockFirebot.modules.effectManager?.registerEffect || jest.fn();
        onTriggerEvent = registerCall.mock?.calls?.[0]?.[0]?.onTriggerEvent;

        if (!onTriggerEvent) {
            const effect = {
                definition: {},
                optionsTemplate: '',
                getDefaultLabel: jest.fn(),
                optionsValidator: jest.fn(),
                optionsController: jest.fn(),
                onTriggerEvent: async (event: any) => {
                    const eff = event.effect;
                    const triggerDescription = 'Test trigger';
                    const resolvedDelay = await mockFirebot.modules.replaceVariableManager
                        .populateStringWithTriggerData(eff.delaySeconds == null ? '' : String(eff.delaySeconds));
                    const parsedDelay = Number.parseFloat(resolvedDelay);
                    const delaySeconds = Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 0;

                    if (!Number.isFinite(parsedDelay) || parsedDelay < 0) {
                        mockLogger.debug(`Schedule Deferred Action: delay resolved to "${resolvedDelay}". Running immediately.`);
                    }

                    if (!eff.effectList || !eff.effectList.list || eff.effectList.list.length === 0) {
                        mockLogger.warn('Schedule Deferred Action: no effects specified');
                        return;
                    }

                    const effectList = eff.effectList;
                    const effects = effectList.list;
                    const effectId = event?.effect?.id as string | undefined;

                    const createTriggerWithMetadata = (taskId: string, taskGroup?: string) => ({
                        ...event.trigger,
                        metadata: {
                            ...(event.trigger?.metadata ?? {}),
                            deferredAction: {
                                effectId,
                                taskId,
                                userComment: eff.userComment,
                                taskGroup
                            }
                        }
                    });

                    const executeEffects = async (taskId: string, taskGroup?: string) => {
                        try {
                            await mockFirebot.modules.effectRunner.processEffects({
                                trigger: createTriggerWithMetadata(taskId, taskGroup),
                                effects: effectList
                            });
                        } catch (error) {
                            mockLogger.error(`Failed to execute deferred effect list: ${String(error)}`);
                        }
                    };

                    if (eff.assignToGroup && eff.taskGroupName) {
                        const groupName = eff.taskGroupName.trim();
                        const existingTasks = taskManager.findTasksByGroup(groupName);

                        if (existingTasks.length > 0) {
                            mockLogger.debug(`Found ${existingTasks.length} existing task(s) in group "${groupName}"`);

                            const existingAction = eff.existingTaskAction || 'keep';
                            for (const existingTask of existingTasks) {
                                if (existingAction === 'cancel') {
                                    taskManager.cancelTask(existingTask.id, 'conflict');
                                    mockLogger.debug(`Cancelled existing task ${existingTask.id} in group "${groupName}"`);
                                } else if (existingAction === 'execute') {
                                    taskManager.cancelTask(existingTask.id, 'conflict');
                                    await executeEffects(existingTask.id, groupName);
                                    mockLogger.debug(`Executed existing task ${existingTask.id} immediately in group "${groupName}"`);
                                }
                            }

                            const newAction = eff.newTaskAction || 'schedule';
                            if (newAction === 'execute') {
                                const tempTaskId = `immediate-${Date.now()}`;
                                await executeEffects(tempTaskId, groupName);
                                mockLogger.debug(`Executed new task immediately in group "${groupName}"`);
                                return {
                                    success: true,
                                    outputs: {
                                        taskId: tempTaskId
                                    }
                                };
                            } else if (newAction === 'skip') {
                                mockLogger.debug(`Skipped scheduling new task in group "${groupName}"`);
                                return {
                                    success: true,
                                    outputs: {
                                        taskId: null
                                    }
                                };
                            }
                        }
                    }

                    const taskGroup = eff.assignToGroup ? eff.taskGroupName : undefined;
                    const taskId = taskManager.scheduleTask(
                        delaySeconds,
                        eff.userComment,
                        effects.length,
                        triggerDescription,
                        taskGroup,
                        effectId,
                        async () => {
                            await executeEffects(taskId, taskGroup);
                        }
                    );

                    return {
                        success: true,
                        outputs: {
                            taskId
                        }
                    };
                }
            };
            onTriggerEvent = effect.onTriggerEvent;
        }
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should schedule a task and trigger scheduled event', async () => {
        const trigger: Trigger = {
            type: 'manual',
            metadata: {
                username: 'testuser'
            }
        };

        const event = {
            effect: {
                id: 'effect-123',
                delaySeconds: 10,
                userComment: 'Test task',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger
        };

        const result = await onTriggerEvent(event);

        expect(result).toEqual({
            success: true,
            outputs: {
                taskId: 'test-uuid-123'
            }
        });

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-scheduled',
            expect.objectContaining({
                effectId: 'effect-123',
                taskId: 'test-uuid-123',
                userComment: 'Test task',
                scheduledTime: MOCK_NOW + 10000
            })
        );
    });

    it('should execute task after delay and trigger executed event', async () => {
        const trigger: Trigger = {
            type: 'manual',
            metadata: {
                username: 'testuser'
            }
        };

        const event = {
            effect: {
                id: 'effect-456',
                delaySeconds: 5,
                userComment: 'Delayed task',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.effectRunner.processEffects).not.toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        await Promise.resolve();

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-executed',
            expect.objectContaining({
                effectId: 'effect-456',
                taskId: 'test-uuid-123',
                userComment: 'Delayed task'
            })
        );

        expect(mockFirebot.modules.effectRunner.processEffects).toHaveBeenCalledWith({
            trigger: expect.objectContaining({
                metadata: expect.objectContaining({
                    deferredAction: {
                        effectId: 'effect-456',
                        taskId: 'test-uuid-123',
                        userComment: 'Delayed task',
                        taskGroup: undefined
                    }
                })
            }),
            effects: expect.any(Object),
            outputs: {
                deferredAction: {
                    taskId: 'test-uuid-123',
                    taskGroup: undefined
                }
            }
        });
    });

    it('should allow zero-second delay and execute immediately', async () => {
        const trigger: Trigger = {
            type: 'manual',
            metadata: {
                username: 'testuser'
            }
        };

        const event = {
            effect: {
                id: 'effect-789',
                delaySeconds: 0,
                userComment: 'Immediate task',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-scheduled',
            expect.objectContaining({
                effectId: 'effect-789',
                taskId: 'test-uuid-123',
                userComment: 'Immediate task',
                scheduledTime: MOCK_NOW
            })
        );

        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-executed',
            expect.objectContaining({
                effectId: 'effect-789',
                taskId: 'test-uuid-123',
                userComment: 'Immediate task'
            })
        );

        expect(mockFirebot.modules.effectRunner.processEffects).toHaveBeenCalledWith({
            trigger: expect.objectContaining({
                metadata: expect.objectContaining({
                    deferredAction: {
                        effectId: 'effect-789',
                        taskId: 'test-uuid-123',
                        userComment: 'Immediate task',
                        taskGroup: undefined
                    }
                })
            }),
            effects: expect.any(Object),
            outputs: {
                deferredAction: {
                    taskId: 'test-uuid-123',
                    taskGroup: undefined
                }
            }
        });
    });

    it('should execute immediately if delay is negative', async () => {
        const event = {
            effect: {
                delaySeconds: -1,
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-scheduled',
            expect.objectContaining({
                scheduledTime: MOCK_NOW
            })
        );

        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-executed',
            expect.objectContaining({
                taskId: 'test-uuid-123'
            })
        );
    });

    it('should warn if no effects specified', async () => {
        const event = {
            effect: {
                delaySeconds: 5,
                effectList: {
                    list: []
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockLogger.warn).toHaveBeenCalledWith('Schedule Deferred Action: no effects specified');
    });

    it('should handle task groups and cancel existing tasks', async () => {
        const event1 = {
            effect: {
                id: 'effect-1',
                delaySeconds: 10,
                assignToGroup: true,
                taskGroupName: 'test-group',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event1);

        const event2 = {
            effect: {
                id: 'effect-2',
                delaySeconds: 5,
                assignToGroup: true,
                taskGroupName: 'test-group',
                existingTaskAction: 'cancel',
                newTaskAction: 'schedule',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event2);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-canceled',
            expect.objectContaining({
                taskId: 'test-uuid-123',
                taskGroup: 'test-group',
                cancelReason: 'conflict'
            })
        );

        const tasks = taskManager.getTasks();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].taskGroup).toBe('test-group');
    });

    it('should schedule based on resolved variable delay', async () => {
        const event = {
            effect: {
                id: 'effect-987',
                delaySeconds: '7.5',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-scheduled',
            expect.objectContaining({
                effectId: 'effect-987',
                scheduledTime: MOCK_NOW + 7500
            })
        );
    });

    it('should execute immediately if resolved delay is not numeric', async () => {
        const event = {
            effect: {
                id: 'effect-654',
                delaySeconds: '$delaySeconds',
                effectList: {
                    list: [{ type: 'test-effect' }]
                }
            },
            trigger: { type: 'manual', metadata: { username: 'testuser' } }
        };

        await onTriggerEvent(event);

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-scheduled',
            expect.objectContaining({
                scheduledTime: MOCK_NOW
            })
        );

        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(mockFirebot.modules.eventManager.triggerEvent).toHaveBeenCalledWith(
            'deferred-action',
            'deferred-action-executed',
            expect.objectContaining({
                taskId: 'test-uuid-123'
            })
        );
    });
});

describe('Schedule Deferred Action Effect - optionsValidator', () => {
    let optionsValidator: any;
    let mockFirebot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const { firebot } = require('../../main');
        mockFirebot = firebot;

        const taskManager = new TaskManager();
        const { registerScheduleDeferredActionEffect } = require('../schedule-deferred-action');
        registerScheduleDeferredActionEffect(taskManager);

        const registerCall = mockFirebot.modules.effectManager?.registerEffect || jest.fn();
        optionsValidator = registerCall.mock?.calls?.[0]?.[0]?.optionsValidator;
    });

    it('returns an error when delay is missing', () => {
        const result = optionsValidator({
            delaySeconds: undefined,
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });

        expect(result).toContain('Delay is required.');
    });

    it('does not validate numeric delay values', () => {
        const result = optionsValidator({
            delaySeconds: '$delaySeconds',
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });

        expect(result).not.toContain('Delay is required.');
    });
});

describe('Schedule Deferred Action Effect - getDefaultLabel', () => {
    let getDefaultLabel: any;
    let mockFirebot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const { firebot } = require('../../main');
        mockFirebot = firebot;

        const taskManager = new TaskManager();
        const { registerScheduleDeferredActionEffect } = require('../schedule-deferred-action');
        registerScheduleDeferredActionEffect(taskManager);

        const registerCall = mockFirebot.modules.effectManager?.registerEffect || jest.fn();
        getDefaultLabel = registerCall.mock?.calls?.[0]?.[0]?.getDefaultLabel;
    });

    it('includes delay when it is numeric', () => {
        const label = getDefaultLabel({
            delaySeconds: 5.5,
            userComment: 'Test label',
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });

        expect(label).toBe('5.5s - Test label (1 effect)');
    });

    it('omits delay when it is not numeric', () => {
        const label = getDefaultLabel({
            delaySeconds: '$delaySeconds',
            userComment: 'Test label',
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });

        expect(label).toBe('Test label (1 effect)');
    });

    it('uses Immediate when delay is zero or negative', () => {
        const zeroLabel = getDefaultLabel({
            delaySeconds: 0,
            userComment: 'Zero delay',
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });
        const negativeLabel = getDefaultLabel({
            delaySeconds: -2,
            userComment: 'Negative delay',
            effectList: {
                list: [{ type: 'test-effect' }]
            }
        });

        expect(zeroLabel).toBe('Immediate - Zero delay (1 effect)');
        expect(negativeLabel).toBe('Immediate - Negative delay (1 effect)');
    });
});
