import { Firebot, RunRequest } from '@crowbartools/firebot-custom-scripts-types';
import { Logger } from '@crowbartools/firebot-custom-scripts-types/types/modules/logger';
import { registerCancelDeferredActionEffect } from './effects/cancel-deferred-action';
import { registerExecuteDeferredActionEffect } from './effects/execute-deferred-action';
import { registerScheduleDeferredActionEffect } from './effects/schedule-deferred-action';
import { registerDeferredActionEventSource } from './events/event-source';
import { registerFrontendCommunicatorHandlers } from './ipc';
import TaskManager from './task-manager';
import { createDeferredActionsPanelUI } from './ui/deferred-actions-panel';
import { registerReplaceVariables } from './variables';

export let firebot: RunRequest<any>;
export let logger: LogWrapper;

let taskManager: TaskManager;

const pluginName = 'Deferred Action';
const scriptVersion = '0.0.1';

const script: Firebot.CustomScript<any> = {
    getScriptManifest: () => {
        return {
            name: 'Deferred Action',
            description: 'Schedule effects to run after a delay',
            author: 'The Static Mage',
            version: scriptVersion,
            startupOnly: true,
            firebotVersion: '5'
        };
    },
    getDefaultParameters: () => {
        return {};
    },
    parametersUpdated: () => {
        // No parameters for this plugin
    },
    run: async (runRequest) => {
        firebot = runRequest;
        logger = new LogWrapper(runRequest.modules.logger);
        logger.info(`${pluginName} initializing.`);

        // Check Firebot version compatibility
        const fbVersion = firebot.firebot.version;
        logger.debug(`Detected Firebot version: ${fbVersion}`);
        if (!isVersionAtLeast(">= 5.65.0-0", fbVersion)) {
            logger.error(`${pluginName} requires Firebot version 5.65.0 or higher. Detected version: ${fbVersion}. Please update Firebot to use this plugin.`);
            return;
        }

        // Initialize task manager
        taskManager = new TaskManager();
        logger.debug('Task manager initialized');

        // Register event source
        registerDeferredActionEventSource();
        logger.debug('Event source registered');

        // Register effects
        registerScheduleDeferredActionEffect(taskManager);
        registerCancelDeferredActionEffect(taskManager);
        registerExecuteDeferredActionEffect(taskManager);
        logger.debug('Effects registered');

        // Register replace variables
        registerReplaceVariables(taskManager);
        logger.debug('Replace variables registered');

        // Register frontend communicator handlers
        registerFrontendCommunicatorHandlers(taskManager);
        logger.debug('Frontend communicator handlers registered');

        // Register UI extension
        if (firebot.modules.uiExtensionManager) {
            const uiExtension = createDeferredActionsPanelUI();
            firebot.modules.uiExtensionManager.registerUIExtension(uiExtension);
            logger.debug('UI extension registered');
        }

        // Indicate successful initialization
        logger.info(`${pluginName} initialized successfully.`);
    },
    stop: async () => {
        // Clean up all pending tasks
        if (taskManager) {
            taskManager.cleanup();
            logger.debug('All pending tasks cleaned up');
        }
        logger.info(`${pluginName} stopped.`);
    }
};

function parseSemver(version: string) {
    const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
    const prerelease = match?.[4] ? match[4].split('.') : [];
    return {
        major: Number(match?.[1] ?? 0),
        minor: Number(match?.[2] ?? 0),
        patch: Number(match?.[3] ?? 0),
        prerelease
    };
}

function compareIdentifiers(a: string, b: string): number {
    const aNum = /^\d+$/.test(a) ? Number(a) : NaN;
    const bNum = /^\d+$/.test(b) ? Number(b) : NaN;

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
    }
    if (!Number.isNaN(aNum)) {
        return -1;
    }
    if (!Number.isNaN(bNum)) {
        return 1;
    }
    return a.localeCompare(b);
}

function comparePrerelease(a: string[], b: string[]): number {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const aId = a[i];
        const bId = b[i];
        if (aId === undefined) {
            return bId === undefined ? 0 : -1;
        }
        if (bId === undefined) {
            return 1;
        }
        const diff = compareIdentifiers(aId, bId);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

function compareSemver(a: ReturnType<typeof parseSemver>, b: ReturnType<typeof parseSemver>): number {
    if (a.major !== b.major) {
        return a.major - b.major;
    }
    if (a.minor !== b.minor) {
        return a.minor - b.minor;
    }
    if (a.patch !== b.patch) {
        return a.patch - b.patch;
    }
    if (a.prerelease.length === 0 && b.prerelease.length === 0) {
        return 0;
    }
    if (a.prerelease.length === 0) {
        return 1;
    }
    if (b.prerelease.length === 0) {
        return -1;
    }
    return comparePrerelease(a.prerelease, b.prerelease);
}

function isVersionAtLeast(range: string, version: string): boolean {
    if (!range.trim().startsWith(">=")) {
        return false;
    }
    const required = parseSemver(range.replace(">=", "").trim());
    const actual = parseSemver(version);
    return compareSemver(actual, required) >= 0;
}

class LogWrapper {
    private _logger: Logger;

    constructor(inLogger: Logger) {
        this._logger = inLogger;
    }

    info(message: string) {
        this._logger.info(`[${pluginName}] ${message}`);
    }

    error(message: string) {
        this._logger.error(`[${pluginName}] ${message}`);
    }

    debug(message: string) {
        this._logger.debug(`[${pluginName}] ${message}`);
    }

    warn(message: string) {
        this._logger.warn(`[${pluginName}] ${message}`);
    }
}

export default script;
