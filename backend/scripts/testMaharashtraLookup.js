import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "../..");

const dataFile = path.join(
  projectRoot,
  "data",
  "locations",
  "maharashtra_villages_real.json"
);

const data = JSON.parse(
  fs.readFileSync(dataFile, "utf8")
);

const searchVillage = "Javkhede Sim";
const searchDistrict = "Jalgaon";
const searchSubdistrict = "Erandol";

const result = data.villages.find((village) =>
  village.village.toLowerCase() === searchVillage.toLowerCase() &&
  village.district.toLowerCase() === searchDistrict.toLowerCase() &&
  village.subdistrict.toLowerCase() === searchSubdistrict.toLowerCase()
);

if (!result) {
  console.log("❌ Village not found.");
  process.exit(1);
}

console.log("\n✅ REAL LGD VILLAGE FOUND\n");

console.log("State:", result.state);
console.log("District:", result.district);
console.log("Subdistrict:", result.subdistrict);
console.log("Village:", result.village);
console.log("Village Code:", result.villageCode);
console.log("PIN:", result.pincode);

console.log("\nSource:");
console.log(data.source.name);
console.log(data.source.publisher);
console.log(data.source.dataset);