/**
 * CSV export helper for admin data exports.
 *
 * @module server/csv
 */

import { NextResponse } from "next/server";

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return "";
      const value = String(cell);
      if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",")
  );
  return lines.join("\n");
}

export function outputCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): NextResponse {
  const csv = toCsv(headers, rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Parse CSV text into rows of cells. Handles quoted fields, embedded
 * commas, double-quote escapes, and \r\n line endings.
 */
export function parseCsv(content: string): (string | null)[][] {
  const rows: (string | null)[][] = [];
  let row: (string | null)[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (!(row.length === 1 && row[0] === "")) {
        rows.push(row);
      }
      row = [];
    } else if (ch === "\r") {
      // skip; handled on \n
    } else {
      field += ch;
    }
  }

  // Flush trailing field/row.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
