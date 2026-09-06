import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "../..");

const inputFile = path.join(
  projectRoot,
  "data",
  "locations",
  "lgd_villages.csv"
);

const outputFile = path.join(
  projectRoot,
  "data",
  "locations",
  "maharashtra_villages_real.json"
);

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

const csv = fs.readFileSync(inputFile, "utf8");

const lines = csv
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter(Boolean);

const headers = parseCSVLine(lines[0]);

const requiredHeaders = [
  "stateCode",
  "stateNameEnglish",
  "districtCode",
  "districtNameEnglish",
  "subdistrictCode",
  "subdistrictNameEnglish",
  "villageCode",
  "villageNameEnglish",
  "pincode"
];

for (const header of requiredHeaders) {
  if (!headers.includes(header)) {
    throw new Error(`Missing required CSV column: ${header}`);
  }
}

const index = Object.fromEntries(
  headers.map((header, position) => [header, position])
);

const villages = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  const state = row[index.stateNameEnglish];

  if (state?.trim().toLowerCase() !== "maharashtra") {
    continue;
  }

  villages.push({
    stateCode: row[index.stateCode],
    state: row[index.stateNameEnglish],

    districtCode: row[index.districtCode],
    district: row[index.districtNameEnglish],

    subdistrictCode: row[index.subdistrictCode],
    subdistrict: row[index.subdistrictNameEnglish],

    villageCode: row[index.villageCode],
    village: row[index.villageNameEnglish],

    pincode: row[index.pincode]
  });
}

const result = {
  source: {
    name: "Local Government Directory (LGD)",
    publisher: "Government of India",
    dataset: "Villages with PIN Codes",
    sourceType: "official_government_dataset"
  },

  generatedAt: new Date().toISOString(),

  state: "Maharashtra",

  totalVillages: villages.length,

  villages
};

fs.writeFileSync(
  outputFile,
  JSON.stringify(result, null, 2),
  "utf8"
);

console.log(
  `Created ${outputFile} with ${villages.length} Maharashtra village records.`
);