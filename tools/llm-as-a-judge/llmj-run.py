#!/usr/bin/env python3

import sys
import pathlib
import subprocess

import llmj

DIR_ROOT = pathlib.Path(__file__).resolve().parent

FILES = [
    'llmj-1-generate.py',
    'llmj-2-judge.py',
    'llmj-3-report.py',
]

def main():
    for name in FILES:
        path = DIR_ROOT / name
        if not path.exists():
            print(f'ERROR : can not find "{name}"')
            sys.exit(1)
        print()
        print('=' * 80)
        print(name)
        print('=' * 80)
        print()
        result = subprocess.run(
            [sys.executable, str(path)],
            cwd=DIR_ROOT
        )
        if result.returncode != 0:
            print()
            print(f'ERROR : "{name}" failed')
            sys.exit(result.returncode)
    print()
    print('completed')
    llmj.finalize()

if __name__ == '__main__':
    main()
