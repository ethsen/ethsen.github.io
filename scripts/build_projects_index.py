#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "assets" / "data" / "projects"
INDEX_PATH = PROJECTS_DIR / "index.json"

FIELDS = [
    "slug",
    "title",
    "subtitle",
    "summary",
    "kicker",
    "year",
    "featured",
    "thumbnail",
    "tags",
    "tech",
]


def main():
    projects = []
    for path in sorted(PROJECTS_DIR.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        entry = {k: data.get(k) for k in FIELDS}
        projects.append(entry)

    INDEX_PATH.write_text(json.dumps({"projects": projects}, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {INDEX_PATH} with {len(projects)} projects.")


if __name__ == "__main__":
    main()
