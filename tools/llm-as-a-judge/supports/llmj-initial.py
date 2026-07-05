#!/usr/bin/env python3

import sys
import json
import pathlib

try:
    import langdetect
except ImportError:
    llmj.abort_missing_package('langdetect')

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

def build_prompt(in_rubricArr):
    try:
        rubricLang = langdetect.detect(json.dumps(in_rubricArr, ensure_ascii=False))
    except Exception:
        rubricLang = 'en'
    template = llmj.DIR_SUPPORTS / 'template-initial-prompt.txt'
    return llmj.text_from_template(template, {
        '__JSON__' : in_rubricArr,
        '__PLACEHOLDER__' : llmj.ORIGINAL_PLACEHOLDER,
        '__RUBRICS_LANG__' : rubricLang
    })

def main():
    prompt = build_prompt(llmj.load_rubrics())
    generated = llmj.RUNNER.toText(prompt)
    target = llmj.DIR_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_TXT}'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(generated)
    print(f'INFO : generated "{target.name}"')
    llmj.finalize()

if __name__ == '__main__':
    main()
