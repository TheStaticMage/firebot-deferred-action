import { deferredActionEffectId } from '../deferred-action-effect-id';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionEffectId evaluator', () => {
    it('should return the effectId from deferredAction metadata', async () => {
        const effectId = 'effect-abc-123';
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {
                    effectId
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionEffectId.evaluator(trigger);

        expect(result).toBe(effectId);
    });

    it('should return empty string when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionEffectId.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return empty string when effectId is not present in metadata', async () => {
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionEffectId.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return various effectId values', async () => {
        const testCases = [
            'effect-1',
            'effect-xyz-789',
            'custom-effect-id',
            ''
        ];

        for (const effectId of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        effectId
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionEffectId.evaluator(trigger);
            expect(result).toBe(effectId);
        }
    });
});
