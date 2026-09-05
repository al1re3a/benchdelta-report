# Compare saved runs in CI

BenchDelta reads two existing Hyperfine JSON exports. It does not run benchmarks, fetch arbitrary code, or post PR comments.

Use consistent command names and comparable measurement environments. Hosted runner noise can exceed a small change; review repeated measurements before treating a mean difference as a regression.

```bash
python benchdelta.py before.json after.json --threshold 10 --html report.html
```

Exit codes: `0` means no comparable command exceeded the budget; `1` means at least one did; `2` means invalid input or an output error. Added and removed commands are reported but do not fail the budget check. A missing candidate command must therefore be reviewed separately.

## GitHub Actions recipe

Vendor the four CLI files (`benchdelta.py`, `report_ui.py`, `web/report.js`, and `web/report.css`) from a reviewed release into `tools/benchdelta/`. Produce `before.json` and `after.json` in your own trusted benchmark job, then add:

```yaml
- name: Compare saved measurements
  run: python tools/benchdelta/benchdelta.py before.json after.json --threshold 10 --html report.html

- name: Keep the comparison report even when the budget fails
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: benchmark-comparison
    path: report.html
    if-no-files-found: warn
```

The comparison step retains its failure status. The upload step makes the report available for review. Use a new report path on every local invocation; an existing report is not overwritten.

## When the browser is enough

For an occasional comparison, start the [browser demo locally](../README.en.md#try-it-locally-in-your-browser), choose both exports, set the budget, and copy Markdown. The page processes selected files on your device and does not send their contents to a server.

The browser limit is 4 MiB and 2,000 commands per file. The Python CLI accepts files up to 32 MiB. Both compare mean seconds, not statistical significance.
