# Upgrading

## Versioning

- A **patch release** changes the last number (e.g. `0.0.3` -> `0.0.4`). These releases may fix bugs or add features, but your existing setup should continue to work just fine.
- A **minor release** changes the middle number (e.g. `0.0.4` -> `0.1.0`). These releases typically make considerable changes but are generally backward-compatible. Your existing setup should continue to work.
- A **major release** changes the first number (e.g. `0.1.5` -> `1.0.0`). These releases correspond to a major milestone and may contain breaking changes.

## Version Compatibility

| Plugin Version | Minimum Firebot Version |
| --- | --- |
| 0.0.1+ | 5.65 |

## Upgrade Procedure

1. From the latest [Release](https://github.com/TheStaticMage/firebot-deferred-action/releases), download `firebot-deferred-action-<version>.js`.
2. Place the new `firebot-deferred-action-<version>.js` into your Firebot scripts directory (**File** > **Open Data Folder**, then select the "scripts" directory).
3. Go to **Settings** > **Scripts** > **Manage Startup Scripts**, find the plugin in the list, click **Edit** next to it, select the new `firebot-deferred-action-<version>.js` file, and click **Save**.
4. Restart Firebot.

Optional: Delete any older versions of this plugin from your Firebot scripts directory to keep it clean.

## Upgrade Notes

- :fire: Requires Firebot 5.65 or later.
- :boom: No breaking changes expected within the 0.0.x releases.
- :no_entry_sign: No deprecated features at this time.
