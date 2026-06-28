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

def load_rubrics():
    rubricArr = []
    for path in sorted(llmj.DIR_RUBRIC.glob('*.json')):
        with open(path, encoding='utf-8') as f:
            rubricArr.append(json.load(f))
    return rubricArr

def build_prompt(in_rubricArr):
    with open(llmj.DIR_SUPPORTS / 'template-initial-prompt.txt', encoding='utf-8') as f:
        initialPprompt = f.read()
    rubricJson = json.dumps(in_rubricArr, ensure_ascii=False, indent=2)
    try:
        rubricLang = langdetect.detect(rubricJson)
    except Exception:
        rubricLang = 'en'
    initialPprompt = initialPprompt.replace('__JSON__', rubricJson)
    initialPprompt = initialPprompt.replace('__PLACEHOLDER__', llmj.ORIGINAL_PLACEHOLDER)
    initialPprompt = initialPprompt.replace('__RUBRICS_LANG__', rubricLang)
    return initialPprompt

def main():
    runtime = llmj.create_bedrock_runtime()
    generated = llmj.invoke_llm(runtime, build_prompt(load_rubrics()))
    target = llmj.DIR_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_TXT}'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(generated)
    print(f'OK : generated "{target.name}"')
    llmj.finalize()

if __name__ == '__main__':
    main()
