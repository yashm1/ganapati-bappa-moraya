# Ganapati Bappa Moraya

An open community map for Ganapati pandal hopping.

The goal is to help people discover pandals, plan routes, share useful local details, and see recent crowd conditions during Ganesh Chaturthi. The map is not limited to one city: contributors can add pandals from any valid location.

## What Works Today

- Interactive 3D-capable community map
- Regional clustering and photo pins
- Searchable, responsive pandal directory
- Eco-friendly badges and community crowd reports
- Geolocated photo submissions
- Persistent community submissions

## Stack

- Next.js 16 and React 19
- MapLibre GL JS with OpenFreeMap tiles
- Next.js API routes deployed on Vercel
- Neon Postgres provisioned through the Vercel Marketplace
- Vercel Blob for uploaded photos
- Drizzle ORM for the database schema and migrations

## Local Development

### Prerequisites

- Node.js 22.13 or newer
- npm

No map API key is required. The API routes need a Postgres database and a Vercel Blob store.

### Run Locally

```bash
git clone https://github.com/dips4982/ganapati-bappa-moraya.git
cd ganapati-bappa-moraya
npm install
npx vercel env pull .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development server supports hot reload, so browser changes appear as files are edited.

If you are not linking the local checkout to Vercel, copy `.env.example` to `.env.local` and provide a Neon `DATABASE_URL` and a Vercel `BLOB_READ_WRITE_TOKEN`.

### Vercel Setup

1. Import this repository into Vercel and use `main` as the production branch.
2. In Storage, create a Neon Postgres database through the Vercel Marketplace. Its `DATABASE_URL` must be available in Preview and Production. The CLI equivalent is `vercel integration add neon --name bappa-map-db --plan free`.
3. In Storage, create a public Vercel Blob store and expose `BLOB_READ_WRITE_TOKEN` to Preview and Production. The CLI equivalent is `vercel blob create-store bappa-map-images --access public`.
4. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions secrets. The workflow also needs the Vercel project to have `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` configured for both Preview and Production.
5. Configure a Neon preview branch or separate preview database before merging pull requests.

The `vercel-build` script runs `drizzle-kit migrate` before `next build`, so the Vercel build creates the schema on a new database and applies later migrations on every deployment. The `postgres` development dependency makes Drizzle Kit use its standard PostgreSQL driver for CLI/CI migrations; the app itself continues to use Neon’s HTTP driver at runtime. Vercel’s Marketplace provisions the database; the repository provisions its tables through Drizzle migrations.

The GitHub workflow at `.github/workflows/vercel.yml` runs lint and tests for pull requests and pushes. It uses `vercel env run` during the build because sensitive Vercel variables are replaced with `[SENSITIVE]` placeholders by `vercel pull`; this keeps `DATABASE_URL` available to migrations without writing its value to the workspace. It creates preview deployments for pull requests from this repository and production deployments for pushes to `main`. Fork pull requests are validated but are not deployed because GitHub does not expose repository secrets to them. If Vercel’s native Git integration is enabled for this repository, disable one of the two deployment mechanisms to avoid duplicate deployments.

### Local Data

Local records and uploads use the database and Blob store configured in `.env.local`.

Location access is required when adding a pandal. Browsers allow geolocation on `localhost`; approve the location prompt when testing submissions.

### Validate Changes

```bash
npm run lint
npm test
```

`npm test` creates a production build and runs the rendered application tests.

To generate and apply database changes locally:

```bash
npm run db:generate
npm run db:migrate
```

## Project Layout

```text
app/                  React pages, map experience, and API routes
db/                   Neon Postgres client and schema
drizzle/              PostgreSQL migrations
public/               Static images and icons
tests/                Rendered application tests
.github/workflows/    Validation and Vercel deployment pipeline
```

## Contributing

1. Create a branch from `main`.
2. Run the app locally and keep changes focused.
3. Run `npm run lint` and `npm test`.
4. Open a pull request describing the user-facing change and how it was tested.

Community submissions currently enter the database with a `pending` status. A moderation interface and public approval workflow are planned before a broader public launch.
