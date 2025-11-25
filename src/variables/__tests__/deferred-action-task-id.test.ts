import { deferredActionTaskId } from '../deferred-action-task-id';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionTaskId evaluator', () => {
    it('should return the taskId from deferredAction metadata', async () => {
        const taskId = 'task-12345';
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {
                    taskId
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionTaskId.evaluator(trigger);

        expect(result).toBe(taskId);
    });

    it('should return empty string when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionTaskId.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return empty string when taskId is not present in metadata', async () => {
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionTaskId.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return various taskId values', async () => {
        const testCases = [
            'task-1',
            'task-abc-123',
            'custom-identifier',
            ''
        ];

        for (const taskId of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        taskId
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionTaskId.evaluator(trigger);
            expect(result).toBe(taskId);
        }
    });
});
