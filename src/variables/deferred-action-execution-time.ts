import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

interface DeferredActionMetadata {
    effectId?: string;
    taskId?: string;
    userComment?: string;
    taskGroup?: string;
    scheduledTime?: number;
}

export const deferredActionExecutionTime: ReplaceVariable = {
    definition: {
        handle: "deferredActionExecutionTime",
        description: "Returns the Unix timestamp (in milliseconds) when the deferred action will execute.",
        possibleDataOutput: ["number"],
        triggers: {
            "manual": true,
            "event": ['deferred-action:deferred-action-scheduled']
        }
    },
    evaluator: async (trigger: Trigger) => {
        const deferredData = trigger.metadata?.deferredAction as DeferredActionMetadata | undefined;
        return deferredData?.scheduledTime || 0;
    }
};
