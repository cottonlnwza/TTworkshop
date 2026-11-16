/** Read-only Cloud SQL preflight. Do not log connection strings or secrets. */
export type DbProbe = {
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
};

/** Probe only connection and expected identity; never create, seed or mutate data. */
export async function verifyCloudDbConnection(
  db: DbProbe,
  expectedUser: string = "ttworkshop_app"
): Promise<void> {
  // Fail closed: never accept an arbitrary login identity inferred from a URL
  // or a typo in a reviewed Cloud Run Job's non-secret environment variables.
  if (expectedUser !== "ttworkshop_app" && expectedUser !== "ttworkshop_migrator") {
    throw new Error("Unsupported Cloud SQL check identity");
  }
  const response = await db.query(
    "SELECT current_database() AS database_name, current_user AS role_name, 1 AS probe_ok"
  );
  const row = response.rows[0];
  if (response.rows.length !== 1 || row?.database_name !== "ttworkshop" ||
      row?.role_name !== expectedUser || Number(row?.probe_ok) !== 1) {
    throw new Error("Unexpected Cloud SQL database/user identity");
  }
}
