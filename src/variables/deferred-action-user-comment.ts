import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

interface DeferredActionMetadata {
    effectId?: string;
    taskId?: string;
    userComment?: string;
    taskGroup?: string;
}

export const deferredActionUserComment: ReplaceVariable = {
    definition: {
        handle: "deferredActionUserComment",
        description: "Returns the user comment (if any) of the deferred action.",
        possibleDataOutput: ["text"]
    },
    evaluator: async (trigger: Trigger) => {
        const deferredData = trigger.metadata?.deferredAction as DeferredActionMetadata | undefined;
        return deferredData?.userComment || "";
    }
};
