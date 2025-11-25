import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import TaskManager from '../task-manager';

export function createDeferredActionScheduledTasks(taskManager: TaskManager): ReplaceVariable {
    return {
        definition: {
            handle: "deferredActionScheduledTasks",
            description: "Returns the number of deferred action tasks currently scheduled.",
            possibleDataOutput: ["number"]
        },
        evaluator: async () => {
            return taskManager.getTasks().length;
        }
    };
}
