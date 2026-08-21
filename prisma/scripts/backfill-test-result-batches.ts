import { Prisma, PrismaClient, TestBatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

const CHUNK_SIZE = 500;
const MIGRATED_LAB_LABEL = "Migrated result";

interface LegacyTestResultRow {
  id: string;
  userId: string;
  sampleDate: Date;
}

/**
 * Data-migration step for MV-23 (expand/contract).
 *
 * Creates a one-off, self-reported TestBatch for every TestResult that
 * doesn't yet have one, then points the result at it. Must run after the
 * expand migration (nullable batchId added) and before the contract
 * migration (userId/sampleDate dropped) — it reads/writes those legacy
 * columns via raw SQL rather than the generated Prisma Client, because the
 * client only ever reflects the current schema.prisma and those columns
 * are gone from it once the contract migration lands.
 *
 * Idempotent and safe to re-run or interrupt: each row is only picked up
 * while batchId is still null, and the batch-create + result-update happen
 * in one transaction, so a crash never leaves a result half-migrated. If
 * the legacy columns are already gone (contract migration already applied,
 * or nothing left to backfill), it's a no-op.
 *
 * Run with: pnpm db:backfill-test-result-batches
 */
async function main() {
  if (!(await legacyColumnsExist())) {
    console.log(
      "Legacy userId/sampleDate columns are gone — nothing to backfill.",
    );
    return;
  }

  let totalMigrated = 0;

  for (;;) {
    const rows = await prisma.$queryRaw<LegacyTestResultRow[]>(
      Prisma.sql`SELECT id, "userId", "sampleDate" FROM test_results WHERE "batchId" IS NULL LIMIT ${CHUNK_SIZE}`,
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      await prisma.$transaction(async (tx) => {
        const batch = await tx.testBatch.create({
          data: {
            userId: row.userId,
            labLabel: MIGRATED_LAB_LABEL,
            sampleDate: row.sampleDate,
            status: TestBatchStatus.ACCEPTED,
          },
        });

        await tx.$executeRaw`UPDATE test_results SET "batchId" = ${batch.id} WHERE id = ${row.id}`;
      });
    }

    totalMigrated += rows.length;
    console.log(`Backfilled ${rows.length} rows (${totalMigrated} total)`);
  }

  console.log(`Done. Backfilled ${totalMigrated} test result(s).`);
}

async function legacyColumnsExist(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
    Prisma.sql`SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'test_results' AND column_name = 'userId'
    ) AS exists`,
  );
  return rows[0]?.exists ?? false;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Backfill failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
