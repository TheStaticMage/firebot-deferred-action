import { Firebot } from '@crowbartools/firebot-custom-scripts-types';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import TaskManager from '../task-manager';
import { firebot, logger } from '../main';

export function registerScheduleDeferredActionEffect(taskManager: TaskManager): void {
    const effect: Firebot.EffectType<ScheduleDeferredActionEffect> = {
        definition: {
            id: 'deferred-action:schedule',
            name: 'Schedule Deferred Action',
            description: 'Schedule an effect list to run after a delay',
            icon: 'far fa-clock',
            categories: ['common'],
            outputs: [
                {
                    defaultName: 'taskId',
                    label: 'Task ID',
                    description: 'The unique identifier of this scheduled task'
                }
            ]
        },
        optionsTemplate: `
            <eos-container header="Delay">
                <firebot-input
                    input-title="Seconds"
                    model="effect.delaySeconds"
                    placeholder-text="Enter delay in seconds"
                    required
                ></firebot-input>
            </eos-container>

            <eos-container header="Comment (Optional)">
                <firebot-input use-text-area="false" model="effect.userComment" placeholder-text="e.g., Delayed announcement"></firebot-input>
                <p class="muted" style="font-size: 11px; margin-top: 5px;">Leave blank to auto-generate from effect count</p>
            </eos-container>

            <eos-container header="Task Group">
                <label class="control-fb control--checkbox">
                    Assign to Task Group
                    <input type="checkbox" ng-model="effect.assignToGroup">
                    <div class="control__indicator"></div>
                </label>
                <div ng-if="effect.assignToGroup" style="margin-top: 10px;">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: normal; margin-bottom: 5px;">Group Name</label>
                        <input type="text" class="form-control" ng-model="effect.taskGroupName" placeholder="Enter group name">
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="font-weight: 600; margin-bottom: 8px;">Conflict Resolution</div>
                        <p class="muted" style="font-size: 11px; margin-bottom: 12px;">If a task is already scheduled in this group...</p>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: normal; margin-bottom: 5px;">Existing task</label>
                            <select class="form-control" ng-model="effect.existingTaskAction">
                                <option value="cancel">Cancel and remove</option>
                                <option value="execute">Execute immediately</option>
                                <option value="keep">Keep unchanged</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: normal; margin-bottom: 5px;">New task</label>
                            <select class="form-control" ng-model="effect.newTaskAction">
                                <option value="execute">Execute immediately</option>
                                <option value="schedule">Schedule normally</option>
                                <option value="skip">Skip (do not schedule)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </eos-container>

            <eos-container header="Effects to Run">
                <effect-list effects="effect.effectList" update="effectListUpdated(effects)"></effect-list>
            </eos-container>
        `,
        getDefaultLabel: (effect: ScheduleDeferredActionEffect) => {
            const delayValue = effect.delaySeconds;
            const resolvedDelay = delayValue == null ? '' : String(delayValue).trim();
            const parsedDelay = Number.parseFloat(resolvedDelay);
            const delayStr = resolvedDelay !== '' && Number.isFinite(parsedDelay)
                ? (parsedDelay <= 0 ? 'Immediate' : `${parsedDelay}s`)
                : '';
            const effectCount = effect.effectList?.list?.length || 0;
            const comment = effect.userComment || "";
            const delayPrefix = delayStr ? `${delayStr} - ` : '';
            return `${delayPrefix}${comment} (${effectCount} effect${effectCount === 1 ? '' : 's'})`;
        },
        optionsValidator: (effect: ScheduleDeferredActionEffect): string[] => {
            const errors: string[] = [];

            if (effect.delaySeconds == null || String(effect.delaySeconds).trim() === '') {
                errors.push('Delay is required.');
            }

            const count = effect.effectList?.list?.length ?? 0;
            if (count === 0) {
                errors.push('Please add at least one effect to the effect list.');
            }

            if (effect.assignToGroup) {
                if (!effect.taskGroupName || !effect.taskGroupName.trim()) {
                    errors.push('Task group name cannot be empty.');
                }
            }

            return errors;
        },
        optionsController: ($scope: any) => {
            if ($scope.effect.existingTaskAction == null) {
                $scope.effect.existingTaskAction = 'keep';
            }
            if ($scope.effect.newTaskAction == null) {
                $scope.effect.newTaskAction = 'schedule';
            }

            $scope.effectListUpdated = function(effects: any) {
                $scope.effect.effectList = effects;
            };
        },
        onTriggerEvent: async (event) => {
            const eff = event.effect;
            const triggerDescription = describeTrigger(event.trigger);
            const resolvedDelay = eff.delaySeconds;
            const resolvedDelayText = resolvedDelay == null ? '' : String(resolvedDelay).trim();
            const parsedDelay = Number.parseFloat(resolvedDelayText);
            const delaySeconds = Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 0;

            if (!Number.isFinite(parsedDelay) || parsedDelay <= 0) {
                logger.debug(`Schedule Deferred Action: delay resolved to "${resolvedDelayText}". Running immediately.`);
            }

            if (!eff.effectList || !eff.effectList.list || eff.effectList.list.length === 0) {
                logger.warn('Schedule Deferred Action: no effects specified');
                return;
            }

            const effectList = eff.effectList;
            const effects = effectList.list;
            const effectId = (event as any)?.effect?.id as string | undefined;

            const createTriggerWithMetadata = (taskId: string, taskGroup?: string): Trigger => ({
                ...event.trigger,
                metadata: {
                    ...(event.trigger?.metadata ?? {}),
                    deferredAction: {
                        effectId,
                        taskId,
                        userComment: eff.userComment,
                        taskGroup
                    }
                }
            });

            const executeEffects = async (taskId: string, taskGroup?: string) => {
                const { outputs = {} } = event ?? {};

                const enrichedOutputs = {
                    ...(outputs ?? {}),
                    deferredAction: {
                        taskId,
                        taskGroup
                    }
                };

                const clonedOutputs = typeof structuredClone === 'function'
                    ? structuredClone(enrichedOutputs)
                    : JSON.parse(JSON.stringify(enrichedOutputs));

                try {
                    await firebot.modules.effectRunner.processEffects({
                        trigger: createTriggerWithMetadata(taskId, taskGroup),
                        effects: effectList,
                        outputs: clonedOutputs
                    });
                } catch (error) {
                    logger.error(`Failed to execute deferred effect list: ${String(error)}`);
                }
            };

            // Handle task group logic
            if (eff.assignToGroup && eff.taskGroupName) {
                const groupName = eff.taskGroupName.trim();
                const existingTasks = taskManager.findTasksByGroup(groupName);

                if (existingTasks.length > 0) {
                    logger.debug(`Found ${existingTasks.length} existing task(s) in group "${groupName}"`);

                    // Handle existing tasks (FIFO: execute oldest first)
                    const existingAction = eff.existingTaskAction || 'keep';
                    for (const existingTask of existingTasks) {
                        if (existingAction === 'cancel') {
                            taskManager.cancelTask(existingTask.id, 'conflict');
                            logger.debug(`Cancelled existing task ${existingTask.id} in group "${groupName}"`);
                        } else if (existingAction === 'execute') {
                            taskManager.cancelTask(existingTask.id, 'conflict');
                            await executeEffects(existingTask.id, groupName);
                            logger.debug(`Executed existing task ${existingTask.id} immediately in group "${groupName}"`);
                        }
                    }

                    // Handle new task
                    const newAction = eff.newTaskAction || 'schedule';
                    if (newAction === 'execute') {
                        const tempTaskId = `immediate-${Date.now()}`;
                        await executeEffects(tempTaskId, groupName);
                        logger.debug(`Executed new task immediately in group "${groupName}"`);
                        return {
                            success: true,
                            outputs: {
                                taskId: tempTaskId
                            }
                        };
                    } else if (newAction === 'skip') {
                        logger.debug(`Skipped scheduling new task in group "${groupName}"`);
                        return {
                            success: true,
                            outputs: {
                                taskId: null
                            }
                        };
                    }
                    // Fall through to schedule normally if newAction === 'schedule'
                }
            }

            // Schedule the task normally
            const taskGroup = eff.assignToGroup ? eff.taskGroupName : undefined;
            const taskId = taskManager.scheduleTask(
                delaySeconds,
                eff.userComment,
                effects.length,
                triggerDescription,
                taskGroup,
                effectId,
                async () => {
                    await executeEffects(taskId, taskGroup);
                }
            );

            return {
                success: true,
                outputs: {
                    taskId
                }
            };
        }
    };

    firebot.modules.effectManager.registerEffect(effect);
    logger.debug('Registered Schedule Deferred Action effect');
}

export interface ScheduleDeferredActionEffect {
    delaySeconds: number | string;
    userComment?: string;
    assignToGroup?: boolean;
    taskGroupName?: string;
    existingTaskAction?: 'cancel' | 'execute' | 'keep';
    newTaskAction?: 'execute' | 'schedule' | 'skip';
    effectList?: {
        list: any[];
    };
}

function describeTrigger(trigger?: Trigger): string {
    if (!trigger) {
        return 'Unknown trigger';
    }

    const type = trigger.type || 'unknown';
    const meta = trigger.metadata || {};

    switch (type) {
        case 'event': {
            const eventName = (meta as any).event?.name || (meta as any).eventSource?.name;
            return eventName ? `Event: ${eventName}` : 'Event trigger';
        }
        case 'preset': {
            const presetName = (meta as any).presetName || (meta as any).triggerId;
            return presetName ? `Preset: ${presetName}` : 'Preset trigger';
        }
        case 'command': {
            const cmd = (meta as any).userCommand?.trigger || (meta as any).command?.name;
            return cmd ? `Command: ${cmd}` : 'Command trigger';
        }
        case 'quick_action':
            return 'Quick Action trigger';
        case 'manual':
            return 'Manual trigger';
        case 'timer':
            return 'Timer trigger';
        case 'hotkey':
            return 'Hotkey trigger';
        case 'counter': {
            const counterName = (meta as any).counter?.name;
            return counterName ? `Counter: ${counterName}` : 'Counter trigger';
        }
        case 'channel_reward':
            return 'Channel reward trigger';
        default: {
            const prettyType = type.replace(/_/g, ' ');
            const capped = prettyType.charAt(0).toUpperCase() + prettyType.slice(1);
            return `${capped} trigger`;
        }
    }
}
