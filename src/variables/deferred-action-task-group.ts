import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

interface DeferredActionMetadata {
    effectId?: string;
    taskId?: string;
    userComment?: string;
    taskGroup?: string;
}

export const deferredActionTaskGroup: ReplaceVariable = {
    definition: {
        handle: "deferredActionTaskGroup",
        description: "Returns the task group (if any) of the deferred action.",
        possibleDataOutput: ["text"]
    },
    evaluator: async (trigger: Trigger) => {
        const deferredData = trigger.metadata?.deferredAction as DeferredActionMetadata | undefined;
        return deferredData?.taskGroup || "";
    }
};
