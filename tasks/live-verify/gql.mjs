// Live-verify helper: authenticated GraphQL against the running server.
// Usage: node gql.mjs <query> [jsonVariables]  (TOKEN env, or auto sign-in)
import { readFileSync } from 'node:fs';

// Auth mutations live on /metadata; workspace-object queries on /graphql. Both
// stay configurable so the same helper serves either surface.
const SERVER = process.env.SERVER_URL ?? 'http://localhost:3000/metadata';
const AUTH_SERVER = 'http://localhost:3000/metadata';
const EMAIL = process.env.LV_EMAIL ?? 'tim@apple.dev';
const PASSWORD = process.env.LV_PASSWORD ?? 'tim@apple.dev';
const ORIGIN = process.env.LV_ORIGIN ?? 'http://localhost:3001';

async function rawPost(body, token) {
  const res = await fetch(SERVER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function rawPostAuth(body) {
  const res = await fetch(AUTH_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getAccessToken() {
  const login = await rawPostAuth({
    query: `mutation($email:String!,$password:String!,$origin:String!){
      getLoginTokenFromCredentials(email:$email,password:$password,origin:$origin){
        loginToken{token}}}`,
    variables: { email: EMAIL, password: PASSWORD, origin: ORIGIN },
  });
  const loginToken = login.data?.getLoginTokenFromCredentials?.loginToken?.token;
  if (!loginToken) throw new Error('login failed: ' + JSON.stringify(login.errors ?? login));

  const tokens = await rawPostAuth({
    query: `mutation($loginToken:String!,$origin:String!){
      getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin){
        tokens{accessOrWorkspaceAgnosticToken{token}}}}`,
    variables: { loginToken, origin: ORIGIN },
  });
  const accessToken =
    tokens.data?.getAuthTokensFromLoginToken?.tokens?.accessOrWorkspaceAgnosticToken?.token;
  if (!accessToken) throw new Error('token exchange failed: ' + JSON.stringify(tokens.errors ?? tokens));
  return accessToken;
}

const token = process.env.TOKEN ?? (await getAccessToken());
const query = readFileSync(process.argv[2] ?? '/dev/stdin', 'utf8');
const variables = process.argv[3] ? JSON.parse(process.argv[3]) : {};

const result = await rawPost({ query, variables }, token);
if (process.env.PRINT_TOKEN === '1') console.error('token: ' + token);
if (result.errors) {
  console.error('ERRORS: ' + JSON.stringify(result.errors, null, 2));
}
console.log(JSON.stringify(result.data, null, 2));
