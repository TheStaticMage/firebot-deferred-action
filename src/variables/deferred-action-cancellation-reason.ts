import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

interface DeferredActionMetadata {
    effectId?: string;
    taskId?: string;
    userComment?: string;
    taskGroup?: string;
    cancelReason?: 'user' | 'conflict' | 'effect';
}

export const deferredActionCancellationReason: ReplaceVariable = {
    definition: {
        handle: "deferredActionCancellationReason",
        description: "Returns the reason why the deferred action was canceled.",
        possibleDataOutput: ["text"],
        triggers: {
            "manual": true,
            "event": ['deferred-action:deferred-action-canceled']
        }
    },
    evaluator: async (trigger: Trigger) => {
        const deferredData = trigger.metadata?.deferredAction as DeferredActionMetadata | undefined;
        return deferredData?.cancelReason || "";
    }
};
