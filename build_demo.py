"""Build the dependency-free browser demo into the ignored dist directory."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'dist'

def build():
    OUTPUT.mkdir(exist_ok=True)
    for name in ('index.html', 'demo.css', 'demo.js', 'compare.js'):
        shutil.copyfile(ROOT / 'web' / name, OUTPUT / name)
    print('BenchDelta demo built in dist/')

if __name__ == '__main__':
    build()
