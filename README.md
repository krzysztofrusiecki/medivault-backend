# MediVault

**MediVault** is a web application (with a future mobile extension) designed to **collect, manage, and analyze laboratory test results** such as blood tests.  
The goal is to provide individuals with a clear view of their health data over time — with trends, reference ranges, and downloadable reports.

---

## Project Overview

MediVault allows users to:

- Manually enter results for individual or grouped tests (panels),
- View historical results in tables and charts,
- Compare values against reference ranges,
- Configure custom test panels,
- Generate downloadable PDF reports with data tables and trend charts.

The app is focused on simplicity, accuracy, and scalability — built for users who want a private, self-hosted solution for managing lab data.

---

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma
- **Database:** PostgreSQL (in-memory for testing)
- **Validation:** Zod (for `.env` and DTOs)
- **Auth:** JWT (access + refresh cookies), Argon2 password hashing
- **Package manager:** pnpm

## Configuration

- Environment variables validated with **Zod**.
- Uses **pnpm** for dependency management and workspace support.
- Code quality via **TypeScript**, **ESLint**, and **Prettier**.
- Authentication handled with **JWT access tokens** and **HttpOnly refresh cookies**.
