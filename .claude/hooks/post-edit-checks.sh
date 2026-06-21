#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

WARNINGS=""

# console.log in production code (skip test/spec files)
if [[ "$FILE" =~ \.(ts|tsx|js|jsx)$ ]] && [[ ! "$FILE" =~ \.(test|spec)\. ]] && [[ ! "$FILE" =~ __tests__ ]]; then
  HITS=$(grep -n 'console\.log' "$FILE" 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    WARNINGS="${WARNINGS}## console.log in production code\n${HITS}\n\n"
  fi
fi

# `: any` or `as any` in .ts/.tsx
if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  HITS=$(grep -nE ':\s*any\b|as\s+any\b' "$FILE" 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    WARNINGS="${WARNINGS}## 'any' type usage\n${HITS}\n\n"
  fi
fi

# unicode punctuation (ellipsis, em/en-dash, curly quotes)
HITS=$(perl -CSDA -ne 'print "$.:$_" if /[\x{2026}\x{2014}\x{2013}\x{201C}\x{201D}\x{2018}\x{2019}]/' "$FILE" 2>/dev/null || true)
if [ -n "$HITS" ]; then
  WARNINGS="${WARNINGS}## Unicode punctuation (use ASCII equivalents)\n${HITS}\n\n"
fi

# biome check
if [[ "$FILE" =~ \.(ts|tsx|js|jsx|json|css)$ ]]; then
  BIOME=$(npx biome check "$FILE" 2>&1) || WARNINGS="${WARNINGS}## Biome violations\n${BIOME}\n\n"
fi

if [ -n "$WARNINGS" ]; then
  jq -n --arg ctx "Post-edit check found issues in ${FILE}:\n\n${WARNINGS}Fix these before continuing." '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": $ctx
    }
  }'
fi
