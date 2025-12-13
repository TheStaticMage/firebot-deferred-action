# Schedule Deferred Action Effect

## Overview

The **Schedule Deferred Action** effect allows you to schedule a list of effects to run automatically after a specified delay. Instead of manually setting up complex timer logic, you can simply add this effect to your command chains, event handlers, or automations to delay execution of other effects.

## Why Use This?

All of the functionality this plugin provides is achievable via built-in Firebot features. However, delaying action sequences in Firebot can require complex configuration involving effect queues, preset effect lists, and delays. Common use cases that this plugin makes substantially easier include:

- Wait for a viewer reaction before playing a clip or sound
- Execute a follow-up action after a fixed delay
- Create multi-step automations with precise timing
- Coordinate effects that need to happen in sequence with delays

This effect handles all the timing infrastructure for you, letting you focus on what effects should run and when.

It's also important to understand when _not_ to use this plugin. Although this plugin will indeed work, the following use cases are easier with built-in Firebot effects:

- Inserting a delay into your effect list (use the Delay effect)
- Waiting for a sound to finish playing (it's an option in the Play Sound effect)
- Running an effect on a repeating schedule (look under the "Time-Based" menu)

## Real-Life Use Cases

### Post-Raid Follow-Up Message

**Difficulty**: Easy

When someone raids your channel, wait 15 seconds before sending a thank-you message so chat can settle, while still processing other effects associated with the raid. You don't need intricate timing of the chat message within your effect list.

1. Create a Firebot event for **Incoming Raid**

2. Add a **Schedule Deferred Action**

   a. Set the delay to 15 seconds

   b. Add a chat message effect with the thank-you message

3. Add remaining effects to the event (playing sound, visual effects, etc.)

Now, all of your raid handling effects will proceed in sequence, and the chat message will be posted after 15 seconds.

Note: The Firebot equivalent is to create a preset effect list with a "Delay" for 15 seconds effect and a chat effect, and then to call that preset effect list with the "Don't wait for effects to finish" option checked. Using the deferred action plugin simplifies this considerably.

### Cooldown for Conditional Redemption

**Difficulty**: Advanced

Both Twitch and Firebot support cooldowns for redemptions, but perhaps you have a redemption that has restrictions on it. For example, maybe you have a TTS redemption that takes the chat message as an argument, but only plays the message if it's fewer than 100 characters. Twitch and Firebot cooldowns apply _before_ you can check the length, so they apply _even if_ the message was too long!

You can manage cooldowns manually with this plugin by configuring the event list for your redemption as follows:

1. **Conditional Effect**: Check the length of the message (or validate the message in some way). If the message is invalid, maybe respond in chat, and at the end, call the "Stop Effect Execution" effect.

2. **Update Channel Reward**: Pause the reward.

3. **Schedule Deferred Action**:

    a. Set the delay to 120 seconds

    b. Add a **Update Channel Reward** to unpause the reward

4. Add effect(s) to perform the TTS.

This sequence implements a cooldown on successful redemptions only.

:bulb: To do this for a command, you might not need this plugin. See if clearing the cooldown on the command via the **Cooldown Command** effect will meet your needs. (Note: There's no Twitch API call to clear the cooldown on a redemption.)

:bulb: It's technically possible that two TTS redemptions could come in very close together and both get read back-to-back. This is called a _race condition_ in which the effects both begin processing before this can pause the reward. If you need absolute certainty that a duplicate event doesn't sneak through, my [Firebot Rate Limiter](https://github.com/TheStaticMage/firebot-rate-limiter) would work well between steps 1 and 2.

:warning: With this strategy, if someone uses TTS and you pause the reward, but you close Firebot before it can be unpaused, the reward will remain paused on the Twitch side. You may want to add an event for **Firebot Started** to unpause the reward to make sure this never happens.

## Quick Start

1. Add the **Schedule Deferred Action** effect anywhere in your command chain or event handler
2. Enter a delay (minimum 0 seconds)
3. Add one or more effects to the "Effects to Run" section
4. Save the command or event
5. When triggered, your effects will run after the specified delay

## Parameter Reference

### Delay (Required)

The number of seconds to wait before running the effects.

**Valid range:** 0 seconds or more

**Default:** None (required)

**Notes:**

- The actual execution may occur up to a few hundred milliseconds after the specified delay due to system load and JavaScript event loop scheduling.
- A delay of `0` schedules the task immediately so it runs as soon as Firebot processes queued work.
- Scheduled tasks are not persisted to disk, so if Firebot is stopped or restarted, the deferred actions will not execute. Be careful when using very long delays.

### Comment (Optional)

A user-friendly label for this task. Displayed in the UI panel and available via the `$deferredActionUserComment` replace variable.

**Valid input:** Any text string

**Default:** Auto-generated description based on effect count (e.g., "Run 3 effects")

**Notes:**

- Leave blank to use the auto-generated description
- This is useful for identifying tasks in the UI panel
- Include context like "Raid follow-up message" or "Clip delay sequence"

### Task Group

Assign the task to a named group for conflict management. When multiple tasks are scheduled in the same group, you control what happens.

#### Enable Task Group

Check this box to enable grouping. When unchecked, tasks run independently with no conflict handling.

**Default:** Unchecked (no grouping)

#### Group Name

The name of the group this task belongs to. Multiple tasks in the same group are considered to be in conflict.

**Valid input:** Any text string (case-sensitive)

**Default:** None (required if grouping is enabled)

**Notes:**

- Group names are free-form; use descriptive names like "raid-alerts" or "clip-sequence"
- Tasks in the same group are managed according to the conflict resolution settings below
- Tasks with different group names do not interact

#### Conflict Resolution: Existing Task

Determines what happens to a task that is already scheduled when a new task is scheduled in the same group.

**Options:**

- **Cancel and remove** (default): Delete the existing task.
- **Execute immediately**: Stop waiting and run the existing task right now.
- **Keep unchanged**: Leave the existing task as-is.

**Use case:** For "raid-alerts," you might want to "Cancel and remove" so only the most recent raid triggers an alert.

#### Conflict Resolution: New Task

Determines what happens to the new task being scheduled when a task already exists in the same group.

**Options:**

- **Execute immediately**: Run the new task right now instead of scheduling it. Skip the delay.
- **Schedule normally** (default): Wait the full delay before running the new task.
- **Skip (do not schedule)**: Do not schedule the new task at all.

**Use case:** For "clip-sequence," you probably want "Schedule normally" so the second clip plays after its delay, even if another clip was recently scheduled.

### Effects to Run (Required)

The list of effects to execute after the delay expires. You must add at least one effect.

**Valid input:** Any Firebot effect

**Default:** None (required)

**Notes:**

- Click the effect list section to add, remove, or reorder effects
- Effects run sequentially in the order you specify
- If any effect fails, remaining effects still execute (failures don't block the chain)
- The task ID is available to effects via the `$deferredActionTaskId` replace variable
- The effect ID is available via the `$deferredActionEffectId` replace variable
- The task group string is available via the `$deferredActionTaskGroup` replace variable

## Task Output

When this effect executes, it generates a task ID that you can use in other effects:

**Output name:** `$effectOutput[taskId]`

**Type:** Text (UUID format)

**Use cases:**

- Pass the task ID to a **Cancel Deferred Action** effect to allow canceling the task later
- Log the task ID for tracking
- Display the task ID in a message for debugging

## Replace Variables

When the scheduled effects execute, you can access information about the task:

- `$deferredActionTaskId` - The unique identifier of this task
- `$deferredActionEffectId` - The ID of this effect
- `$deferredActionUserComment` - The comment you entered
- `$deferredActionTaskGroup` - The group name (if assigned)
- `$deferredActionExecutionTime` - When the task will execute (Unix timestamp in milliseconds)
- `$deferredActionScheduledTasks` - Count of deferred action tasks currently scheduled

See [Replace Variables](/doc/variables.md) for complete details.

These variables are only set when the task is being scheduled by a deferred action. These will be empty (or `0` for `$deferredActionExecutionTime`) when not being scheduled by a deferred action.

## Events

This effect triggers Firebot events that you can handle:

- **Deferred Action Scheduled** - Fires when a task is scheduled (before the delay)
- **Deferred Action Executed** - Fires when the scheduled effects start to run
- **Deferred Action Canceled** - Fires if the task is canceled before execution

You can use these events to create conditional logic or notifications. See [Replace Variables](/doc/variables.md) for details on the metadata available in each event.

## Monitoring

Use the **Deferred Actions** panel in Firebot (available under "Custom" in the left menu) to:

- View all scheduled tasks
- See when each task will execute
- View the countdown timer
- Manually run or cancel tasks if needed

## Limitations and Known Issues

- **No persistence**: If Firebot is shut down or restarted, all pending scheduled tasks are lost
- **System-dependent timing**: Delays may be off by a few hundred milliseconds depending on system load
- **No recurring tasks**: This effect does not repeat. To schedule recurring actions, create a timer or event listener
- **Task groups are memory-only**: If you restart Firebot, task group history is cleared; this only matters if you cancel existing tasks in a group and then check for them

## Best Practices

1. **Use clear comments** - Describe what each task does, especially in complex workflows
2. **Test timing** - Test your delays in a safe environment before going live to verify they feel right
3. **Use task groups conservatively** - Only enable grouping when you actually need conflict handling
4. **Name task groups concisely** - Matching based on freeform text can be error-prone if you aren't careful
5. **Monitor the UI panel** - Check the deferred actions panel to see if tasks are scheduling as expected
6. **Combine with events** - Use the Deferred Action events to create rich conditional logic
