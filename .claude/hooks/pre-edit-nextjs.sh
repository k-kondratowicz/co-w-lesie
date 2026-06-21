#!/bin/bash
INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
[ -z "$FILE" ] && exit 0

# Only .ts/.tsx files can use Next APIs
[[ "$FILE" =~ \.(ts|tsx)$ ]] || exit 0

# The edited/written text (Edit -> new_string, Write -> content)
PAYLOAD=$(jq -r '[.tool_input.new_string, .tool_input.content] | map(select(. != null)) | join("\n")' <<<"$INPUT")

# Route handlers live under src/app/, but server actions, caching, cron, and
# request APIs can appear anywhere - match by path OR by Next-16 API tokens.
if [[ "$FILE" =~ src/app/ ]] \
  || echo "$PAYLOAD" | grep -qE "'use server'|\"use server\"|from ['\"]next/(cache|server|headers)|revalidatePath|revalidateTag|unstable_cache|unstable_after|\bafter\(|connection\(|cookies\(\)|headers\(\)|draftMode\("; then
  jq -n '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "additionalContext": "REMINDER: This edit involves Next.js 16 APIs (route handler, server action, caching/revalidate, cron, or request API). This repo pins Next 16 with breaking changes from older versions. Before writing, read the relevant guide in node_modules/next/dist/docs/ - do not invent API signatures from memory."
    }
  }'
fi
