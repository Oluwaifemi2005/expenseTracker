const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const transactionModel = require("../models/Transaction");
const { JWT_SECRET } = require("../middleware/auth");
const {
    unescapeFormulaPrefix,
    parseRFC4180,
    MAX_CSV_SIZE_BYTES,
    MAX_CSV_ROWS
} = require("../validators/csvImportValidator");

describe("CSV Transaction Import API & Validation Tests", () => {
    let originalFind;
    let originalCreate;

    const userAId = "65f1a2b3c4d5e6f7a8b9c0aa";
    const userBId = "65f1a2b3c4d5e6f7a8b9c0bb";

    const userAToken = jwt.sign(
        { id: userAId, email: "usera@vaultex.com", name: "User A" },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    const userBToken = jwt.sign(
        { id: userBId, email: "userb@vaultex.com", name: "User B" },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    beforeEach(() => {
        originalFind = transactionModel.find;
        originalCreate = transactionModel.create;

        // Default mock returning empty array so unmocked tests don't buffer timeout on real DB
        transactionModel.find = async () => [];

        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        transactionModel.find = originalFind;
        transactionModel.create = originalCreate;
    });

    describe("1. Formula Injection Unescaping Unit Logic", () => {
        it("strictly unescapes only spreadsheet trigger characters (=, +, -, @, \\t, \\r)", () => {
            assert.equal(unescapeFormulaPrefix("=SUM(A1:A10)"), "=SUM(A1:A10)");
            assert.equal(unescapeFormulaPrefix("'=SUM(A1:A10)"), "=SUM(A1:A10)");
            assert.equal(unescapeFormulaPrefix("'+cmd|/C"), "+cmd|/C");
            assert.equal(unescapeFormulaPrefix("'-10+20"), "-10+20");
            assert.equal(unescapeFormulaPrefix("'@malicious"), "@malicious");
            assert.equal(unescapeFormulaPrefix("'\tmalicious"), "\tmalicious");
        });

        it("does NOT alter legitimate descriptions starting with a single quote", () => {
            assert.equal(unescapeFormulaPrefix("'Special Deal'"), "'Special Deal'");
            assert.equal(unescapeFormulaPrefix("'Hello world'"), "'Hello world'");
            assert.equal(unescapeFormulaPrefix("'Quote of the day"), "'Quote of the day");
        });
    });

    describe("2. RFC 4180 Parsing Unit Logic", () => {
        it("parses fields with commas inside double quotes and escaped quotes", () => {
            const csv = 'Date,Description,Amount\n2026-10-15,"Grocery, Market & Store",45.50\n2026-10-16,"Said ""Hello""",20.00';
            const parsed = parseRFC4180(csv);
            assert.equal(parsed.length, 3);
            assert.equal(parsed[1][1], "Grocery, Market & Store");
            assert.equal(parsed[2][1], 'Said "Hello"');
        });

        it("throws an error for unclosed quotes", () => {
            const badCsv = 'Date,Description,Amount\n2026-10-15,"Unclosed quote,45.50';
            assert.throws(() => parseRFC4180(badCsv), /Malformed CSV: Unclosed quote detected/);
        });
    });

    describe("3. Authentication & Route Protection", () => {
        it("rejects POST /api/transactions/import-preview without auth (401)", async () => {
            const res = await request(app)
                .post("/api/transactions/import-preview")
                .send({ csvContent: "Date,Description,Amount\n2026-10-15,Test,50" });
            assert.equal(res.status, 401);
        });

        it("rejects POST /api/transactions/import without auth (401)", async () => {
            const res = await request(app)
                .post("/api/transactions/import")
                .send({ csvContent: "Date,Description,Amount\n2026-10-15,Test,50" });
            assert.equal(res.status, 401);
        });
    });

    describe("4. CSV Import Preview Endpoint (/api/transactions/import-preview)", () => {
        it("previews valid CSV matching Reports export header format with currency tag", async () => {
            transactionModel.find = async () => [];

            const csv = [
                "Date,Description,Type,Category,Amount (USD)",
                "2026-10-15,Supermarket Groceries,expense,Food & Dining,78.50",
                "2026-10-16,Freelance Payment,income,Freelance,1250.00"
            ].join("\r\n");

            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv });

            assert.equal(res.status, 200);
            assert.equal(res.body.canImport, true);
            assert.equal(res.body.summary.totalRows, 2);
            assert.equal(res.body.summary.validCount, 2);
            assert.equal(res.body.summary.invalidCount, 0);
            assert.equal(res.body.rows[0].status, "valid");
            assert.equal(res.body.rows[0].parsed.amount, 78.5);
            assert.equal(res.body.rows[0].parsed.type, "expense");
            assert.equal(res.body.rows[1].parsed.type, "income");
        });

        it("identifies schema validation errors and reports them by row", async () => {
            transactionModel.find = async () => [];

            const csv = [
                "Date,Description,Type,Category,Amount",
                "invalid-date,Bad Date,expense,Food & Dining,50.00",
                "2026-10-15,,expense,Food & Dining,50.00", // empty description
                "2026-10-15,Negative Amount,expense,Food & Dining,-25.00",
                "2026-10-15,Invalid Type,crypto,Food & Dining,100.00",
                "2026-10-15,Unsupported Category,expense,NFTs,100.00"
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv });

            assert.equal(res.status, 200);
            assert.equal(res.body.summary.totalRows, 5);
            assert.equal(res.body.summary.invalidCount, 5);
            assert.equal(res.body.summary.validCount, 0);

            assert.ok(res.body.rows[0].errors.some(e => e.includes("Invalid date")));
            assert.ok(res.body.rows[1].errors.some(e => e.includes("description")));
            assert.ok(res.body.rows[2].errors.some(e => e.includes("positive number")));
            assert.ok(res.body.rows[3].errors.some(e => e.includes("Transaction type")));
            assert.ok(res.body.rows[4].errors.some(e => e.includes("Unsupported category")));
        });

        it("detects in-file duplicates and marks them with the matching row number", async () => {
            transactionModel.find = async () => [];

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-15,Coffee,expense,Food & Dining,4.50",
                "2026-10-15,Coffee,expense,Food & Dining,4.50" // Exact in-file duplicate
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv });

            assert.equal(res.status, 200);
            assert.equal(res.body.summary.validCount, 1);
            assert.equal(res.body.summary.duplicateFileCount, 1);
            assert.equal(res.body.rows[0].status, "valid");
            assert.equal(res.body.rows[1].status, "duplicate_file");
            assert.match(res.body.rows[1].matchReason, /Matches identical transaction on row 2/);
        });

        it("detects matches with the user's existing recorded transactions", async () => {
            transactionModel.find = async () => [
                {
                    _id: "65f1a2b3c4d5e6f7a8b9c099",
                    user: userAId,
                    description: "Monthly Rent",
                    amount: 1500,
                    type: "expense",
                    category: "Housing & Rent",
                    date: new Date("2026-10-01T12:00:00Z")
                }
            ];

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-01,Monthly Rent,expense,Housing & Rent,1500.00",
                "2026-10-02,Electricity,expense,Utilities,80.00"
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv });

            assert.equal(res.status, 200);
            assert.equal(res.body.summary.duplicateExistingCount, 1);
            assert.equal(res.body.summary.validCount, 1);
            assert.equal(res.body.rows[0].status, "duplicate_existing");
            assert.equal(res.body.rows[1].status, "valid");
        });

        it("rejects empty CSV files with 400", async () => {
            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: "   \n\n  " });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /empty/i);
        });

        it("rejects CSV missing required columns with 400", async () => {
            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: "Category,Type\nFood,expense" });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /missing required column/i);
        });

        it("rejects uploads exceeding the 2 MB file limit with 400", async () => {
            // Create a payload of ~2.2 MB (under the 10 MB express limit, but exceeding the 2 MB CSV limit)
            const bigCsv = "Date,Description,Amount\n" + "A".repeat(2.2 * 1024 * 1024);
            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: bigCsv });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /exceeds maximum allowed limit of 2 MB/i);
        });

        it("rejects uploads exceeding the 1,000 row limit with 400", async () => {
            const rows = ["Date,Description,Amount"];
            for (let i = 0; i < 1005; i++) {
                rows.push(`2026-10-15,Item ${i},10.00`);
            }
            const res = await request(app)
                .post("/api/transactions/import-preview")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: rows.join("\n") });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /exceeds maximum limit of 1,000 transaction rows/i);
        });
    });

    describe("5. CSV Import Execution (/api/transactions/import)", () => {
        it("strictly binds transactions to authenticated user and ignores spoofed user fields in CSV", async () => {
            const insertedDocs = [];
            transactionModel.find = async () => [];
            transactionModel.create = async (doc) => {
                insertedDocs.push(doc);
                return { _id: "65f1a2b3c4d5e6f7a8b9c999", ...doc };
            };

            // CSV attempting to inject User / UserId fields
            const csv = [
                "Date,Description,Type,Category,Amount,User,UserId,id",
                `2026-10-15,Salary,income,Salary,3000.00,${userBId},${userBId},fake-id`
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv, importMode: "valid_only" });

            assert.equal(res.status, 200);
            assert.equal(res.body.importedCount, 1);
            assert.equal(insertedDocs.length, 1);
            // Must strictly belong to User A from token, NOT User B from CSV
            assert.equal(String(insertedDocs[0].user), userAId);
        });

        it("rejects all_or_nothing mode without writing any records when errors exist", async () => {
            let writeCount = 0;
            transactionModel.find = async () => [];
            transactionModel.create = async () => {
                writeCount++;
            };

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-15,Valid Item,expense,Food & Dining,25.00",
                "invalid-date,Bad Item,expense,Food & Dining,50.00" // Invalid row
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv, importMode: "all_or_nothing" });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /Import rejected in all-or-nothing mode/);
            assert.equal(writeCount, 0, "No transactions must be written in all-or-nothing mode upon validation failure");
        });

        it("imports valid rows and accurately logs skipped invalid and duplicate rows in valid_only mode", async () => {
            const written = [];
            transactionModel.find = async () => [
                {
                    description: "Existing Item",
                    amount: 50,
                    type: "expense",
                    category: "Other",
                    date: new Date("2026-10-15T12:00:00Z")
                }
            ];
            transactionModel.create = async (doc) => {
                written.push(doc);
                return { _id: "new-id", ...doc };
            };

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-15,Valid Fresh Item,expense,Shopping,45.00",
                "2026-10-15,Existing Item,expense,Other,50.00", // DB duplicate
                "2026-10-15,Broken Item,expense,Shopping,-10.00" // Invalid
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    csvContent: csv,
                    importMode: "valid_only",
                    skipExistingDuplicates: true
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.importedCount, 1);
            assert.equal(res.body.skippedCount, 2);
            assert.equal(res.body.failedCount, 0);
            assert.equal(written.length, 1);
            assert.equal(written[0].description, "Valid Fresh Item");
            assert.equal(res.body.skippedRows.length, 2);
        });

        it("allows legitimate identical transactions to be imported when user chooses NOT to skip matches", async () => {
            const written = [];
            transactionModel.find = async () => [
                {
                    description: "Legitimate Repeat Coffee",
                    amount: 4.5,
                    type: "expense",
                    category: "Food & Dining",
                    date: new Date("2026-10-15T12:00:00Z")
                }
            ];
            transactionModel.create = async (doc) => {
                written.push(doc);
                return { _id: "new-id", ...doc };
            };

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-15,Legitimate Repeat Coffee,expense,Food & Dining,4.50"
            ].join("\n");

            // User explicitly chooses skipExistingDuplicates: false
            const res = await request(app)
                .post("/api/transactions/import")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    csvContent: csv,
                    importMode: "valid_only",
                    skipExistingDuplicates: false
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.importedCount, 1);
            assert.equal(res.body.skippedCount, 0);
            assert.equal(written.length, 1);
        });

        it("accurately reports partial database failures and unconfirmed writes", async () => {
            let attempt = 0;
            transactionModel.find = async () => [];
            transactionModel.create = async (doc) => {
                attempt++;
                if (attempt === 2) {
                    throw new Error("Disk write timeout or constraint error");
                }
                return { _id: `id-${attempt}`, ...doc };
            };

            const csv = [
                "Date,Description,Type,Category,Amount",
                "2026-10-15,First Success,expense,Food & Dining,10.00",
                "2026-10-15,Second Fails DB,expense,Food & Dining,20.00",
                "2026-10-15,Third Success,expense,Food & Dining,30.00"
            ].join("\n");

            const res = await request(app)
                .post("/api/transactions/import")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ csvContent: csv, importMode: "valid_only" });

            assert.equal(res.status, 200);
            assert.equal(res.body.importedCount, 2);
            assert.equal(res.body.failedCount, 1);
            assert.equal(res.body.failedWrites.length, 1);
            assert.equal(res.body.failedWrites[0].description, "Second Fails DB");
            assert.match(res.body.failedWrites[0].error, /Disk write timeout/);
        });
    });
});
