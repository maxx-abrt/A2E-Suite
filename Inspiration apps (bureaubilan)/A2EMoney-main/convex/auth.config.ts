// WorkOS AuthKit — server-side configuration for validating access tokens.
// Convex trusts JWTs issued by WorkOS so that ctx.auth.getUserIdentity() works.
//
// IMPORTANT: WorkOS AuthKit access tokens carry the *environment* issuer client
// id in their `iss` claim, which can differ from the application `client_id`
// used for the login flow (they share the same JWKS). After rotating the app
// client, the token issuer stays on the environment client, so the issuer used
// for validation must NOT be derived from WORKOS_CLIENT_ID alone.
const clientId = process.env.WORKOS_CLIENT_ID;
// Client id that WorkOS puts in the token `iss` (environment issuer). Overridable
// via a Convex env var; defaults to the observed environment issuer client.
const issuerClientId =
  process.env.WORKOS_ISSUER_CLIENT_ID ?? "client_01KVFSBWRCMSW7V0NB63DVQRHC";

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${issuerClientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    // Safety net: accept tokens issued under the app client id too, in case the
    // environment ever issues tokens with the app client in `iss`.
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};

export default authConfig;
