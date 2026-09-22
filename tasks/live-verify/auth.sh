#!/bin/bash
# Live-verify helper: password loginToken -> workspace access token.
# Usage: auth.sh [email] [password] [origin]
set -euo pipefail
EMAIL="${1:-tim@apple.dev}"
PASSWORD="${2:-tim@apple.dev}"
ORIGIN="${3:-http://localhost:3001}"

RESP=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation(\$email:String!,\$password:String!,\$origin:String!){getLoginTokenFromCredentials(email:\$email,password:\$password,origin:\$origin){loginToken{expiresAt,token}}}\",\"variables\":{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"origin\":\"$ORIGIN\"}}")

LOGIN_TOKEN=$(echo "$RESP" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  if(j.errors){console.error(JSON.stringify(j.errors));process.exit(1);}
  const t=j.data.getLoginTokenFromCredentials.loginToken.token;
  if(!t){console.error('no token');process.exit(1);}
  console.log(t);
});")

RESP2=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation(\$loginToken:String!,\$origin:String!){getAuthTokensFromLoginToken(loginToken:\$loginToken,origin:\$origin){tokens{accessToken{expiresAt,token}}}}\",\"variables\":{\"loginToken\":\"$LOGIN_TOKEN\",\"origin\":\"$ORIGIN\"}}")

echo "$RESP2" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  if(j.errors){console.error(JSON.stringify(j.errors));process.exit(1);}
  const t=j.data.getAuthTokensFromLoginToken.tokens.accessToken.token;
  if(!t){console.error('no access token');process.exit(1);}
  console.log(t);
});"
