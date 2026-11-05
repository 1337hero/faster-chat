import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import path from "path";
import { mkdir, rm, readdir } from "fs/promises";
import { createTestApp, seedAdminUser, seedMemberUser, makeRequest } from "./helpers.js";
import { FILE_CONFIG } from "../lib/fileUtils.js";
import { dbUtils } from "../lib/db.js";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64"
);

function uploadFile(app, cookie, { name, type, content }) {
  const fd = new FormData();
  fd.append("file", new File([content], name, { type }));
  return app.request("/api/files", { method: "POST", headers: { Cookie: cookie }, body: fd });
}

async function objectsOnDisk() {
  const entries = await readdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile()).length;
}

describe("content-addressed file storage", () => {
  let app, adminCookie, adminUserId, memberCookie;

  beforeAll(async () => {
    const { resetDatabase } = await import("./helpers.js");
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
    await rm(FILE_CONFIG.UPLOAD_DIR, { recursive: true, force: true });
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(FILE_CONFIG.UPLOAD_DIR, { recursive: true, force: true });
  });

  it("re-uploading identical bytes returns the existing file id and stores one object", async () => {
    const first = await uploadFile(app, adminCookie, {
      name: "one.png",
      type: "image/png",
      content: PNG_BYTES,
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json();

    const second = await uploadFile(app, adminCookie, {
      name: "two.png",
      type: "image/png",
      content: PNG_BYTES,
    });
    expect(second.status).toBe(200);
    const secondBody = await second.json();

    expect(secondBody.id).toBe(firstBody.id);
    expect(await objectsOnDisk()).toBe(1);
  });

  it("two users sharing identical bytes get separate ids over one disk object", async () => {
    const adminRes = await uploadFile(app, adminCookie, {
      name: "shared.txt",
      type: "text/plain",
      content: Buffer.from("shared content"),
    });
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();

    const memberRes = await uploadFile(app, memberCookie, {
      name: "mine.txt",
      type: "text/plain",
      content: Buffer.from("shared content"),
    });
    expect(memberRes.status).toBe(200);
    const memberBody = await memberRes.json();

    expect(memberBody.id).not.toBe(adminBody.id);
    expect(await objectsOnDisk()).toBe(2); // 1 png object + 1 shared txt object

    const adminContent = await makeRequest(app, "GET", `/api/files/${adminBody.id}/content`, {
      cookie: adminCookie,
    });
    const memberContent = await makeRequest(app, "GET", `/api/files/${memberBody.id}/content`, {
      cookie: memberCookie,
    });
    expect(adminContent.status).toBe(200);
    expect(memberContent.status).toBe(200);
    const memberText = await memberContent.text();
    expect(memberText).toBe("shared content");
  });

  it("deleting one user's copy keeps the object while another user still references it", async () => {
    const adminRes = await uploadFile(app, adminCookie, {
      name: "report.txt",
      type: "text/plain",
      content: Buffer.from("refcounted bytes"),
    });
    const adminBody = await adminRes.json();

    const memberRes = await uploadFile(app, memberCookie, {
      name: "copy.txt",
      type: "text/plain",
      content: Buffer.from("refcounted bytes"),
    });
    const memberBody = await memberRes.json();

    const before = await objectsOnDisk();

    const delRes = await makeRequest(app, "DELETE", `/api/files/${memberBody.id}`, {
      cookie: memberCookie,
    });
    expect(delRes.status).toBe(200);

    expect(await objectsOnDisk()).toBe(before);
    const adminContent = await makeRequest(app, "GET", `/api/files/${adminBody.id}/content`, {
      cookie: adminCookie,
    });
    expect(adminContent.status).toBe(200);
    expect(await adminContent.text()).toBe("refcounted bytes");
  });

  it("deleting the last referencing row removes the bytes from disk", async () => {
    const res = await uploadFile(app, adminCookie, {
      name: "solo.txt",
      type: "text/plain",
      content: Buffer.from("temporary bytes"),
    });
    const body = await res.json();
    const before = await objectsOnDisk();
    expect(before).toBeGreaterThan(0);

    const delRes = await makeRequest(app, "DELETE", `/api/files/${body.id}`, {
      cookie: adminCookie,
    });
    expect(delRes.status).toBe(200);
    expect(await objectsOnDisk()).toBe(before - 1);
  });

  it("serves a legacy row written with the pre-dedup disk layout", async () => {
    const { writeFile } = await import("fs/promises");
    const { randomUUID } = await import("crypto");

    const legacyName = `legacy-${randomUUID()}.txt`;
    await writeFile(path.join(FILE_CONFIG.UPLOAD_DIR, legacyName), Buffer.from("legacy bytes"));
    const legacyId = randomUUID();
    dbUtils.createFile(
      legacyId,
      adminUserId,
      "old.txt",
      legacyName,
      path.join("server/data/uploads", legacyName),
      "text/plain",
      12,
      null,
      null
    );

    const res = await makeRequest(app, "GET", `/api/files/${legacyId}/content`, {
      cookie: adminCookie,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("legacy bytes");
  });

  it("reports the sha256 of the stored bytes as the upload hash", async () => {
    const content = Buffer.from("hash me please");
    const res = await uploadFile(app, adminCookie, {
      name: "hashed.txt",
      type: "text/plain",
      content,
    });
    const body = await res.json();

    const { createHash } = await import("crypto");
    expect(body.hash).toBe(createHash("sha256").update(content).digest("hex"));

    const row = dbUtils.getFileById(body.id);
    expect(path.join(FILE_CONFIG.UPLOAD_DIR, row.stored_filename)).toBe(
      path.join(FILE_CONFIG.UPLOAD_DIR, `${row.hash.slice(0, 2)}/${row.hash}`)
    );
  });
});
