# Reviewed coordination events

Use this inbox only when a material event is not already represented by a
coordination commit or handoff. One JSON file per event:

```json
{
  "schema": "coordination.reviewed-event.v1",
  "timestamp": "2026-09-01T20:00:00Z",
  "agent": "codex",
  "title": "GridAtlas map click fails closed on unknown network schema",
  "detail": "Evidence and the smallest safe next action."
}
```

Allowed agents are `claude`, `codex` and `owner`. Do not paste raw transcript
records, credentials, private attachments or unreviewed tool output here.
