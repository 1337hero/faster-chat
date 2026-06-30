import { migration as initialSchema } from "./001_initial_schema.js";
import { migration as addExistingColumns } from "./002_add_existing_columns.js";
import { migration as messageFilesJunction } from "./003_message_files_junction.js";
import { migration as backfillMessageFilesId } from "./004_backfill_message_files_id.js";

export const migrations = [
  initialSchema,
  addExistingColumns,
  messageFilesJunction,
  backfillMessageFilesId,
];
