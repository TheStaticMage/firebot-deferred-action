import { deferredActionExecutionTime } from '../deferred-action-execution-time';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionExecutionTime evaluator', () => {
    it('should return the scheduledTime from deferredAction metadata', async () => {
        const scheduledTime = 1234567890000;
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {
                    scheduledTime
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionExecutionTime.evaluator(trigger);

        expect(result).toBe(scheduledTime);
    });

    it('should return 0 when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionExecutionTime.evaluator(trigger);

        expect(result).toBe(0);
    });

    it('should return 0 when scheduledTime is not present in metadata', async () => {
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionExecutionTime.evaluator(trigger);

        expect(result).toBe(0);
    });

    it('should return various scheduledTime values', async () => {
        const testCases = [
            1000000000000,
            9999999999999,
            1234567890123
        ];

        for (const scheduledTime of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        scheduledTime
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionExecutionTime.evaluator(trigger);
            expect(result).toBe(scheduledTime);
        }
    });
});
