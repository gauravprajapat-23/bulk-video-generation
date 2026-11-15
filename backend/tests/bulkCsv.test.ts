import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCsv, createCsv } from "../../src/lib/csv";

test("quoted commas, newlines, BOM and escaped quotes survive round trip", () => {
  const headers = ["title", "description"];
  const rows = [{ title: 'A "quoted", title', description: "line 1\nline 2" }];
  const parsed = parseCsv("\uFEFF" + createCsv(headers, rows));
  assert.deepEqual(parsed.headers, headers);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].title, rows[0].title);
  assert.equal(parsed.rows[0].description, rows[0].description);
});

test("malformed quoting and duplicate columns fail closed", () => {
  assert.throws(() => parseCsv('title,description\n"unfinished,row'));
  assert.throws(() => parseCsv('title,title\na,b'));
  assert.throws(() => parseCsv('title,description\n"safe"oops,value'));
  assert.throws(() => parseCsv('title,description\na,b,unexpected'));
});

test("row, column, cell and file-size limits are enforced", () => {
  assert.throws(() => parseCsv("title\na\nb", { maxRows: 1 }));
  assert.throws(() => parseCsv("a,b,c\n1,2,3", { maxColumns: 2 }));
  assert.throws(() => parseCsv("title\n123456", { maxCellChars: 5 }));
  assert.throws(() => parseCsv("title\nvalue", { maxBytes: 8 }));
});

test("10,000 rows can be parsed without dropping source records", () => {
  const csv = "title,description\n" + Array.from({ length: 10000 }, (_, i) => `row-${i},data`).join("\n");
  const result = parseCsv(csv);
  assert.equal(result.rows.length, 10000);
  assert.equal(result.rows[0].title, "row-0");
  assert.equal(result.rows[9999].title, "row-9999");
});
