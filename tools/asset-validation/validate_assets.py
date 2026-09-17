#!/usr/bin/env python3
"""Validate the canonical asset contract and optionally promote the A6 handoff."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
from collections import Counter
from pathlib import Path

EXPECTED_STAGING_COUNTS = {
    "exercise": 30,
    "chore": 30,
    "story": 30,
    "backgrounds": 7,
    "bosses": 6,
    "badge": 12,
    "cosmetic": 15,
}
EXPECTED_KIND_COUNTS = {
    "background": 7,
    "badge": 12,
    "boss-illustration": 6,
    "character-pose": 26,
    "cosmetic": 15,
    "pet-pose": 11,
    "story-cover": 30,
    "task-illustration": 60,
}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PNG_MODES = {2: "RGB", 6: "RGBA"}
A6_MISSING_LABELS = {
    "exercise-specific illustrations",
    "chore-specific illustrations",
    "boss artwork",
    "chapter/background artwork",
    "badges/icons/decorations",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_metadata(path: Path) -> dict:
    data = path.read_bytes()
    if data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise ValueError(f"Not a valid PNG: {path}")
    width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
        ">IIBBBBB", data[16:29]
    )
    if bit_depth != 8 or color_type not in PNG_MODES:
        raise ValueError(f"Unsupported PNG mode/bit depth: {path} ({color_type}/{bit_depth})")
    if compression != 0 or filtering != 0 or interlace not in (0, 1):
        raise ValueError(f"Invalid PNG header: {path}")
    return {
        "format": "png",
        "width": width,
        "height": height,
        "mode": PNG_MODES[color_type],
        "transparent": color_type == 6 or b"tRNS" in data,
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def by_id(records: list[dict], label: str) -> dict[str, dict]:
    result = {record["id"]: record for record in records}
    if len(result) != len(records):
        raise ValueError(f"Duplicate canonical {label} IDs")
    return result


def load_semantics(root: Path) -> dict[str, dict[str, dict]]:
    rewards = read_json(root / "03_REWARDS_BOSSES/REWARD_SYSTEM.json")
    return {
        "exercise": by_id(read_json(root / "02_DATA/exercise_task_cards_30.json"), "exercise"),
        "chore": by_id(read_json(root / "02_DATA/chore_task_cards_30.json"), "chore"),
        "story": by_id(read_json(root / "02_DATA/thinking_stories_30.json"), "story"),
        "boss": by_id(read_json(root / "03_REWARDS_BOSSES/BOSSES_6.json"), "Boss"),
        "badge": by_id(rewards["badges"], "badge"),
    }


def assert_semantics(asset: dict, semantics: dict[str, dict[str, dict]]) -> None:
    kind = asset["kind"]
    if kind == "task-illustration":
        family = asset["logicalId"].split(".")[1]
        record = semantics[family].get(asset.get("contentId"))
        if not record or record["name"] != asset.get("labelZh"):
            raise ValueError(f"Canonical task mismatch: {asset['logicalId']}")
    elif kind == "story-cover":
        record = semantics["story"].get(asset.get("contentId"))
        if not record or record["title"] != asset.get("labelZh"):
            raise ValueError(f"Canonical story mismatch: {asset['logicalId']}")
    elif kind == "boss-illustration":
        record = semantics["boss"].get(asset.get("contentId"))
        if not record or record["name"] != asset.get("labelZh"):
            raise ValueError(f"Canonical Boss mismatch: {asset['logicalId']}")
    elif kind == "badge":
        record = semantics["badge"].get(asset["logicalId"].split(".", 1)[1])
        if not record or record["name"] != asset.get("labelZh"):
            raise ValueError(f"Canonical badge mismatch: {asset['logicalId']}")


def staging_source(staging: Path, asset: dict) -> Path:
    logical_id = asset["logicalId"]
    kind = asset["kind"]
    if kind == "task-illustration":
        family = logical_id.split(".")[1]
        return staging / family / f"{family}_{asset['contentId'].lower()}.png"
    if kind == "story-cover":
        return staging / "story" / f"story_{asset['contentId'].lower()}.png"
    if kind == "boss-illustration":
        return staging / "bosses" / Path(asset["path"]).name
    if kind == "background":
        return staging / "backgrounds" / Path(asset["path"]).name
    if kind == "badge":
        return staging / "badge" / Path(asset["path"]).name
    if kind == "cosmetic":
        item_id = logical_id.split(".", 1)[1]
        candidates = [
            staging / "cosmetic" / f"{item_id}.png",
            staging / "cosmetic" / f"cosmetic_{item_id}.png",
        ]
        matches = [candidate for candidate in candidates if candidate.exists()]
        if len(matches) != 1:
            raise ValueError(f"Expected one cosmetic source for {logical_id}, found {len(matches)}")
        return matches[0]
    raise ValueError(f"Unexpected pending A6 kind: {kind}")


def preflight(root: Path, manifest: dict) -> list[tuple[dict, Path, Path]]:
    staging = root / "incoming/chatgpt/assets/a6"
    staged = list(staging.rglob("*.png"))
    pending = [asset for asset in manifest["assets"] if asset["status"] == "pending"]
    if len(pending) != 130 or len(staged) != 130:
        raise ValueError(f"Expected 130 pending/staged assets, found {len(pending)}/{len(staged)}")
    counts = Counter(path.parent.name for path in staged)
    if counts != Counter(EXPECTED_STAGING_COUNTS):
        raise ValueError(f"Unexpected staging counts: {dict(counts)}")
    semantics = load_semantics(root)
    mappings = []
    used_sources = set()
    for asset in pending:
        assert_semantics(asset, semantics)
        source = staging_source(staging, asset)
        target = root / asset["path"]
        if not source.is_file():
            raise ValueError(f"Missing staging source for {asset['logicalId']}: {source}")
        resolved = source.resolve()
        if resolved in used_sources:
            raise ValueError(f"Duplicate staging mapping: {source}")
        used_sources.add(resolved)
        png_metadata(source)
        mappings.append((asset, source, target))
    if used_sources != {path.resolve() for path in staged}:
        raise ValueError("Staging contains unmapped or ambiguous PNG files")
    return mappings


def update_counts(manifest: dict) -> None:
    assets = manifest["assets"]
    manifest["counts"] = {
        "total": len(assets),
        "byStatus": dict(sorted(Counter(asset["status"] for asset in assets).items())),
        "byKind": dict(sorted(Counter(asset["kind"] for asset in assets).items())),
    }


def validate_contract(root: Path, manifest: dict, require_clean_staging: bool = True) -> None:
    assets = manifest.get("assets", [])
    if len(assets) != 167:
        raise ValueError(f"Expected 167 manifest entries, found {len(assets)}")
    if len({asset["logicalId"] for asset in assets}) != 167:
        raise ValueError("Logical IDs are not unique")
    if Counter(asset["kind"] for asset in assets) != Counter(EXPECTED_KIND_COUNTS):
        raise ValueError("Manifest kind totals changed")
    statuses = Counter(asset["status"] for asset in assets)
    if statuses != Counter({"ready": 167}):
        raise ValueError(f"Expected 167 ready / 0 pending, found {dict(statuses)}")
    paths = [asset["path"] for asset in assets]
    if len(set(paths)) != len(paths):
        raise ValueError("Canonical asset paths are not one-to-one")
    for asset in assets:
        path = root / asset["path"]
        if not path.is_file():
            raise ValueError(f"Missing ready asset: {asset['path']}")
        actual = png_metadata(path)
        for key, value in actual.items():
            if asset.get(key) != value:
                raise ValueError(f"Metadata mismatch for {asset['logicalId']} field {key}")
    counts = manifest.get("counts", {})
    if counts.get("total") != 167 or counts.get("byStatus") != {"ready": 167}:
        raise ValueError("Manifest summary totals are stale")
    if counts.get("byKind") != EXPECTED_KIND_COUNTS:
        raise ValueError("Manifest summary kind totals are stale")
    if A6_MISSING_LABELS.intersection(manifest.get("productionArtStillPending", [])):
        raise ValueError("Manifest still reports integrated A6 art as pending")
    baseline = Counter(asset["kind"] for asset in assets if asset["kind"] in {"character-pose", "pet-pose"})
    if baseline != Counter({"character-pose": 26, "pet-pose": 11}):
        raise ValueError("Character/pet baseline counts changed")
    if require_clean_staging and list((root / "incoming/chatgpt/assets/a6").rglob("*.png")):
        raise ValueError("Promoted A6 PNG duplicates remain in staging")


def promote(root: Path, manifest_path: Path, manifest: dict) -> None:
    mappings = preflight(root, manifest)
    for asset, source, target in mappings:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and digest(target) != digest(source):
            raise ValueError(f"Refusing to overwrite a different canonical file: {target}")
        if not target.exists():
            shutil.copy2(source, target)
        asset["status"] = "ready"
        asset.update(png_metadata(target))
    update_counts(manifest)
    manifest["productionArtStillPending"] = ["vocabulary images (optional/later)"]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\r\n")
    validate_contract(root, manifest, require_clean_staging=False)
    for _, source, _ in mappings:
        source.unlink()
    staging = root / "incoming/chatgpt/assets/a6"
    for directory in sorted((path for path in staging.rglob("*") if path.is_dir()), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()
    if staging.exists() and not any(staging.iterdir()):
        staging.rmdir()
    validate_contract(root, manifest)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--promote-a6", action="store_true")
    args = parser.parse_args()
    root = Path(args.project_root).resolve()
    manifest_path = root / "assets/ASSET_MANIFEST.json"
    manifest = read_json(manifest_path)
    if args.promote_a6:
        promote(root, manifest_path, manifest)
        manifest = read_json(manifest_path)
    validate_contract(root, manifest)
    print("Asset validation PASS: 167 total, 167 ready, 0 pending, metadata/SHA/path/staging checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
