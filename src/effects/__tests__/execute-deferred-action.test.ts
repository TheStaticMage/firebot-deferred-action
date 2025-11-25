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

describe('Execute Deferred Action Effect - optionsValidator', () => {
    let optionsValidator: any;
    let mockFirebot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const { firebot } = require('../../main');
        mockFirebot = firebot;

        const taskManager = new TaskManager();
        const { registerExecuteDeferredActionEffect } = require('../execute-deferred-action');
        registerExecuteDeferredActionEffect(taskManager);

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
