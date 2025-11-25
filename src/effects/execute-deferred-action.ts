import { Firebot } from '@crowbartools/firebot-custom-scripts-types';
import TaskManager from '../task-manager';
import { firebot, logger } from '../main';

export function registerExecuteDeferredActionEffect(taskManager: TaskManager): void {
    const effect: Firebot.EffectType<ExecuteDeferredActionEffect> = {
        definition: {
            id: 'deferred-action:execute',
            name: 'Execute Deferred Action',
            description: 'Execute a scheduled deferred action immediately by its task ID',
            icon: 'far fa-play-circle',
            categories: ['common']
        },
        optionsTemplate: `
            <eos-container header="Task ID">
                <firebot-input
                    model="effect.taskId"
                    placeholder-text="Enter task ID to execute"
                ></firebot-input>
            </eos-container>
        `,
        getDefaultLabel: (effect: ExecuteDeferredActionEffect) => {
            return effect.taskId ? `Execute task: ${effect.taskId}` : 'Execute deferred action';
        },
        optionsValidator: (effect: ExecuteDeferredActionEffect): string[] => {
            const errors: string[] = [];

            if (!effect.taskId || effect.taskId.trim().length === 0) {
                errors.push('Task ID is required.');
            }

            return errors;
        },
        onTriggerEvent: async (event) => {
            const eff = event.effect;

            if (!eff.taskId || eff.taskId.trim().length === 0) {
                logger.warn('Execute Deferred Action: task ID is required');
                return;
            }

            const executed = taskManager.executeTask(eff.taskId.trim());

            if (!executed) {
                logger.warn(`Execute Deferred Action: task ${eff.taskId} not found`);
            }

            return {
                success: executed,
                outputs: {}
            };
        }
    };

    firebot.modules.effectManager.registerEffect(effect);
    logger.debug('Registered Execute Deferred Action effect');
}

export interface ExecuteDeferredActionEffect {
    taskId: string;
}
