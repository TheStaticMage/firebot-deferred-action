import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

interface DeferredActionMetadata {
    effectId?: string;
    taskId?: string;
    userComment?: string;
    taskGroup?: string;
}

export const deferredActionEffectId: ReplaceVariable = {
    definition: {
        handle: "deferredActionEffectId",
        description: "Returns the effect ID of the deferred action that scheduled this task.",
        possibleDataOutput: ["text"]
    },
    evaluator: async (trigger: Trigger) => {
        const deferredData = trigger.metadata?.deferredAction as DeferredActionMetadata | undefined;
        return deferredData?.effectId || "";
    }
};
