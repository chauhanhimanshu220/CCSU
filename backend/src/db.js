const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "..", "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(path.join(dataDirectory, "recruitment.db"));

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    login_id TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    session_token TEXT,
    personal_details TEXT NOT NULL DEFAULT '{}',
    education_details TEXT NOT NULL DEFAULT '{}',
    documents TEXT NOT NULL DEFAULT '{}',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_details TEXT NOT NULL DEFAULT '{}',
    application_status TEXT NOT NULL DEFAULT 'draft',
    current_step TEXT NOT NULL DEFAULT 'personal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_at TEXT
  );
`);

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function stringifyJson(value) {
  return JSON.stringify(value ?? {});
}

const selectLegacyNameRowsStatement = db.prepare(`
  SELECT id, personal_details
  FROM applicants
  WHERE personal_details LIKE '%"fullName"%'
`);

const updatePersonalDetailsStatement = db.prepare(`
  UPDATE applicants
  SET personal_details = ?, updated_at = ?
  WHERE id = ?
`);

function migrateLegacyFullNameField() {
  const legacyRows = selectLegacyNameRowsStatement.all();

  if (legacyRows.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const migrateRows = db.transaction((rows) => {
    for (const row of rows) {
      const personalDetails = parseJson(row.personal_details, {});

      if (!personalDetails || typeof personalDetails !== "object" || !("fullName" in personalDetails)) {
        continue;
      }

      const nextPersonalDetails = {
        ...personalDetails,
        name: String(personalDetails.name ?? "").trim() || String(personalDetails.fullName ?? "").trim(),
      };

      delete nextPersonalDetails.fullName;

      updatePersonalDetailsStatement.run(
        stringifyJson(nextPersonalDetails),
        now,
        row.id
      );
    }
  });

  migrateRows(legacyRows);
}

migrateLegacyFullNameField();

module.exports = {
  db,
  parseJson,
  stringifyJson,
};
