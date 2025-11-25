import { AngularJsFactory, AngularJsPage, UIExtension } from '@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager';

export interface DeferredActionTask {
    id: string;
    createdAt: number;
    scheduledTime: number;
    userComment?: string;
    effectCount: number;
    triggerDescription: string;
    description: string;
    taskGroup?: string;
    countdownSeconds: number;
    deleting?: boolean;
    running?: boolean;
}

function deferredActionsServiceFunction(_backendCommunicator: any): any {
    const service: any = {};

    return service;
}

const deferredActionsService: AngularJsFactory = {
    name: "deferredActionsService",
    function: (backendCommunicator: any) => deferredActionsServiceFunction(backendCommunicator)
};

const deferredActionsPage: AngularJsPage = {
    id: 'deferred-actions-page',
    name: 'Deferred Actions',
    icon: 'fa-hourglass-end',
    type: 'angularjs',
    template: `
<div style="padding: 20px;">
    <style>
        .deferred-action-tooltip .tooltip-inner {
            white-space: pre-line;
        }
    </style>
    <div ng-if="loading" style="text-align: center; padding: 20px; color: #ddd;">
        Loading tasks...
    </div>

    <div ng-if="!loading && tasks.length === 0" style="text-align: center; padding: 40px; color: #ddd; font-size: 16px;">
        No scheduled deferred actions.
    </div>

    <table class="table table-striped" ng-if="!loading && tasks.length > 0" style="margin-top: 20px;">
        <thead>
            <tr>
                <th>Action</th>
                <th>Scheduled At</th>
                <th>Runs At</th>
                <th>Countdown</th>
                <th style="text-align: center; width: 80px;"></th>
            </tr>
        </thead>
        <tbody>
            <tr ng-repeat="task in tasks" style="background-color: {{ $index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)' }};">
                <td style="max-width: 340px; word-break: break-word; vertical-align: middle;">
                    <div
                        style="font-weight: 600; cursor: help;"
                        uib-tooltip="{{ getTaskTooltip(task) }}"
                        tooltip-append-to-body="true"
                        tooltip-class="deferred-action-tooltip"
                    >{{ task.userComment || task.description }}</div>
                    <div ng-if="task.taskGroup" style="font-size: 11px; color: #bdbdbd; margin-top: 4px;">Group: {{ task.taskGroup }}</div>
                </td>
                <td style="font-family: monospace; font-size: 12px; vertical-align: middle;">{{ formatScheduledTime(task.createdAt) }}</td>
                <td style="font-family: monospace; font-size: 12px; vertical-align: middle;">{{ formatScheduledTime(task.scheduledTime) }}</td>
                <td style="font-size: 12px; vertical-align: middle;">{{ getCountdownDisplay(task) }}</td>
                <td style="text-align: center; vertical-align: middle; display: flex; justify-content: center; gap: 5px;">
                    <button class="btn btn-sm btn-success" ng-click="showRunModal(task)" ng-disabled="task.running">
                        {{ task.running ? 'Running...' : 'Run' }}
                    </button>
                    <button class="btn btn-sm btn-danger" ng-click="showCancelModal(task)" ng-disabled="task.deleting">
                        {{ task.deleting ? 'Canceling...' : 'Cancel' }}
                    </button>
                </td>
            </tr>
        </tbody>
    </table>

    <div ng-if="!loading && tasks.length > 0" style="text-align: right; margin-top: 12px;">
        <button class="btn btn-danger" ng-click="showCancelAllModal()" ng-disabled="deletingAll" style="min-width: 150px;">
            {{ deletingAll ? 'Canceling All...' : 'Cancel All Tasks' }}
        </button>
    </div>

    <div ng-if="modalMode" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1050;">
        <div style="background: #1f1f1f; padding: 20px 24px; border-radius: 6px; width: 420px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);">
            <h3 style="margin-top: 0; margin-bottom: 10px;">
                {{ modalMode === 'all' ? 'Cancel All Deferred Actions' : modalMode === 'run' ? 'Run Deferred Action' : 'Cancel Deferred Action' }}
            </h3>
            <p style="margin: 0 0 12px 0; color: #d0d0d0;" ng-if="modalMode === 'single'">Are you sure you want to cancel this deferred action?</p>
            <p style="margin: 0 0 12px 0; color: #d0d0d0;" ng-if="modalMode === 'run'">Are you sure you want to run this deferred action now?</p>
            <p style="margin: 0 0 12px 0; color: #d0d0d0;" ng-if="modalMode === 'all'">
                This will cancel {{ modalAllCount }} deferred {{ modalAllCount === 1 ? 'action' : 'actions' }}. Are you sure you want to continue?
            </p>
            <div style="font-size: 12px; color: #c7c7c7; line-height: 1.5;" ng-if="modalTask">
                <div><strong>Scheduled:</strong> {{ formatScheduledTime(modalTask.scheduledTime) }}</div>
                <div ng-if="modalMode !== 'run'"><strong>Countdown:</strong> {{ getCountdownDisplay(modalTask) }}</div>
                <div><strong>Comment:</strong> {{ modalTask.userComment || modalTask.description }}</div>
                <div ng-if="modalTask.taskGroup"><strong>Group:</strong> {{ modalTask.taskGroup }}</div>
                <div><strong>Trigger:</strong> {{ modalTask.triggerDescription || 'Unknown trigger' }}</div>
                <div><strong>Effects:</strong> {{ modalTask.effectCount }}</div>
            </div>
            <div style="text-align: right; margin-top: 16px;">
                <button class="btn btn-default" ng-click="closeModal()" style="margin-right: 10px;" ng-disabled="(modalMode === 'single' || modalMode === 'run' ? modalTask.deleting || modalTask.running : deletingAll)">Keep {{ modalMode === 'all' ? 'Tasks' : 'Task' }}</button>
                <button class="btn btn-success" ng-if="modalMode === 'run'" ng-click="confirmRun(modalTask.id)" ng-disabled="modalTask.running">
                    {{ modalTask.running ? 'Running...' : 'Run Now' }}
                </button>
                <button class="btn btn-danger" ng-if="modalMode === 'single'" ng-click="confirmDelete(modalTask.id)" ng-disabled="modalTask.deleting">
                    {{ modalTask.deleting ? 'Canceling...' : 'Cancel Task' }}
                </button>
                <button class="btn btn-danger" ng-if="modalMode === 'all'" ng-click="confirmDeleteAll()" ng-disabled="deletingAll">
                    {{ deletingAll ? 'Canceling All...' : 'Cancel All Tasks' }}
                </button>
            </div>
        </div>
    </div>
</div>
    `,
    controller: ($scope: any, backendCommunicator: any) => {
        $scope.tasks = [];
        $scope.loading = true;
        $scope.modalTask = null;
        $scope.modalMode = null;
        $scope.modalAllCount = 0;
        $scope.deletingAll = false;
        let countdownInterval: NodeJS.Timeout | null = null;

        $scope.formatScheduledTime = function(timestamp: number): string {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        $scope.getCountdownDisplay = function(task: DeferredActionTask): string {
            const secs = Math.max(0, task.countdownSeconds);
            const hours = Math.floor(secs / 3600);
            const minutes = Math.floor((secs % 3600) / 60);
            const seconds = secs % 60;

            if (hours > 0) {
                return `${hours}h ${minutes}m ${seconds}s`;
            }
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            }
            return `${seconds}s`;
        };

        $scope.getTaskTooltip = function(task: DeferredActionTask): string {
            const triggerText = task.triggerDescription || 'Unknown trigger';
            return `Trigger: ${triggerText}\nEffects: ${task.effectCount}`;
        };

        $scope.refreshTasks = function(): void {
            $scope.loading = true;
            if (backendCommunicator?.fireEventAsync) {
                backendCommunicator.fireEventAsync('deferred-action:get-tasks').then(function(result: any) {
                    if (result?.success && result.tasks) {
                        $scope.tasks = result.tasks.map((t: DeferredActionTask) => ({
                            ...t,
                            deleting: false
                        }));
                    } else {
                        $scope.tasks = [];
                    }
                    $scope.loading = false;
                    startCountdownTimer();
                });
            } else {
                $scope.loading = false;
            }
        };

        $scope.showCancelModal = function(task: DeferredActionTask): void {
            if (task?.deleting) {
                return;
            }
            $scope.modalTask = task;
            $scope.modalMode = 'single';
        };

        $scope.showRunModal = function(task: DeferredActionTask): void {
            if (task?.running) {
                return;
            }
            $scope.modalTask = task;
            $scope.modalMode = 'run';
        };

        $scope.showCancelAllModal = function(): void {
            if ($scope.deletingAll || !$scope.tasks.length) {
                return;
            }
            $scope.modalTask = null;
            $scope.modalMode = 'all';
            $scope.modalAllCount = $scope.tasks.length;
        };

        $scope.closeModal = function(): void {
            $scope.modalTask = null;
            $scope.modalMode = null;
        };

        $scope.closeCancelModal = function(): void {
            $scope.closeModal();
        };

        $scope.confirmDelete = function(taskId: string): void {
            $scope.deleteTask(taskId, true);
        };

        $scope.confirmRun = function(taskId: string): void {
            $scope.runTask(taskId, true);
        };

        $scope.confirmDeleteAll = function(): void {
            $scope.deleteAllTasks(true);
        };

        $scope.deleteTask = function(taskId: string, fromModal?: boolean): void {
            const task = $scope.tasks.find((t: DeferredActionTask) => t.id === taskId);
            if (task) {
                task.deleting = true;
            }

            if (backendCommunicator?.fireEventAsync) {
                backendCommunicator.fireEventAsync('deferred-action:delete-task', taskId).then(function(result: any) {
                    if (result?.success) {
                        $scope.tasks = $scope.tasks.filter((t: DeferredActionTask) => t.id !== taskId);
                        if ($scope.modalTask && $scope.modalTask.id === taskId) {
                            $scope.modalTask = null;
                            $scope.modalMode = null;
                        }
                    } else if (task) {
                        task.deleting = false;
                        if (fromModal && $scope.modalTask) {
                            $scope.modalTask.deleting = false;
                        }
                    }
                });
            }
        };

        $scope.runTask = function(taskId: string, fromModal?: boolean): void {
            const task = $scope.tasks.find((t: DeferredActionTask) => t.id === taskId);
            if (task) {
                task.running = true;
            }

            if (backendCommunicator?.fireEventAsync) {
                backendCommunicator.fireEventAsync('deferred-action:execute-task', taskId).then(function(result: any) {
                    if (result?.success) {
                        $scope.tasks = $scope.tasks.filter((t: DeferredActionTask) => t.id !== taskId);
                        if ($scope.modalTask && $scope.modalTask.id === taskId) {
                            $scope.modalTask = null;
                            $scope.modalMode = null;
                        }
                    } else if (task) {
                        task.running = false;
                        if (fromModal && $scope.modalTask) {
                            $scope.modalTask.running = false;
                        }
                    }
                });
            }
        };

        $scope.deleteAllTasks = function(fromModal?: boolean): void {
            if (!backendCommunicator?.fireEventAsync) {
                return;
            }
            $scope.deletingAll = true;
            backendCommunicator.fireEventAsync('deferred-action:delete-all-tasks').then(function(result: any) {
                if (result?.success) {
                    $scope.tasks = [];
                    $scope.modalTask = null;
                    if (fromModal) {
                        $scope.modalMode = null;
                    }
                }
                $scope.deletingAll = false;
                $scope.modalAllCount = 0;
            });
        };

        function startCountdownTimer(): void {
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

            countdownInterval = setInterval(function() {
                const now = Date.now();
                $scope.$apply(function() {
                    $scope.tasks.forEach((task: DeferredActionTask) => {
                        task.countdownSeconds = Math.max(0, Math.ceil((task.scheduledTime - now) / 1000));
                    });
                });
            }, 1000);
        }

        // Listen for task changes sent from the backend
        if (backendCommunicator?.on) {
            backendCommunicator.on('deferred-action:task-added', () => {
                // Ensure Angular sees the change even though the event comes from outside its digest cycle
                $scope.$applyAsync(() => $scope.refreshTasks());
            });

            backendCommunicator.on('deferred-action:task-removed', () => {
                $scope.$applyAsync(() => {
                    $scope.modalTask = null;
                    $scope.modalMode = null;
                    $scope.refreshTasks();
                });
            });

            backendCommunicator.on('deferred-action:all-tasks-removed', (payload: { count: number }) => {
                $scope.$applyAsync(() => {
                    $scope.tasks = [];
                    $scope.modalTask = null;
                    $scope.modalMode = null;
                    $scope.deletingAll = false;
                    $scope.modalAllCount = payload?.count || 0;
                });
            });
        }

        // Initial load
        $scope.refreshTasks();

        $scope.$on('$destroy', function() {
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
        });
    }
};

export function createDeferredActionsPanelUI(): UIExtension {
    return {
        id: 'deferred-actions-ui',
        pages: [deferredActionsPage],
        providers: {
            factories: [deferredActionsService]
        }
    };
}
