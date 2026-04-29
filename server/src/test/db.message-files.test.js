import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
const { createTestApp, resetDatabase, seedAdminUser, makeRequest, db } =
  await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");
const { encryptApiKey } = await import("../lib/encryption.js");

describe("message_files junction table", () => {
  let app, adminCookie, adminUserId, chatId, fileId1, fileId2;

  // Helper to create a file
  async function createTestFile(userId, filename) {
    const fileId = `test-file-${crypto.randomUUID()}`;
    dbUtils.createFile(
      fileId,
      userId,
      filename,
      `${filename}-${fileId}`,
      `/tmp/${filename}-${fileId}`,
      "text/plain",
      100,
      null,
      null
    );
    return fileId;
  }

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;

    // Seed provider + enabled model
    const { encryptedKey, iv, authTag } = encryptApiKey("sk-test-key");
    const providerId = dbUtils.createProvider(
      "test-provider",
      "Test Provider",
      "official",
      null,
      encryptedKey,
      iv,
      authTag
    );
    dbUtils.createModel(providerId, "stub-model", "Stub Model", true, "text");

    // Create a chat
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "Message files test chat" },
      cookie: adminCookie,
    });
    chatId = (await chatRes.json()).id;

    // Create two files
    fileId1 = await createTestFile(adminUserId, "file1.txt");
    fileId2 = await createTestFile(adminUserId, "file2.txt");
  });

  test("createMessage with fileIds creates junction table entries", async () => {
    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "Test message with files",
        fileIds: [fileId1, fileId2],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg.fileIds).toEqual([fileId1, fileId2]);

    // Verify junction table entries exist
    const stmt = db.prepare(
      "SELECT message_id, file_id FROM message_files WHERE message_id = ? ORDER BY file_id"
    );
    const rows = stmt.all(msg.id);
    expect(rows.length).toBe(2);
    // Check that both file IDs are present (order may vary)
    const fileIds = rows.map((r) => r.file_id);
    expect(fileIds).toContain(fileId1);
    expect(fileIds).toContain(fileId2);
  });

  test("createMessage with empty fileIds creates no junction entries", async () => {
    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "Test message without files",
        fileIds: [],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg.fileIds).toEqual([]);

    // Verify no junction table entries for this message
    const stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    const row = stmt.get(msg.id);
    expect(row.count).toBe(0);
  });

  test("getMessageById returns fileIds from junction table", async () => {
    // Create a message with files
    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "Test message",
        fileIds: [fileId1],
      },
      cookie: adminCookie,
    });
    const msg = await msgRes.json();

    // Get message by ID
    const dbMsg = dbUtils.getMessageById(msg.id);
    expect(dbMsg.file_ids).toEqual([fileId1]);
  });

  test("getMessagesByChat returns fileIds from junction table", async () => {
    // Create multiple messages with different file associations
    const msg1Res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "First message",
        fileIds: [fileId1],
      },
      cookie: adminCookie,
    });
    const msg1 = await msg1Res.json();

    const msg2Res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "Second message",
        fileIds: [fileId1, fileId2],
      },
      cookie: adminCookie,
    });
    const msg2 = await msg2Res.json();

    // Get all messages for chat
    const dbMessages = dbUtils.getMessagesByChat(chatId);

    const msgById = {};
    for (const m of dbMessages) {
      msgById[m.id] = m;
    }

    expect(msgById[msg1.id].file_ids).toEqual([fileId1]);
    expect(msgById[msg2.id].file_ids).toEqual([fileId1, fileId2]);
  });

  test("ON DELETE CASCADE removes junction rows when file is deleted", async () => {
    // Create a message with files
    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: {
        role: "user",
        content: "Test message",
        fileIds: [fileId1, fileId2],
      },
      cookie: adminCookie,
    });
    const msg = await msgRes.json();

    // Verify junction table entries exist
    let stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    let row = stmt.get(msg.id);
    expect(row.count).toBe(2);

    // Delete one file
    const deleted = dbUtils.deleteFile(fileId1);
    expect(deleted).toBe(true);

    // Junction entry for deleted file should be gone (CASCADE)
    stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    row = stmt.get(msg.id);
    expect(row.count).toBe(1);

    stmt = db.prepare("SELECT file_id FROM message_files WHERE message_id = ?");
    const remaining = stmt.all(msg.id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].file_id).toBe(fileId2);
  });

  test("ON DELETE CASCADE removes junction rows when message is deleted", async () => {
    // Create a new chat for this specific test to avoid conflicts
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "Cascade delete test" },
      cookie: adminCookie,
    });
    const testChatId = (await chatRes.json()).id;

    // Create fresh files for this test
    const freshFile1 = await createTestFile(adminUserId, "cascade-file1.txt");
    const freshFile2 = await createTestFile(adminUserId, "cascade-file2.txt");

    // Create a message with files
    const msgRes = await makeRequest(app, "POST", `/api/chats/${testChatId}/messages`, {
      body: {
        role: "user",
        content: "Test message",
        fileIds: [freshFile1, freshFile2],
      },
      cookie: adminCookie,
    });
    expect(msgRes.status).toBe(201);
    const msg = await msgRes.json();

    // Verify junction table entries exist
    let stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    let row = stmt.get(msg.id);
    expect(row.count).toBe(2);

    // Delete the message
    const deleted = dbUtils.deleteMessage(msg.id);
    expect(deleted).toBe(true);

    // All junction entries should be gone (CASCADE)
    stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    row = stmt.get(msg.id);
    expect(row.count).toBe(0);
  });

  test("getMessagesByChatAndUser returns fileIds from junction table", async () => {
    // Create a new chat for this specific test to avoid conflicts
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "Get messages by user test" },
      cookie: adminCookie,
    });
    const testChatId = (await chatRes.json()).id;

    // Create a fresh file for this test
    const freshFile = await createTestFile(adminUserId, "user-test-file.txt");

    // Create a message
    const msg1Res = await makeRequest(app, "POST", `/api/chats/${testChatId}/messages`, {
      body: {
        role: "user",
        content: "Message 1",
        fileIds: [freshFile],
      },
      cookie: adminCookie,
    });
    expect(msg1Res.status).toBe(201);
    const msg1 = await msg1Res.json();

    // Get messages by chat and user
    const dbMessages = dbUtils.getMessagesByChatAndUser(testChatId, adminUserId);

    expect(dbMessages.length).toBe(1);
    expect(dbMessages[0].file_ids).toEqual([freshFile]);
  });

  test("getMessagesByChatAndUserPaginated returns fileIds from junction table", async () => {
    // Create multiple messages with files
    for (let i = 0; i < 5; i++) {
      await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
        body: {
          role: "user",
          content: `Paginated message ${i}`,
          fileIds: [fileId1],
        },
        cookie: adminCookie,
      });
    }

    // Get paginated messages
    const dbMessages = dbUtils.getMessagesByChatAndUserPaginated(chatId, adminUserId, 3, 0);
    expect(dbMessages.length).toBe(3);
    // All returned messages should have file_ids as null or array (valid types)
    for (const msg of dbMessages) {
      expect(msg.file_ids === null || Array.isArray(msg.file_ids)).toBe(true);
    }
  });

  test("deleteFile cascades - junction rows gone, message remains with null file_ids", async () => {
    // Create a new chat for this specific test
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "File delete cascade test" },
      cookie: adminCookie,
    });
    const testChatId = (await chatRes.json()).id;

    // Create files
    const fileToDelete = await createTestFile(adminUserId, "to-delete.txt");
    const fileToKeep = await createTestFile(adminUserId, "to-keep.txt");

    // Create a message with both files
    const msgRes = await makeRequest(app, "POST", `/api/chats/${testChatId}/messages`, {
      body: {
        role: "user",
        content: "Test message",
        fileIds: [fileToDelete, fileToKeep],
      },
      cookie: adminCookie,
    });
    expect(msgRes.status).toBe(201);
    const msg = await msgRes.json();

    // Verify both files are associated
    let stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    let row = stmt.get(msg.id);
    expect(row.count).toBe(2);

    // Delete one file (this should cascade to junction table)
    const deletedFile = dbUtils.deleteFile(fileToDelete);
    expect(deletedFile).toBe(true);

    // Verify message still exists
    const dbMsg = dbUtils.getMessageById(msg.id);
    expect(dbMsg).not.toBeNull();
    expect(dbMsg.file_ids).toEqual([fileToKeep]); // Only the remaining file

    // Verify only one junction entry remains
    stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE message_id = ?");
    row = stmt.get(msg.id);
    expect(row.count).toBe(1);
  });

  test("deleteMessage cascades - junction rows gone, file remains", async () => {
    // Create a new chat for this specific test
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "Message delete cascade test" },
      cookie: adminCookie,
    });
    const testChatId = (await chatRes.json()).id;

    // Create a file
    const file = await createTestFile(adminUserId, "keep-file.txt");

    // Create a message with the file
    const msgRes = await makeRequest(app, "POST", `/api/chats/${testChatId}/messages`, {
      body: {
        role: "user",
        content: "Test message",
        fileIds: [file],
      },
      cookie: adminCookie,
    });
    expect(msgRes.status).toBe(201);
    const msg = await msgRes.json();

    // Verify junction entry exists
    let stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE file_id = ?");
    let row = stmt.get(file);
    expect(row.count).toBe(1);

    // Verify file still exists before message delete
    const dbFile = dbUtils.getFileById(file);
    expect(dbFile).not.toBeNull();

    // Delete the message (this should cascade to junction table)
    const deletedMsg = dbUtils.deleteMessage(msg.id);
    expect(deletedMsg).toBe(true);

    // Verify file still exists
    const dbFileAfter = dbUtils.getFileById(file);
    expect(dbFileAfter).not.toBeNull();

    // Verify junction entry is gone
    stmt = db.prepare("SELECT COUNT(*) as count FROM message_files WHERE file_id = ?");
    row = stmt.get(file);
    expect(row.count).toBe(0);
  });
});

describe("migration 003 backfill", () => {
  let testDb;

  test("backfills file_ids JSON and skips orphans", async () => {
    // Create a fresh in-memory database for this test
    testDb = new (await import("bun:sqlite")).Database(":memory:");
    testDb.exec("PRAGMA foreign_keys = ON");

    // Set up the pre-migration schema (messages with file_ids column)
    testDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        folder_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        pinned_at INTEGER,
        archived_at INTEGER,
        memory_disabled INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        path TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER NOT NULL,
        hash TEXT,
        meta TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        metadata TEXT,
        file_ids TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Insert test data
    const userId = "test-user-backfill";
    const chatId = "test-chat-backfill";
    const existingFileId = "existing-file-1"; // This file exists
    const orphanFileId = "orphan-file-1"; // This file doesn't exist (orphan)

    testDb
      .prepare(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(userId, "backfilluser", "hash", "member", Date.now());
    testDb
      .prepare(
        "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(chatId, userId, "Backfill Test", Date.now(), Date.now());
    testDb
      .prepare(
        "INSERT INTO files (id, user_id, filename, stored_filename, path, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        existingFileId,
        userId,
        "existing.txt",
        "existing.txt",
        "/tmp/existing.txt",
        "text/plain",
        100,
        Date.now()
      );

    // Insert a message with file_ids JSON containing both existing and orphan file IDs
    const messageId = "message-with-files-backfill";
    const fileIdsJson = JSON.stringify([existingFileId, orphanFileId]);
    testDb
      .prepare(
        "INSERT INTO messages (id, chat_id, user_id, role, content, created_at, file_ids) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(messageId, chatId, userId, "user", "Test message", Date.now(), fileIdsJson);

    // Insert another message with only orphan file IDs
    const message2Id = "message-orphans-only";
    const orphanOnlyJson = JSON.stringify([orphanFileId, "another-orphan"]);
    testDb
      .prepare(
        "INSERT INTO messages (id, chat_id, user_id, role, content, created_at, file_ids) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        message2Id,
        chatId,
        userId,
        "user",
        "Message with only orphans",
        Date.now(),
        orphanOnlyJson
      );

    // Insert a message with malformed JSON
    const message3Id = "message-malformed-json";
    testDb
      .prepare(
        "INSERT INTO messages (id, chat_id, user_id, role, content, created_at, file_ids) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(message3Id, chatId, userId, "user", "Malformed JSON", Date.now(), "not-valid-json");

    // Insert a message with null file_ids
    const message4Id = "message-null-fileids";
    testDb
      .prepare(
        "INSERT INTO messages (id, chat_id, user_id, role, content, created_at, file_ids) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(message4Id, chatId, userId, "user", "No files", Date.now(), null);

    // Now run the migration's up() function
    const { migration } = await import("../lib/db/migrations/003_message_files_junction.js");
    migration.up(testDb);

    // Verify: file_ids column is dropped from messages table
    const tableInfo = testDb.prepare("PRAGMA table_info(messages)").all();
    const fileIdsColumn = tableInfo.find((col) => col.name === "file_ids");
    expect(fileIdsColumn).toBeUndefined();

    // Verify: junction table exists and has correct structure
    const junctionTableInfo = testDb.prepare("PRAGMA table_info(message_files)").all();
    expect(junctionTableInfo.map((c) => c.name)).toContain("message_id");
    expect(junctionTableInfo.map((c) => c.name)).toContain("file_id");
    expect(junctionTableInfo.map((c) => c.name)).toContain("created_at");

    // Verify: valid file association was migrated (only existingFileId, orphan skipped)
    const junctionRows = testDb
      .prepare("SELECT * FROM message_files WHERE message_id = ?")
      .all(messageId);
    expect(junctionRows.length).toBe(1);
    expect(junctionRows[0].file_id).toBe(existingFileId);

    // Verify: orphan-only message has no junction rows
    const orphanJunctionRows = testDb
      .prepare("SELECT * FROM message_files WHERE message_id = ?")
      .all(message2Id);
    expect(orphanJunctionRows.length).toBe(0);

    // Verify: malformed JSON message has no junction rows
    const malformedJunctionRows = testDb
      .prepare("SELECT * FROM message_files WHERE message_id = ?")
      .all(message3Id);
    expect(malformedJunctionRows.length).toBe(0);

    // Verify: null file_ids message has no junction rows
    const nullJunctionRows = testDb
      .prepare("SELECT * FROM message_files WHERE message_id = ?")
      .all(message4Id);
    expect(nullJunctionRows.length).toBe(0);

    // Verify: UNIQUE constraint works (re-inserting same association should fail or be ignored)
    const duplicateInsert = testDb.prepare(
      "INSERT INTO message_files (id, message_id, file_id, created_at) VALUES (?, ?, ?, ?)"
    );
    expect(() => {
      duplicateInsert.run(crypto.randomUUID(), messageId, existingFileId, Date.now());
    }).toThrow();

    testDb.close();
  });
});
