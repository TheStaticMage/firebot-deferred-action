import { deferredActionCancellationReason } from '../deferred-action-cancellation-reason';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionCancellationReason evaluator', () => {
    it('should return the cancelReason from deferredAction metadata', async () => {
        const cancelReason = 'user';
        const trigger = {
            type: 'event',
            metadata: {
                deferredAction: {
                    cancelReason
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionCancellationReason.evaluator(trigger);

        expect(result).toBe(cancelReason);
    });

    it('should return empty string when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionCancellationReason.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return empty string when cancelReason is not present in metadata', async () => {
        const trigger = {
            type: 'event',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionCancellationReason.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return various cancelReason values', async () => {
        const testCases = [
            'user',
            'conflict',
            'effect'
        ];

        for (const cancelReason of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        cancelReason
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionCancellationReason.evaluator(trigger);
            expect(result).toBe(cancelReason);
        }
    });
});
