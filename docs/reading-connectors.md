# Reading Connectors Settings Concept

The Reading Connectors panel in **Settings → Integrations** is the control center for linking Focus Notebook with external reading services. Instead of launching a standalone tool, connectors now live alongside other account preferences so readers can manage authorizations in one place.

## Goals

- Offer a trustworthy overview of every third-party integration that can power reading automation.
- Highlight the health of existing connections and surface any reconnect actions that need attention.
- Make it simple to discover new connectors and understand the data each one contributes.

## Experience Outline

1. **Overview Card** – Summaries for connected count, integrations requiring attention, and overall coverage of the reading library.
2. **Search & Filters** – Quick search and a toggle to focus on connected services.
3. **Connector Cards** – Individual cards with:
   - Status badge (Connected, Not connected, Action required)
   - Description, vendor, and quick capability tags
   - Data synced list (progress, highlights, annotations, etc.)
   - Last sync timestamp and link to setup docs
   - Primary call-to-action button for connecting, disconnecting, or reconnecting

## Initial Connector Roster

- **Apple Books** – Syncs progress, highlights, and collections via Apple ID.
- **Amazon Kindle** – Tracks Kindle position, annotations, and popular highlights.
- **Pocket** – Imports saved articles with tags and estimated reading time.
- **Notion Reading Database** – Pushes consolidated reading metrics to a Notion workspace.
- **Kobo** – Mirrors Kobo device reading statistics for non-Kindle readers.

## Future Enhancements

- Add webhook support so connectors can push real-time updates without scheduled polling.
- Allow per-connector automation rules (e.g., auto-tag Kindle highlights by series).
- Provide audit logs for OAuth activity and token expiry to aid compliance reviews.
- Surface aggregated analytics (streaks, genre breakdown, discovery sources) once multiple services are connected.

