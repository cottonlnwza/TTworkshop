/** Read-only Cloud SQL preflight. Do not log connection strings or secrets. */
export type DbProbe = {
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
};

/** Probe only connection and expected identity; never create, seed or mutate data. */
export async function verifyCloudDbConnection(db: DbProbe): Promise<void> {
  const response = await db.query(
    "SELECT current_database() AS database_name, current_user AS role_name, 1 AS probe_ok"
  );
  const row = response.rows[0];
  if (row?.database_name !== "ttworkshop" || row?.role_name !== "ttworkshop_app" || Number(row?.probe_ok) !== 1) {
    throw new Error("Unexpected Cloud SQL database/user identity");
  }
}
