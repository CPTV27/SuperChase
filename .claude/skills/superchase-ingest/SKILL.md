---
name: superchase-ingest
description: |
  Quick ingest tasks directly to SuperChase from CLI. Use when: capturing tasks,
  notes, or ideas without opening the dashboard. Supports business unit tagging
  with @mentions. Example: `sc "Call Miles @studio"` routes to Studio C.
author: Claude Code
version: 1.0.0
tags: [superchase, productivity, cli]
---

# SuperChase CLI Ingest

## Usage

```bash
# Basic ingest
sc "Follow up with client about proposal"

# Business unit tagged (auto-routes to correct Asana project)
sc "Review Blues Room contract @studio"
sc "Quote for 123 Main St scan @s2p"
sc "Upload new reel @cptv"
sc "Finalize logo options @tuthill"

# Priority flag
sc "URGENT: Server down @s2p" --priority high

# With due date
sc "Send invoice to Acme Corp @s2p" --due tomorrow
```

## Implementation

Add to `~/.zshrc` or `~/.bashrc`:

```bash
sc() {
  local note="$1"
  shift

  # Parse flags
  local priority=""
  local due=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --priority) priority="$2"; shift 2 ;;
      --due) due="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  # Extract business unit from @mention
  local business=""
  if [[ "$note" =~ @(s2p|studio|cptv|tuthill) ]]; then
    business="${BASH_REMATCH[1]}"
    note="${note//@$business/}"  # Remove tag from note
  fi

  curl -s -X POST "https://superchase-production.up.railway.app/api/tasks" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $SUPERCHASE_API_KEY" \
    -d "{\"note\": \"$note\", \"business\": \"$business\", \"priority\": \"$priority\", \"due\": \"$due\"}" \
    | jq -r '.message // "Captured!"'
}
```

## Zero-Click Variants

```bash
# Alias for common patterns
alias scfu="sc 'Follow up:' --due tomorrow"  # Follow-up template
alias scinv="sc 'Invoice:' @s2p"             # Invoice template
alias scmeet="sc 'Schedule meeting:'"         # Meeting template
```

## Voice Integration (macOS)

```bash
# Add to ~/.zshrc for Siri Shortcuts integration
sc-voice() {
  local note=$(osascript -e 'display dialog "Quick capture:" default answer ""' -e 'text returned of result')
  sc "$note"
  say "Captured"
}
```

## Verification

```bash
sc "Test ingest from CLI @s2p"
# Expected: "Captured!" or task confirmation
```
