import path from "path";
import AdmZip from "adm-zip";
import { FILE_CATEGORIES, FILE_CATEGORY_DEFINITIONS } from "@faster-chat/shared";

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

// ponytail: zip-bomb caps — per-entry size + ratio. Raise if real office files trip them.
const MAX_ENTRY_BYTES = 50 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

// Reject decompression bombs before inflating the entry into memory.
function safeGetData(entry) {
  const { size, compressedSize } = entry.header;
  if (size > MAX_ENTRY_BYTES) {
    throw new Error(`zip entry ${entry.entryName} exceeds size limit`);
  }
  if (compressedSize > 0 && size / compressedSize > MAX_COMPRESSION_RATIO) {
    throw new Error(`zip entry ${entry.entryName} exceeds compression ratio limit`);
  }
  return entry.getData();
}

function getExtension(filename) {
  return path.extname(filename).toLowerCase().replace(".", "");
}

export function decodeXmlEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

function extractTagText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push(decodeXmlEntities(m[1]));
  }
  return out;
}

function extractDocxText(buffer) {
  const warnings = [];
  const texts = [];

  try {
    const entries = new AdmZip(buffer).getEntries();
    for (const entry of entries) {
      if (entry.entryName === "word/document.xml") {
        for (const t of extractTagText(safeGetData(entry).toString("utf8"), "w:t")) {
          if (t.trim()) texts.push(t.trim());
        }
      } else if (entry.entryName.startsWith("word/header") && entry.entryName.endsWith(".xml")) {
        for (const t of extractTagText(safeGetData(entry).toString("utf8"), "w:t")) {
          if (t.trim()) texts.push(`[Header: ${t.trim()}]`);
        }
      }
    }
  } catch (error) {
    warnings.push(`DOCX extraction warning: ${error.message}`);
  }

  return { text: texts.join("\n\n"), warnings };
}

function extractXlsxText(buffer) {
  const warnings = [];
  const sheetData = [];

  try {
    const zip = new AdmZip(buffer);

    // Get all entries in the ZIP
    const entries = zip.getEntries();

    let sharedStrings = [];
    const sharedStringsEntry = entries.find((e) => e.entryName === "xl/sharedStrings.xml");
    if (sharedStringsEntry) {
      sharedStrings = extractTagText(safeGetData(sharedStringsEntry).toString("utf8"), "t");
    }

    // Extract from each worksheet
    const worksheetEntries = entries.filter(
      (e) => e.entryName.startsWith("xl/worksheets/sheet") && e.entryName.endsWith(".xml")
    );
    const workbookEntry = entries.find((e) => e.entryName === "xl/workbook.xml");
    const workbookXml = workbookEntry ? safeGetData(workbookEntry).toString("utf8") : "";

    for (const entry of worksheetEntries) {
      const xmlContent = safeGetData(entry).toString("utf8");

      // Find sheet name from the entry
      const sheetNumMatch = entry.entryName.match(/sheet(\d+)\.xml$/);
      let sheetLabel = `Sheet ${sheetNumMatch ? sheetNumMatch[1] : ""}`;

      // Try to get actual sheet name from workbook
      if (workbookXml) {
        const sheetNameRegex = new RegExp(
          `<sheet\\s+name="([^"]+)"\\s+sheetId="${sheetNumMatch ? sheetNumMatch[1] : ""}"`
        );
        const sheetNameMatch2 = workbookXml.match(sheetNameRegex);
        if (sheetNameMatch2) {
          sheetLabel = sheetNameMatch2[1];
        }
      }

      // Extract cell values
      // XLSX uses <c> for cells with r attribute (like A1, B1)
      // and <v> for cell values
      const rows = [];
      const rowMatches = xmlContent.match(/<row[^>]*>[\s\S]*?<\/row>/g);

      if (rowMatches) {
        for (const row of rowMatches) {
          const cells = [];
          const cellMatches = row.match(/<c[^>]*>[\s\S]*?<\/c>/g);

          if (cellMatches) {
            for (const cell of cellMatches) {
              // Get cell reference
              // Get cell value
              let cellValue = "";
              const vMatch = cell.match(/<v[^>]*>([\s\S]*?)<\/v>/);
              if (vMatch) {
                const val = vMatch[1];
                const tAttr = cell.match(/t="s"/);
                cellValue =
                  tAttr && sharedStrings[val] !== undefined
                    ? sharedStrings[val]
                    : decodeXmlEntities(val);
              }
              cells.push(cellValue);
            }
          }

          rows.push(cells.join(","));
        }
      }

      sheetData.push(`${sheetLabel}:\n${rows.join("\n")}`);
    }
  } catch (error) {
    warnings.push(`XLSX extraction warning: ${error.message}`);
  }

  return {
    text: sheetData.join("\n\n"),
    warnings,
  };
}

function extractPptxText(buffer) {
  const warnings = [];
  const slideData = [];

  try {
    const zip = new AdmZip(buffer);

    // Get all entries in the ZIP
    const entries = zip.getEntries();

    // Extract from each slide
    const slideEntries = entries.filter(
      (e) => e.entryName.startsWith("ppt/slides/slide") && e.entryName.endsWith(".xml")
    );

    for (const entry of slideEntries) {
      const xmlContent = safeGetData(entry).toString("utf8");
      const slideNumMatch = entry.entryName.match(/slide(\d+)\.xml$/);
      const slideLabel = `Slide ${slideNumMatch ? slideNumMatch[1] : ""}`;

      const texts = [...extractTagText(xmlContent, "a:t"), ...extractTagText(xmlContent, "w:t")]
        .map((t) => t.trim())
        .filter(Boolean);

      // Add title extraction (first text element is often the title)
      let slideText = "";
      if (texts.length > 0) {
        const title = texts[0];
        const body = texts.slice(1);

        slideText = `${title}`;
        if (body.length > 0) {
          slideText += "\n" + body.join("\n");
        }
      }

      if (slideText.trim()) {
        slideData.push(`${slideLabel}:\n${slideText}`);
      }
    }
  } catch (error) {
    warnings.push(`PPTX extraction warning: ${error.message}`);
  }

  return {
    text: slideData.join("\n\n"),
    warnings,
  };
}

export function extractOfficeText({ buffer, filename }) {
  const kind = getExtension(filename);

  let result;
  switch (kind) {
    case "docx":
      result = extractDocxText(buffer);
      break;
    case "xlsx":
      result = extractXlsxText(buffer);
      break;
    case "pptx":
      result = extractPptxText(buffer);
      break;
    default:
      return {
        text: "",
        kind: null,
        warnings: ["Unknown office document type"],
      };
  }

  return {
    text: result.text || "",
    kind,
    warnings: result.warnings || [],
  };
}

export function isOfficeModernFile({ filename }) {
  const extension = getExtension(filename);
  return FILE_CATEGORY_DEFINITIONS[FILE_CATEGORIES.OFFICE_MODERN].extensions.includes(extension);
}

export function isOfficeLegacyFile({ filename }) {
  const extension = getExtension(filename);
  return FILE_CATEGORY_DEFINITIONS[FILE_CATEGORIES.OFFICE_LEGACY].extensions.includes(extension);
}
