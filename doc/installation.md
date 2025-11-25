# Installation

| Plugin Version | Minimum Firebot Version |
| --- | --- |
| 0.0.1+ | 5.65 |

## Installation: Plugin

1. Enable custom scripts in Firebot (**Settings** > **Scripts**) if you have not already done so.
2. From the latest [Release](https://github.com/TheStaticMage/firebot-deferred-action/releases), download `firebot-deferred-action-<version>.js` into your Firebot scripts directory (**File** > **Open Data Folder**, then select the "scripts" directory).
3. Go to **Settings** > **Scripts** > **Manage Startup Scripts** > **Add New Script** and add the `firebot-deferred-action-<version>.js` script.
4. Restart Firebot. (The plugin will _not_ load until you restart Firebot.)

## Configuration: Schedule Deferred Action

1. Add the **Schedule Deferred Action** effect to an effect list.
2. Set the delay in seconds and optionally enter a comment for context.
3. Add one or more effects to run after the delay.
4. (Optional) Enable **Assign to Task Group** to group tasks, choose how existing tasks in that group are handled, and select how the new task should behave.

## Configuration: Cancel Deferred Action

1. Add the **Cancel Deferred Action** effect to an effect list.
2. Provide the task ID to cancel (use the output from the scheduling effect or the UI panel).

## Configuration: Events and Variables

- Use the **Deferred Action** event source to react when tasks schedule, execute, or cancel.
- Replace variables provide task IDs, effect IDs, comments, task group names, cancel reasons, and execution times for use in your messages or logs.

## Testing (Optional)

- Start Firebot after installation and confirm the plugin loads without errors.
- Schedule a deferred action and verify it executes and surfaces events as expected.
