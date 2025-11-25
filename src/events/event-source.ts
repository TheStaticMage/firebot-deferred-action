import { EventSource } from '@crowbartools/firebot-custom-scripts-types/types/modules/event-manager';
import { firebot, logger } from '../main';

export function registerDeferredActionEventSource(): void {
    const eventSource: EventSource = {
        id: 'deferred-action',
        name: 'Deferred Action',
        events: [
            {
                id: 'deferred-action-scheduled',
                name: 'Deferred Action Scheduled',
                description: 'When a deferred action is initially scheduled',
                cached: false,
                manualMetadata: {
                    effectId: 'effect-id-123',
                    taskId: 'task-id-456',
                    userComment: 'Example comment',
                    taskGroup: 'example-group',
                    scheduledTime: 1234567890000
                }
            },
            {
                id: 'deferred-action-executed',
                name: 'Deferred Action Executed',
                description: 'When a scheduled deferred action executes',
                cached: false,
                manualMetadata: {
                    effectId: 'effect-id-123',
                    taskId: 'task-id-456',
                    userComment: 'Example comment',
                    taskGroup: 'example-group'
                }
            },
            {
                id: 'deferred-action-canceled',
                name: 'Deferred Action Canceled',
                description: 'When a scheduled deferred action is canceled',
                cached: false,
                manualMetadata: {
                    effectId: 'effect-id-123',
                    taskId: 'task-id-456',
                    userComment: 'Example comment',
                    taskGroup: 'example-group',
                    cancelReason: 'user'
                }
            }
        ]
    };

    firebot.modules.eventManager.registerEventSource(eventSource);
    logger.debug('Registered Deferred Action event source');
}
