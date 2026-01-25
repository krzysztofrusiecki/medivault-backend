# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MediVault** is a NestJS backend application for collecting, managing, and analyzing laboratory test results. The system allows users to track health metrics over time with support for custom test panels, reference ranges, and downloadable PDF reports.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Validation**: Zod (environment + DTOs)
- **Authentication**: JWT (access tokens + HttpOnly refresh cookies), Argon2 for passwords
- **Package Manager**: pnpm
- **Testing**: Jest (unit tests configured in package.json)
- **Code Quality**: ESLint, Prettier, TypeScript (strict mode)

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

### Testing

- `pnpm test` - Run all unit tests matching `*.spec.ts`
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage report
- `pnpm test:e2e` - Run end-to-end tests (config in test/jest-e2e.json)
- `pnpm test:debug` - Debug tests with inspector

## Project Structure

```
src/
  ├── main.ts              # Application entry point
  ├── app.module.ts        # Root module (imports feature modules)
  ├── app.controller.ts    # Health check & root routes
  ├── app.service.ts       # Core app logic
  └── config/              # Configuration (environment, validators, etc.)
```

## Architecture Notes

### Module Organization

- The application is modular using NestJS conventions
- Root `AppModule` imports feature modules
- Each feature should have its own module, controller, service, and DTO files

### Configuration

- Environment variables should be validated using Zod
- Configuration utilities should be placed in `src/config/`
- Never commit `.env` files (use `.env.example` instead)

### Testing Strategy

- Unit tests colocate with source files as `*.spec.ts`
- E2E tests located in `test/` directory
- Jest is configured to run tests from `src` directory
- Test coverage reports generated in `coverage/` directory

### Build Output

- TypeScript compiles to `dist/` directory
- NestJS CLI (`nest-cli.json`) is configured to delete outDir on rebuild for clean builds

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
