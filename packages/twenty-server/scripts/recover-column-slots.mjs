import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;

export const validateRecoveryTarget = (connectionString, targetDatabase) => {
  const source = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(source.protocol))
    throw new Error('PG_DATABASE_URL must be a PostgreSQL connection URL');
  const sourceDatabase = decodeURIComponent(source.pathname.slice(1));
  if (
    !sourceDatabase ||
    ['postgres', 'template0', 'template1'].includes(sourceDatabase)
  )
    throw new Error('Recovery requires an application database');
  if (
    !/^[a-z_][a-z0-9_]{0,62}$/.test(targetDatabase ?? '') ||
    ['postgres', 'template0', 'template1', sourceDatabase].includes(
      targetDatabase,
    )
  )
    throw new Error(
      'Choose a new, distinct lowercase target database name (up to 63 characters)',
    );
  const target = new URL(source);
  target.pathname = `/${targetDatabase}`;
  const administration = new URL(source);
  administration.pathname = '/postgres';
  return {
    sourceDatabase,
    targetUrl: target.href,
    administrationUrl: administration.href,
  };
};

export const COLUMN_SLOTS_QUERY = `
    SELECT n.nspname AS schema, c.relname AS table,
      max(a.attnum)::int AS slots,
      count(*) FILTER (WHERE NOT a.attisdropped)::int AS active,
      count(*) FILTER (WHERE a.attisdropped)::int AS dropped
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE a.attnum > 0 AND c.relkind IN ('r', 'p')
      AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
    GROUP BY n.nspname, c.relname ORDER BY n.nspname, c.relname
  `;

export const inspectColumnSlots = async (client) =>
  (await client.query(COLUMN_SLOTS_QUERY)).rows;

const assertNoOtherConnections = async (client) => {
  const { rows } = await client.query(`
    SELECT count(*)::int AS connections FROM pg_catalog.pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
      AND backend_type = 'client backend'
  `);
  if (rows[0].connections !== 0)
    throw new Error(
      'Stop every API, worker and database client connected to the source before recovery',
    );
};

const fingerprintTables = async (client) => {
  const { rows: tables } = await client.query(`
    SELECT n.nspname AS schema, c.relname AS table FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'm') AND n.nspname !~ '^pg_'
      AND n.nspname <> 'information_schema' ORDER BY n.nspname, c.relname
  `);
  const fingerprints = [];
  for (const table of tables) {
    const { rows } = await client.query(`
      SELECT count(*)::text AS rows,
        coalesce(sum(('x' || substr(digest, 1, 16))::bit(64)::bigint::numeric), 0)::text AS first,
        coalesce(sum(('x' || substr(digest, 17, 16))::bit(64)::bigint::numeric), 0)::text AS second
      FROM (SELECT pg_catalog.md5(pg_catalog.row_to_json(record)::text) AS digest
        FROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.table)} AS record) AS fingerprints
    `);
    fingerprints.push({ ...table, ...rows[0] });
  }
  return fingerprints;
};

export const recoverColumnSlots = async ({
  connectionString,
  targetDatabase,
  directory = fileURLToPath(
    new URL('../.local-storage/database-recovery/', import.meta.url),
  ),
  apply = false,
  postgresBinDirectory,
  log = console.log,
}) => {
  const { sourceDatabase, targetUrl, administrationUrl } =
    validateRecoveryTarget(connectionString, targetDatabase);
  const { default: pg } = await import('pg');
  const source = new pg.Client({
    connectionString,
    options:
      '-c default_transaction_read_only=on -c timezone=UTC -c datestyle=ISO',
  });
  const administration = new pg.Client({ connectionString: administrationUrl });
  let target;
  let backupDirectory;
  await source.connect();
  try {
    const {
      rows: [database],
    } = await source.query(`
      SELECT oid, pg_catalog.pg_get_userbyid(datdba) AS owner,
        pg_catalog.pg_encoding_to_char(encoding) AS encoding, datcollate, datctype,
        datlocprovider, datacl, pg_catalog.pg_database_size(oid)::text AS bytes
      FROM pg_catalog.pg_database WHERE datname = current_database()
    `);
    const { rows: existing } = await source.query(
      'SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1',
      [targetDatabase],
    );
    if (existing.length)
      throw new Error(
        'Target database already exists; it will not be overwritten',
      );
    const slots = await inspectColumnSlots(source);
    const exhausted = slots.filter((table) => table.slots >= 1500);
    log(
      JSON.stringify({
        phase: 'plan',
        sourceDatabase,
        targetDatabase,
        exhausted,
        apply,
      }),
    );
    if (!apply) return { applied: false, exhausted };
    if (!exhausted.length || exhausted.some((table) => table.dropped === 0))
      throw new Error(
        'No recoverable column-slot exhaustion found; review the schema before applying',
      );
    if (!isAbsolute(directory))
      throw new Error('Recovery backup directory must be absolute');
    const { rows: customSettings } = await source.query(
      'SELECT 1 FROM pg_catalog.pg_db_role_setting WHERE setdatabase = $1',
      [database.oid],
    );
    const { rows: foreignTables } = await source.query(
      'SELECT 1 FROM pg_catalog.pg_foreign_table LIMIT 1',
    );
    if (
      database.datlocprovider !== 'c' ||
      database.datacl !== null ||
      customSettings.length ||
      foreignTables.length
    )
      throw new Error(
        'Custom database locale, privileges, settings or foreign tables require a DBA-reviewed logical restore',
      );
    await assertNoOtherConnections(source);
    const {
      rows: [serverVersion],
    } = await source.query(
      "SELECT current_setting('server_version_num')::int / 10000 AS major",
    );
    const binaryDirectory =
      postgresBinDirectory ??
      (serverVersion.major === 16 &&
      existsSync('/usr/libexec/postgresql16/pg_dump')
        ? '/usr/libexec/postgresql16'
        : undefined);
    if (binaryDirectory && !isAbsolute(binaryDirectory))
      throw new Error('PostgreSQL binary directory must be absolute');
    const postgresPrograms = Object.fromEntries(
      ['pg_dump', 'pg_restore', 'psql'].map((program) => {
        const executable = binaryDirectory
          ? join(binaryDirectory, program)
          : program;
        const version = execFileSync(executable, ['--version'], {
          encoding: 'utf8',
        });
        if (
          Number(version.match(/PostgreSQL\) (\d+)\./)?.[1]) !==
          serverVersion.major
        )
          throw new Error(
            `Recovery requires PostgreSQL ${serverVersion.major} clients; set A2E_RECOVERY_PG_BIN to their absolute directory`,
          );
        return [program, executable];
      }),
    );
    await administration.connect();
    const {
      rows: [lock],
    } = await administration.query(
      'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
      [`a2e-column-recovery:${sourceDatabase}`],
    );
    if (!lock.acquired) throw new Error('Another recovery is already running');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const storage = statfsSync(directory, { bigint: true });
    if (storage.bavail * storage.bsize < BigInt(database.bytes) * 2n)
      throw new Error(
        'Insufficient free space in the backup directory (at least twice the database size required)',
      );
    backupDirectory = mkdtempSync(join(directory, 'column-recovery-'));
    chmodSync(backupDirectory, 0o700);
    const archive = join(backupDirectory, 'source.dump');
    const restoreSql = join(backupDirectory, 'restore.sql');
    writeFileSync(archive, '', { mode: 0o600, flag: 'wx' });
    writeFileSync(restoreSql, '', { mode: 0o600, flag: 'wx' });
    const runPostgresTool = (program, arguments_, url) => {
      try {
        const authentication = new URL(url);
        const password =
          authentication.searchParams.get('password') ??
          decodeURIComponent(authentication.password);
        authentication.password = '';
        authentication.searchParams.delete('password');
        execFileSync(
          postgresPrograms[program],
          [
            ...(program === 'pg_restore'
              ? []
              : ['--dbname', authentication.href]),
            ...arguments_,
          ],
          {
            env: {
              ...process.env,
              PGPASSWORD: password,
              PGDATABASE: decodeURIComponent(authentication.pathname.slice(1)),
              PGOPTIONS: '-c timezone=UTC -c datestyle=ISO',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 30 * 60 * 1000,
          },
        );
      } catch (error) {
        let detail =
          error instanceof Error && 'stderr' in error
            ? String(error.stderr)
            : '';
        for (const connectionUrl of [
          connectionString,
          targetUrl,
          administrationUrl,
        ]) {
          const password = new URL(connectionUrl).password;
          detail = detail.replaceAll(connectionUrl, '[database connection]');
          if (password) {
            detail = detail
              .replaceAll(password, '[redacted]')
              .replaceAll(decodeURIComponent(password), '[redacted]');
          }
        }
        throw new Error(
          `${program} failed; source and private backup are preserved; the target is not ready. ${detail.slice(0, 1500)}`,
        );
      }
    };
    await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const before = await fingerprintTables(source);
    const {
      rows: [snapshot],
    } = await source.query('SELECT pg_export_snapshot() AS id');
    log(JSON.stringify({ phase: 'backup', backupDirectory }));
    runPostgresTool(
      'pg_dump',
      [
        '--no-password',
        '--format=custom',
        '--file',
        archive,
        '--snapshot',
        snapshot.id,
      ],
      connectionString,
    );
    await assertNoOtherConnections(source);
    await administration.query(`CREATE DATABASE ${quoteIdentifier(targetDatabase)} WITH TEMPLATE template0
      OWNER ${quoteIdentifier(database.owner)} ENCODING ${quoteLiteral(database.encoding)}
      LC_COLLATE ${quoteLiteral(database.datcollate)} LC_CTYPE ${quoteLiteral(database.datctype)}`);
    log(JSON.stringify({ phase: 'restore', targetDatabase }));
    runPostgresTool('pg_restore', ['--file', restoreSql, archive], targetUrl);
    runPostgresTool(
      'psql',
      [
        '--no-password',
        '--no-psqlrc',
        '--single-transaction',
        '--set',
        'ON_ERROR_STOP=1',
        '--file',
        restoreSql,
      ],
      targetUrl,
    );
    target = new pg.Client({
      connectionString: targetUrl,
      options:
        '-c default_transaction_read_only=on -c timezone=UTC -c datestyle=ISO',
    });
    await target.connect();
    if (
      JSON.stringify(before) !== JSON.stringify(await fingerprintTables(target))
    )
      throw new Error(
        'Restored row counts or data fingerprints differ; do not switch databases',
      );
    await source.query('ROLLBACK');
    if (
      JSON.stringify(before) !== JSON.stringify(await fingerprintTables(source))
    )
      throw new Error(
        'Source changed during recovery; stop writers and repeat into a new database',
      );
    await assertNoOtherConnections(source);
    const recoveredSlots = await inspectColumnSlots(target);
    if (
      recoveredSlots.some((table) => table.dropped > 0 || table.slots >= 1500)
    )
      throw new Error(
        'Column slots were not reclaimed; do not switch databases',
      );
    const result = {
      applied: true,
      sourceDatabase,
      targetDatabase,
      backupDirectory,
      verifiedTables: before.length,
      recoveredSlots,
    };
    writeFileSync(
      join(backupDirectory, 'verified.json'),
      JSON.stringify(result, null, 2),
      { mode: 0o600, flag: 'wx' },
    );
    log(
      JSON.stringify({
        phase: 'verified',
        sourceDatabase,
        targetDatabase,
        backupDirectory,
        verifiedTables: before.length,
      }),
    );
    return result;
  } finally {
    await target?.end();
    await administration.end();
    await source.end();
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.slice(2).some((argument) => argument !== '--apply'))
      throw new Error(
        'Only --apply is supported; omit it for a read-only plan',
      );
    await recoverColumnSlots({
      connectionString: process.env.PG_DATABASE_URL,
      targetDatabase: process.env.A2E_RECOVERY_TARGET_DATABASE,
      directory: process.env.A2E_RECOVERY_DIRECTORY,
      postgresBinDirectory: process.env.A2E_RECOVERY_PG_BIN,
      apply: process.argv.includes('--apply'),
    });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Database recovery failed',
    );
    process.exitCode = 1;
  }
}
