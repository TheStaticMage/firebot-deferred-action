import { Firebot } from '@crowbartools/firebot-custom-scripts-types';
import TaskManager from '../task-manager';
import { firebot, logger } from '../main';

export function registerCancelDeferredActionEffect(taskManager: TaskManager): void {
    const effect: Firebot.EffectType<CancelDeferredActionEffect> = {
        definition: {
            id: 'deferred-action:cancel',
            name: 'Cancel Deferred Action',
            description: 'Cancel a scheduled deferred action by its task ID',
            icon: 'far fa-times-circle',
            categories: ['common']
        },
        optionsTemplate: `
            <eos-container header="Task ID">
                <firebot-input
                    model="effect.taskId"
                    placeholder-text="Enter task ID to cancel"
                ></firebot-input>
            </eos-container>
        `,
        getDefaultLabel: (effect: CancelDeferredActionEffect) => {
            return effect.taskId ? `Cancel task: ${effect.taskId}` : 'Cancel deferred action';
        },
        optionsValidator: (effect: CancelDeferredActionEffect): string[] => {
            const errors: string[] = [];

            if (!effect.taskId || effect.taskId.trim().length === 0) {
                errors.push('Task ID is required.');
            }

            return errors;
        },
        onTriggerEvent: async (event) => {
            const eff = event.effect;

            if (!eff.taskId || eff.taskId.trim().length === 0) {
                logger.warn('Cancel Deferred Action: task ID is required');
                return;
            }

            const cancelled = taskManager.cancelTask(eff.taskId.trim(), 'effect');

            if (!cancelled) {
                logger.warn(`Cancel Deferred Action: task ${eff.taskId} not found`);
            }

            return {
                success: cancelled,
                outputs: {}
            };
        }
    };

    firebot.modules.effectManager.registerEffect(effect);
    logger.debug('Registered Cancel Deferred Action effect');
}

export interface CancelDeferredActionEffect {
    taskId: string;
}
