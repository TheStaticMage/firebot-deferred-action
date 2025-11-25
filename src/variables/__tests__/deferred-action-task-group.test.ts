import { deferredActionTaskGroup } from '../deferred-action-task-group';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionTaskGroup evaluator', () => {
    it('should return the taskGroup from deferredAction metadata', async () => {
        const taskGroup = 'group-A';
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {
                    taskGroup
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionTaskGroup.evaluator(trigger);

        expect(result).toBe(taskGroup);
    });

    it('should return empty string when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionTaskGroup.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return empty string when taskGroup is not present in metadata', async () => {
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionTaskGroup.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return various taskGroup values', async () => {
        const testCases = [
            'group-1',
            'general-tasks',
            'high-priority',
            ''
        ];

        for (const taskGroup of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        taskGroup
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionTaskGroup.evaluator(trigger);
            expect(result).toBe(taskGroup);
        }
    });
});
