#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

if [[ "$FILE" =~ src/features/(risk|safety)/ ]] \
  || [[ "$FILE" =~ src/app/api/(risk|bans|context)/ ]]; then
  jq -n '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "additionalContext": "SAFETY RULE (this is a safety app - wrong output has real-world consequences):\n- Missing data is NOT safe. Unknown signal (sync failed, point outside coverage, BDL down) => status UNKNOWN + tell the user to stay cautious. Never imply safe.\n- Entry ban present OR fire-hazard degree III => result is always RED, regardless of other signals.\n- Never state categorically that it is safe. Best case: no known hazards nearby, plus an always-visible disclaimer that this does not replace official LP notices.\n- Every risk/assessment surface must show data source, freshness timestamp, and the disclaimer."
    }
  }'
fi
