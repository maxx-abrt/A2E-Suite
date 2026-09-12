keyID:
REDACTED_B2_KEY_ID
keyName:
A2E-Drive
applicationKey:
REDACTED_B2_APPLICATION_KEY



Read and understand everything carefully before thinking and planning.
You are pro dev full stack for 10 years, very high efficiency and intelligence. You are creative, innovative and you find new ways and approchaces to make intuitive apps, aesthetic and modern apps, which are also mobile first, responsive and very very much intuitive. You are efficient for coding, do not speak for nothing, low token usage and best optimisation for tokens and tools (best new edge and most recent tools, mcps, apis, libraries, etc...

Use the github repo at : https://github.com/maxx-abrt/A2EMoney.git

Use main branch

Here is pat you need, it is private :

github_pat_REDACTED

Clone it, ensure at the end you push, commit and sync smoothly with user : maxaubert17@gmail.com and user : maxx.abrt

Organise as you want, you will have to add it all so ensure you use what you need and work as you wish.

If needed, here is the .env (with both postgre and convex dbs, there is already content so don't seed and don't truncate or remove things, you can change Dbs as you need for your features):
Env from the convex environments :
AUTH_GOOGLE_ID=REDACTED_GOOGLE_OAUTH_CLIENT_ID
AUTH_GOOGLE_SECRET=REDACTED_GOOGLE_OAUTH_SECRET
AUTH_RESEND_FROM=A2E <auth@association2e.org>
AUTH_RESEND_KEY=REDACTED_RESEND_API_KEY
AUTH_SECRET=REDACTED_AUTH_SECRET
B2_APPLICATION_KEY=REDACTED_B2_APPLICATION_KEY
B2_BUCKET_NAME=A2E-Drive
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
B2_KEY_ID=REDACTED_B2_KEY_ID
B2_REGION=eu-central-003
JWKS={"keys":[{"kty":"RSA","n":"lH9Xy53U7IisijYddP7RLKjbMDEx7i1DzDVuS_6xgzVsiju5dXHyQ0da8GGs4K3AiALA3JfVwbPjyjcnBaEdHkmukj-GHckee1TGeGzFFwsfWIwx2wthQBFOUG2wiKQU3fgdSkPmxxprhP5Z-qFyxrkAprfYs4CMv8IXz3jVbv9bim7Zzvgb4FX0gWmbd_4hFfMIMj81a23Zje_5m8eliDwLNnfChg08qTXeL01NB0v9TqeELTrtFAFEOLXoyErurjO4hTYYLjffhWSaSLLUPV5cEkmZPs8J74tyjDJVBZo0Fe7z90ctTbkoDgHQvOTKR1172lKwY0BGd_SMySAFkQ","e":"AQAB","use":"sig","kid":"key1","alg":"RS256"}]}
JWT_PRIVATE_KEY='REDACTED_JWT_PRIVATE_KEY'
S3_BUCKET_NAME=finflow-documents-a2e
SITE_URL=https://a2e-money.vercel.app
WORKOS_API_KEY=REDACTED_WORKOS_API_KEY
WORKOS_CLIENT_ID=client_01KV3J2M42HT3P59CBKMQMZ998

Cloud URL
https://academic-stoat-784.eu-west-1.convex.cloud
HTTP Actions URL
https://academic-stoat-784.eu-west-1.convex.site


NEXT_PUBLIC_SITE_URL=http://localhost:3000


# For convex-auth (same OAuth credentials, same auth domain)
# Set up ONE Google OAuth app with multiple authorized redirect URIs:
#   http://localhost:3000/api/auth/callback/google    (A2EMoney dev)
#   http://localhost:3001/api/auth/callback/google    (App 2 dev)
#   https://a2e.app/api/auth/callback/google          (A2EMoney prod)
#   https://crm.a2e.app/api/auth/callback/google      (App 2 prod)
AUTH_GOOGLE_ID=REDACTED_GOOGLE_OAUTH_CLIENT_ID
AUTH_GOOGLE_SECRET=REDACTED_GOOGLE_OAUTH_SECRET

# For magic links (Resend)
# Make sure association2e.org is verified in your Resend dashboard
AUTH_RESEND_FROM=A2E Money <auth@association2e.org>
AUTH_RESEND_KEY=REDACTED_RESEND_API_KEY

# JWT secret (shared across all apps — they all verify the same tokens)
# Generate once: openssl rand -base64 32
AUTH_SECRET=REDACTED_AUTH_SECRET

# Optional: same-site cookie config
prod:academic-stoat-784|REDACTED_CONVEX_DEPLOY_KEY

Here are features/askings list, to get clean, planned and smooth.
I want you to make a major redesign : rework all colours, elements, fonts, etc...
I will provide you with the details.
First you hvae linked here the design system of the other app from the suite (they must be similar, just the main colour will change). in structure, elements, cards, buttons, fonts, etc...
I want you to although keep an identity to the app : best app possible, clean and sleek, modern, working and responsive.
Also, see to make a major rework of the features and how each ones work together.
I want the app to be intuitive, all interconnected and smartly linked together, no weird features or hunderds of useless features. See how to make the app easy, intuitive, accessible.
I want it to work well : access auto handled sheet, like for google sheets, with custom columns etc... really working like sheets.
Smart, linking things together, expenses, link expenses with files uploaded via configuration to the s3 (from backblaze I think).
Auto link things, make this easier to handle, securise everything, make sure it is collaborative and smooth working well, live etc...
Clean reports, useful markers, ready for companies and non profits.

I also want to enable users to handle all of the treasurery inside the app :
Auto create budgets à l'équilibre, add things, customize, create inside the app : cerfa, project files, etc... To request subventions, to give the report after, make the point etc...
All necessary utilities, files, documents, etc... I really want the best thing, utility, legal documents, real elements, smart, cerfa and legally required documents, all in the same app.

I want responsive web app, mobile first, optimised, beautiful and very well made.
The app is now called Bilan, make sure it is everywehre, use iconsax bulk everywhere, cleanly.
Main colour accent must be :
#8590C8

Make sure it is graceful, cleanly, auth all works well and is setuped with workos, etc...
Think of pushing and syncing to github cleanly and regularly.


Read and understand everything carefully before thinking and planning.
You are pro dev full stack for 10 years, very high efficiency and intelligence. You are creative, innovative and you find new ways and approchaces to make intuitive apps, aesthetic and modern apps, which are also mobile first, responsive and very very much intuitive. You are efficient for coding, do not speak for nothing, low token usage and best optimisation for tokens and tools (best new edge and most recent tools, mcps, apis, libraries, etc...

Use the github repo at : https://github.com/maxx-abrt/A2EMoney.git

Use main branch

Here is pat you need, it is private :

github_pat_REDACTED

Clone it, ensure at the end you push, commit and sync smoothly with user : maxaubert17@gmail.com and user : maxx.abrt

Organise as you want, you will have to add it all so ensure you use what you need and work as you wish.

If needed, here is the .env (with both postgre and convex dbs, there is already content so don't seed and don't truncate or remove things, you can change Dbs as you need for your features):
Env from the convex environments :
AUTH_GOOGLE_ID=REDACTED_GOOGLE_OAUTH_CLIENT_ID
AUTH_GOOGLE_SECRET=REDACTED_GOOGLE_OAUTH_SECRET
AUTH_RESEND_FROM=A2E <auth@association2e.org>
AUTH_RESEND_KEY=REDACTED_RESEND_API_KEY
AUTH_SECRET=REDACTED_AUTH_SECRET
B2_APPLICATION_KEY=REDACTED_B2_APPLICATION_KEY
B2_BUCKET_NAME=A2E-Drive
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
B2_KEY_ID=REDACTED_B2_KEY_ID
B2_REGION=eu-central-003
JWKS={"keys":[{"kty":"RSA","n":"lH9Xy53U7IisijYddP7RLKjbMDEx7i1DzDVuS_6xgzVsiju5dXHyQ0da8GGs4K3AiALA3JfVwbPjyjcnBaEdHkmukj-GHckee1TGeGzFFwsfWIwx2wthQBFOUG2wiKQU3fgdSkPmxxprhP5Z-qFyxrkAprfYs4CMv8IXz3jVbv9bim7Zzvgb4FX0gWmbd_4hFfMIMj81a23Zje_5m8eliDwLNnfChg08qTXeL01NB0v9TqeELTrtFAFEOLXoyErurjO4hTYYLjffhWSaSLLUPV5cEkmZPs8J74tyjDJVBZo0Fe7z90ctTbkoDgHQvOTKR1172lKwY0BGd_SMySAFkQ","e":"AQAB","use":"sig","kid":"key1","alg":"RS256"}]}
JWT_PRIVATE_KEY='REDACTED_JWT_PRIVATE_KEY'
S3_BUCKET_NAME=finflow-documents-a2e
SITE_URL=https://a2e-money.vercel.app
WORKOS_API_KEY=REDACTED_WORKOS_API_KEY
WORKOS_CLIENT_ID=client_01KV3J2M42HT3P59CBKMQMZ998

Cloud URL
https://academic-stoat-784.eu-west-1.convex.cloud
HTTP Actions URL
https://academic-stoat-784.eu-west-1.convex.site


NEXT_PUBLIC_SITE_URL=http://localhost:3000


# For convex-auth (same OAuth credentials, same auth domain)
# Set up ONE Google OAuth app with multiple authorized redirect URIs:
#   http://localhost:3000/api/auth/callback/google    (A2EMoney dev)
#   http://localhost:3001/api/auth/callback/google    (App 2 dev)
#   https://a2e.app/api/auth/callback/google          (A2EMoney prod)
#   https://crm.a2e.app/api/auth/callback/google      (App 2 prod)
AUTH_GOOGLE_ID=REDACTED_GOOGLE_OAUTH_CLIENT_ID
AUTH_GOOGLE_SECRET=REDACTED_GOOGLE_OAUTH_SECRET

# For magic links (Resend)
# Make sure association2e.org is verified in your Resend dashboard
AUTH_RESEND_FROM=A2E Money <auth@association2e.org>
AUTH_RESEND_KEY=REDACTED_RESEND_API_KEY

# JWT secret (shared across all apps — they all verify the same tokens)
# Generate once: openssl rand -base64 32
AUTH_SECRET=REDACTED_AUTH_SECRET

# Optional: same-site cookie config
prod:academic-stoat-784|REDACTED_CONVEX_DEPLOY_KEY

Here are features/askings list, to get clean, planned and smooth.
I want you to make a major redesign : rework all colours, elements, fonts, etc...
I will provide you with the details.
First you hvae linked here the design system of the other app from the suite (they must be similar, just the main colour will change). in structure, elements, cards, buttons, fonts, etc...
I want you to although keep an identity to the app : best app possible, clean and sleek, modern, working and responsive.
Also, see to make a major rework of the features and how each ones work together.
I want the app to be intuitive, all interconnected and smartly linked together, no weird features or hunderds of useless features. See how to make the app easy, intuitive, accessible.
I want it to work well : access auto handled sheet, like for google sheets, with custom columns etc... really working like sheets.
Smart, linking things together, expenses, link expenses with files uploaded via configuration to the s3 (from backblaze I think).
Auto link things, make this easier to handle, securise everything, make sure it is collaborative and smooth working well, live etc...
Clean reports, useful markers, ready for companies and non profits.

I also want to enable users to handle all of the treasurery inside the app :
Auto create budgets à l'équilibre, add things, customize, create inside the app : cerfa, project files, etc... To request subventions, to give the report after, make the point etc...
All necessary utilities, files, documents, etc... I really want the best thing, utility, legal documents, real elements, smart, cerfa and legally required documents, all in the same app.

I want responsive web app, mobile first, optimised, beautiful and very well made.
The app is now called Bilan, make sure it is everywehre, use iconsax bulk everywhere, cleanly.
Main colour accent must be :
#8590C8

Make sure it is graceful, cleanly, auth all works well and is setuped with workos, etc...
Think of pushing and syncing to github cleanly and regularly.
