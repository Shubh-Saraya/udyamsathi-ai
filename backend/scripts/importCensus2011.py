"""Import the validated Maharashtra Census 2011 workbook into UdyamSathi.

The workbook is read directly from OOXML with the Python standard library so
the application stays dependency-free. Only geographic and business-relevant
historical Census fields are retained in the bundled JSON.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def cell_value(cell):
    if cell.attrib.get("t") == "inlineStr":
        return "".join(cell.itertext())
    value = cell.find(NS + "v")
    return None if value is None else value.text


def as_int(value, label, row_number):
    try:
        parsed = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid {label!r} at worksheet row {row_number}") from error
    if parsed < 0:
        raise ValueError(f"Negative {label!r} at worksheet row {row_number}")
    return parsed


def code(value, width):
    return str(value).zfill(width)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()

    source_bytes = args.source.read_bytes()
    header = None
    districts, subdistricts, villages = {}, {}, []

    with zipfile.ZipFile(args.source) as archive, archive.open("xl/worksheets/sheet1.xml") as sheet:
        for _, row in ET.iterparse(sheet, events=("end",)):
            if row.tag != NS + "row":
                continue
            values = [cell_value(cell) for cell in list(row)]
            row_number = int(row.attrib["r"])
            if header is None:
                header = values
                row.clear()
                continue
            record = dict(zip(header, values))
            level, tru = record["Level"], record["TRU"]
            district_code = code(record["District"], 3)
            subdistrict_code = code(record["Subdistt"], 5)
            if level == "DISTRICT" and tru == "Total":
                districts[district_code] = record["Name"].strip()
            elif level == "SUB-DISTRICT" and tru == "Total":
                subdistricts[(district_code, subdistrict_code)] = record["Name"].strip()
            elif level == "VILLAGE":
                village_code = code(record["Town/Village"], 6)
                villages.append({
                    "stateCode": code(record["State"], 2),
                    "districtCode": district_code,
                    "subdistrictCode": subdistrict_code,
                    "villageCode": village_code,
                    "village": record["Name"].strip(),
                    "households": as_int(record["No_HH"], "No_HH", row_number),
                    "population": as_int(record["TOT_P"], "TOT_P", row_number),
                    "malePopulation": as_int(record["TOT_M"], "TOT_M", row_number),
                    "femalePopulation": as_int(record["TOT_F"], "TOT_F", row_number),
                    "children0to6": as_int(record["P_06"], "P_06", row_number),
                    "scPopulation": as_int(record["P_SC"], "P_SC", row_number),
                    "stPopulation": as_int(record["P_ST"], "P_ST", row_number),
                    "literates": as_int(record["P_LIT"], "P_LIT", row_number),
                    "workers": as_int(record["TOT_WORK_P"], "TOT_WORK_P", row_number),
                    "mainWorkers": as_int(record["MAINWORK_P"], "MAINWORK_P", row_number),
                    "marginalWorkers": as_int(record["MARGWORK_P"], "MARGWORK_P", row_number),
                    "cultivators": as_int(record["MAIN_CL_P"], "MAIN_CL_P", row_number),
                    "agriculturalLabourers": as_int(record["MAIN_AL_P"], "MAIN_AL_P", row_number),
                    "householdIndustryWorkers": as_int(record["MAIN_HH_P"], "MAIN_HH_P", row_number),
                    "otherWorkers": as_int(record["MAIN_OT_P"], "MAIN_OT_P", row_number),
                })
            row.clear()

    village_codes = [record["villageCode"] for record in villages]
    if len(village_codes) != len(set(village_codes)):
        raise ValueError("The source has duplicate Census village codes.")
    for record in villages:
        district = districts.get(record["districtCode"])
        subdistrict = subdistricts.get((record["districtCode"], record["subdistrictCode"]))
        if not district or not subdistrict:
            raise ValueError(f"Missing parent geography for Census village {record['villageCode']}.")
        record["district"] = district
        record["subdistrict"] = subdistrict

    payload = {
        "source": {
            "name": "Maharashtra Census 2011 village-level Primary Census Abstract",
            "publisher": "Office of the Registrar General & Census Commissioner, India",
            "catalogUrl": "https://censusindia.gov.in/nada/index.php/catalog/42559",
            "dataYear": 2011,
            "localImportDate": str(date.today()),
            "sourceWorkbookSha256": hashlib.sha256(source_bytes).hexdigest(),
            "note": "Historical Census data only. It must never be presented as current population or current business demand.",
        },
        "totalVillages": len(villages),
        "villages": villages,
    }
    args.target.parent.mkdir(parents=True, exist_ok=True)
    args.target.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"importedVillages": len(villages), "sha256": payload["source"]["sourceWorkbookSha256"], "target": str(args.target)}))


if __name__ == "__main__":
    main()
