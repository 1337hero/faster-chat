import { db } from "./db";

/**
 * One-time cleanup utility to remove empty assistant messages
 * Run this once after the fix to clean up accumulated empty messages
 */
export async function cleanupEmptyMessages() {
  console.log("Starting cleanup of empty assistant messages...");

  const emptyMessages = await db.messages
    .where("role")
    .equals("assistant")
    .filter((msg) => !msg.content || msg.content.trim() === "")
    .toArray();

  if (emptyMessages.length === 0) {
    console.log("No empty messages found. Database is clean!");
    return { cleaned: 0, remaining: await db.messages.count() };
  }

  console.log(`Found ${emptyMessages.length} empty assistant messages to delete`);

  await db.messages.bulkDelete(emptyMessages.map((m) => m.id));

  const remaining = await db.messages.count();
  console.log(
    `Cleanup complete! Removed ${emptyMessages.length} empty messages. ${remaining} messages remaining.`
  );

  return { cleaned: emptyMessages.length, remaining };
}
