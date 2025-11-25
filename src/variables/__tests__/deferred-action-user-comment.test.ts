import { deferredActionUserComment } from '../deferred-action-user-comment';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('deferredActionUserComment evaluator', () => {
    it('should return the userComment from deferredAction metadata', async () => {
        const userComment = 'Please execute this action later';
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {
                    userComment
                }
            }
        } as unknown as Trigger;

        const result = await deferredActionUserComment.evaluator(trigger);

        expect(result).toBe(userComment);
    });

    it('should return empty string when deferredAction metadata is missing', async () => {
        const trigger = {
            type: 'manual',
            metadata: {}
        } as unknown as Trigger;

        const result = await deferredActionUserComment.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return empty string when userComment is not present in metadata', async () => {
        const trigger = {
            type: 'manual',
            metadata: {
                deferredAction: {}
            }
        } as unknown as Trigger;

        const result = await deferredActionUserComment.evaluator(trigger);

        expect(result).toBe('');
    });

    it('should return various userComment values', async () => {
        const testCases = [
            'Simple comment',
            'Comment with special chars: !@#$%',
            'Multi-line\ncomment',
            ''
        ];

        for (const userComment of testCases) {
            const trigger = {
                type: 'event',
                metadata: {
                    deferredAction: {
                        userComment
                    }
                }
            } as unknown as Trigger;

            const result = await deferredActionUserComment.evaluator(trigger);
            expect(result).toBe(userComment);
        }
    });
});
