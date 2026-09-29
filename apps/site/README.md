# Rivet CPQ
Responsive website for Welles Ruhlin, using the original Rivet identity.

## Included
Interactive sample configurator with two finishes, three lengths, sample pricing, build review, and build-sheet download; a full ON3P concept at /demo; the $3,000 + $299/month founding offer; and a working product-request form with optional catalog/photo upload.

Requests persist in D1 (concept_requests). Files persist privately in R2. The form validates on the server, checks file signatures, limits uploads to 5 MB, and protects against duplicate submissions. No public endpoint lists inquiries or files.

## Development
Node 22.13+:
- npm ci
- npm run dev
- npm run build

The preview runs at http://127.0.0.1:5173.
For a fresh local database, build first, then run:
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_real_havok.sql
Do not replay that migration against an initialized database.

## Owner workflow
Use the private Sites database tools to inspect concept_requests. Ask Codex to review new Rivet concept requests.
Stored stages: new, reviewed, concept, shared, proposal, customer. This version has no browser administration screen.
It does not automatically email, scrape submitted links, or generate concepts. Welles reviews fit and follows up; an inbox integration is the next step after choosing the domain and business email.

## Hosting
Project: appgprj_6abad0b85e3c8191afb28f6a6136d71f
D1 binding: DB. R2 binding: BUCKET.
Worker: dist/server/index.js. Assets: dist/client.
Deployment archives must preserve dist/.openai/hosting.json and dist/.openai/drizzle. On Windows, package the completed build with `node scripts/package-portable.mjs ABSOLUTE_ARCHIVE_PATH.tar.gz` to retain the database migrations.
The review deployment is private. Public launch and custom domain are separate release steps.
The source is portable; another host needs equivalent storage bindings.

## Assets and disclosures
The homepage skis are original illustrative renders, not merchandise; sample prices are fictional.
The full ON3P demo is independently hosted by Welles. Its artwork and names belong to their respective owners. It has no affiliation/endorsement claim.
No analytics, payments, or invented testimonials were added.

## Verification
TypeScript and production build; browser QA at 1440×1000 and 390×844 CSS pixels; finish/length/build-summary behavior; mobile menu; embedded demo interaction; local inquiry and upload persistence; invalid input/file checks; idempotency; cross-origin rejection; GET denial. WebMCP form preparation was tested for valid and invalid input.
Local test data stays in ignored .wrangler state and is excluded from deployment.
