import { firebot } from '../main';
import { deferredActionEffectId } from './deferred-action-effect-id';
import { deferredActionTaskId } from './deferred-action-task-id';
import { deferredActionUserComment } from './deferred-action-user-comment';
import { deferredActionTaskGroup } from './deferred-action-task-group';
import { deferredActionCancellationReason } from './deferred-action-cancellation-reason';
import { deferredActionExecutionTime } from './deferred-action-execution-time';
import { createDeferredActionScheduledTasks } from './deferred-action-scheduled-tasks';
import TaskManager from '../task-manager';

export function registerReplaceVariables(taskManager: TaskManager) {
    const { replaceVariableManager } = firebot.modules;

    replaceVariableManager.registerReplaceVariable(deferredActionEffectId);
    replaceVariableManager.registerReplaceVariable(deferredActionTaskId);
    replaceVariableManager.registerReplaceVariable(deferredActionUserComment);
    replaceVariableManager.registerReplaceVariable(deferredActionTaskGroup);
    replaceVariableManager.registerReplaceVariable(deferredActionCancellationReason);
    replaceVariableManager.registerReplaceVariable(deferredActionExecutionTime);
    replaceVariableManager.registerReplaceVariable(createDeferredActionScheduledTasks(taskManager));
}
