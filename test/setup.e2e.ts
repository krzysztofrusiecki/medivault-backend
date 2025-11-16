/**
 * E2E Test Setup
 *
 * This file configures the test environment for E2E tests.
 * Runs before all tests to initialize the test database.
 */

import { setupTestDatabase, teardownTestDatabase } from "./database/setup";

// Setup test database before tests run
beforeAll(async () => {
  await setupTestDatabase();
});

// Cleanup after tests
afterAll(async () => {
  await teardownTestDatabase();
});
