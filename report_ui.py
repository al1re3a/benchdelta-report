import html
import json
from pathlib import Path


def render(title, columns, rows, note="Offline report; no network requests."):
    web = Path(__file__).resolve().parent / "web"
    data = (
        json.dumps(
            {"columns": columns, "rows": rows}, ensure_ascii=False, allow_nan=False
        )
        .replace("&", chr(92) + "u0026")
        .replace("<", chr(92) + "u003c")
        .replace(">", chr(92) + "u003e")
    )
    headers = "".join(
        '<th><button data-key="'
        + html.escape(key, quote=True)
        + '">'
        + html.escape(key)
        + "</button></th>"
        for key in columns
    )
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
        + html.escape(title)
        + "</title><style>"
        + web.joinpath("report.css").read_text()
        + "</style><main><h1>"
        + html.escape(title)
        + '</h1><p class="subtitle">'
        + html.escape(note)
        + '</p><label>Filter report<input aria-label="Filter report" placeholder="Search any column"></label><p id="count"></p><div class="table"><table><thead><tr>'
        + headers
        + '</tr></thead><tbody></tbody></table></div><small>Click a column to sort. Data is embedded in this file; review before sharing.</small></main><script type="application/json" id="payload">'
        + data
        + "</script><script>"
        + web.joinpath("report.js").read_text()
        + "</script></html>"
    )
