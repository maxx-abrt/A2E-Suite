#!/bin/bash
# Create an admin API key for the Apple workspace via REST, print raw key.
set -euo pipefail
TOKEN=$(PRINT_TOKEN=1 node tasks/live-verify/gql.mjs /dev/stdin <<'EOF' 2>&1 >/dev/null | sed 's/^token: //'
{currentWorkspace{id}}
EOF
)
curl -s -X POST http://localhost:3000/rest/metadata/apiKeys \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"tier2-live-verify-2","expiresAt":"2126-09-22T00:00:00.000Z","roleId":"41dce934-77a6-4f98-a633-557c7533ca60"}' | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);console.log(j.apiKeyToken ?? JSON.stringify(j).slice(0,300));}
  catch(e){console.log('parse-error: '+d.slice(0,300));}
});"
