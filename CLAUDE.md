# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MediVault** is a NestJS backend application for collecting, managing, and analyzing laboratory test results. The system allows users to track health metrics over time with support for custom test panels, reference ranges, and downloadable PDF reports.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma, **Database**: PostgreSQL
- **Validation**: Zod (environment), class-validator/class-transformer (DTOs)
- **Authentication**: Passport (local + JWT strategies), JWT access tokens only — no refresh tokens or cookies yet. Argon2 for password hashing.
- **API Docs**: Swagger/OpenAPI via `@nestjs/swagger`, served at `/api/docs`
- **Package Manager**: pnpm
- **Testing**: Jest (unit tests colocated as `*.spec.ts`), Supertest for e2e
- **Code Quality**: ESLint, Prettier, TypeScript (strict mode)
- **Path alias**: `@/` maps to `src/` (see `tsconfig.json`, mirrored in Jest `moduleNameMapper`)

## Common Development Commands

### Build & Run

- `pnpm build` - Compile TypeScript to dist/
- `pnpm start` - Run compiled application
- `pnpm start:dev` - Development mode with watch
- `pnpm start:debug` - Debug mode with inspector enabled
- `pnpm start:prod` - Run optimized production build

### Code Quality

- `pnpm lint` - Run ESLint with automatic fixes
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type-check without emitting (`tsc --noEmit`)

### Testing

- `pnpm test` - Run all unit tests matching `*.spec.ts`
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage report
- `pnpm test:e2e` - Run end-to-end tests (config in test/jest-e2e.json)
- `pnpm test:debug` - Debug tests with inspector

### Database (Prisma)

- `pnpm db:generate` - Regenerate the Prisma client after a schema change
- `pnpm db:migrate` - Create/apply a dev migration (`prisma migrate dev`)
- `pnpm db:seed` - Seed the database (`prisma/seed.ts`)
- `pnpm db:studio` - Open Prisma Studio

## Project Structure

```
src/
  ├── main.ts                       # Entry point: global prefix "api", ValidationPipe, CORS, Swagger at /api/docs
  ├── app.module.ts                 # Root module — wires up ConfigModule + PrismaModule + feature modules
  ├── common/
  │   ├── decorators/                # @CurrentUser(), @Roles(...roles)
  │   └── dto/                       # PaginationQueryDto, PaginatedResponseDto<T>
  ├── config/
  │   ├── schema.ts                  # Zod envSchema (NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRATION, CORS_ORIGIN)
  │   └── configuration.ts           # validateEnv(), passed to ConfigModule.forRoot({ validate })
  ├── infrastructure/prisma/         # PrismaService (OnModuleInit/Destroy) + PrismaModule
  └── modules/
      ├── users/                     # Service only, no controller — consumed internally by auth
      ├── auth/                      # Passport local + JWT strategies, guards, sign-up/sign-in/me
      ├── analytes/                  # Lab measurement types (e.g. "Prolactin"), CRUD, role-guarded
      ├── analyte-units/             # Units of measure + conversion factors per analyte, nested under /analytes/:analyteId/units
      └── test-results/              # Patient-entered values: numeric/text creation, pagination, unit conversion
```

There is no root `app.controller.ts`/`app.service.ts` — no health-check or root route exists. Each feature module lives under `src/modules/<name>/` with its own `*.module.ts`, `*.controller.ts` (if it has HTTP routes), `*.service.ts`, `dto/`, and a barrel `index.ts`.

## Domain Model (Prisma)

Schema at `prisma/schema.prisma`.

## Architecture Notes

### Authentication & Authorization

- Passport `LocalStrategy` (email/password → `AuthService.validateUser`) and `JwtStrategy` (Bearer token, validated against `JWT_SECRET`) back `LocalGuard`/`JwtGuard`.
- `AuthService.generateAccessToken()` signs a JWT (`{ sub, email, role }`) with a hardcoded `24h` expiry in `AuthModule`'s `JwtModule.registerAsync` — note this does **not** read the `JWT_EXPIRATION` env var even though that var is validated in `config/schema.ts`.
- **No refresh tokens, cookies, or logout endpoint exist yet.** Access-token-only. Refresh-token/cookie hardening is a planned future item (see Roadmap).
- RBAC via `@Roles(...roles)` + `RolesGuard` (reads metadata via `Reflector`), applied per-route or at controller level (e.g. `analyte-units` is `SUPER_ADMIN`-only at the class level).
- `@CurrentUser()` pulls the authenticated user off `request.user` after a guard runs.

### API Documentation

- Swagger is fully wired in `main.ts` (`DocumentBuilder`, `.addBearerAuth()`, served at `/api/docs`). All controllers use `@ApiTags`/`@ApiOperation`/`@ApiResponse` decorators — follow this pattern for any new endpoint.
- Global API prefix is `api`; global `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })`; CORS origin comes from `CORS_ORIGIN`.

### Configuration

- Environment variables are validated using Zod (`src/config/schema.ts`), wired into `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`.
- Never commit `.env` files (use `.env.example` instead).

### Testing Strategy

- Unit tests colocate with source as `*.spec.ts` and currently cover **services only**. There are no controller-level unit tests.
- E2E tests live in `test/` (config `test/jest-e2e.json`) but are currently a stub — a single smoke test that boots `AppModule` with no real HTTP assertions against endpoints, despite `supertest` being available. Don't assume endpoint behavior is verified end-to-end; write real request-level e2e tests when adding significant new endpoints.
- CI (`.github/workflows/ci.yml`) runs lint, type-check, and unit tests — **not** `test:e2e`.

### Build Output

- TypeScript compiles to `dist/` directory.
- NestJS CLI (`nest-cli.json`) is configured to delete outDir on rebuild for clean builds.

## Roadmap

Per the README, in priority order:

1. **Test batches & labs** — group results under a shared date/lab, introduces use of the `LAB_ADMIN` role.
2. **Reference ranges** — compare results against normal ranges.
3. **Auth hardening** — refresh tokens with HttpOnly cookies, logout, token rotation.

Parked for later: PDF report generation, extracting results from photos/PDFs.

## Known Gaps

- `JWT_EXPIRATION` env var is validated but unused — token expiry is hardcoded to `24h`.
- No global exception filter, logging interceptor, or middleware beyond the single global `ValidationPipe`.
- E2E suite is a placeholder (see Testing Strategy above).

## ESLint & Prettier Configuration

- ESLint configured with TypeScript and strict type checking
- Prettier integrated as ESLint plugin with `endOfLine: "auto"`
- Specific rules relaxed for NestJS patterns:
  - `@typescript-eslint/no-explicit-any`: off
  - `@typescript-eslint/no-floating-promises`: warn
  - `@typescript-eslint/no-unsafe-argument`: warn
- Always run `pnpm lint` after making changes to ensure consistency

## Important Setup Notes

- Application listens on `PORT` env variable (defaults to 3000)
- TypeScript strict mode enabled - all implicit any is forbidden
- Use Node.js ES modules (`nodenext` in tsconfig)
- Decorator metadata emission enabled for NestJS dependency injection

## Git

- Commit message should be short (1 line)
