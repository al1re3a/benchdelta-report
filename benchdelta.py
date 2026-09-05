"""Compare two Hyperfine JSON exports; no benchmark execution is performed."""

import argparse
import json
import math
import sys
from pathlib import Path
from report_ui import render


def load(path):
    if Path(path).stat().st_size > 32 * 1024 * 1024:
        raise ValueError("input exceeds 32 MiB")
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict) or not isinstance(data.get("results"), list):
        raise ValueError("expected Hyperfine results array")
    results = {}
    for row in data["results"]:
        if not isinstance(row, dict):
            raise ValueError("result must be an object")
        name = row.get("command")
        mean = row.get("mean")
        if not isinstance(name, str) or not name:
            raise ValueError("command must be nonempty")
        if name in results:
            raise ValueError("duplicate command")
        if (
            isinstance(mean, bool)
            or not isinstance(mean, (int, float))
            or not math.isfinite(mean)
            or mean <= 0
        ):
            raise ValueError("mean must be positive and finite")
        results[name] = mean
    if not results:
        raise ValueError("results cannot be empty")
    return results


def compare(before, after, threshold=10):
    if not math.isfinite(threshold) or threshold < 0:
        raise ValueError("threshold must be finite and nonnegative")
    rows = []
    for name in sorted(before.keys() | after.keys()):
        old, new = before.get(name), after.get(name)
        delta = None if old is None or new is None else (new / old - 1) * 100
        status = (
            "added"
            if old is None
            else (
                "removed"
                if new is None
                else (
                    "regression"
                    if delta > threshold + 1e-9
                    else "improvement" if delta < -threshold - 1e-9 else "within-budget"
                )
            )
        )
        rows.append(
            {
                "command": name,
                "before_seconds": old,
                "after_seconds": new,
                "delta_percent": round(delta, 4) if delta is not None else None,
                "status": status,
            }
        )
    return rows


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before")
    parser.add_argument("after")
    parser.add_argument("--threshold", type=float, default=10)
    parser.add_argument("--html", type=Path)
    args = parser.parse_args(argv)
    try:
        rows = compare(load(args.before), load(args.after), args.threshold)
        if args.html:
            with args.html.open("x", encoding="utf-8") as handle:
                handle.write(
                    render(
                        "BenchDelta",
                        list(rows[0]),
                        rows,
                        "Mean elapsed time comparison. Lower is better. Not a statistical significance test.",
                    )
                )
        print(
            json.dumps(
                {"threshold_percent": args.threshold, "rows": rows},
                ensure_ascii=False,
                allow_nan=False,
                indent=2,
            )
        )
        return int(any(row["status"] == "regression" for row in rows))
    except (OSError, ValueError, TypeError) as exc:
        print(f"benchdelta: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
