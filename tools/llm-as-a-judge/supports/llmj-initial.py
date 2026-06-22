#!/usr/bin/env python3

import sys
import json
import pathlib

# to import llmj
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

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
    initialPprompt = initialPprompt.replace('__JSON__', json.dumps(in_rubricArr, ensure_ascii=False, indent=2))
    initialPprompt = initialPprompt.replace('__PLACEHOLDER__', llmj.ORIGINAL_PLACEHOLDER)
    return initialPprompt

def main():
    runtime = llmj.create_bedrock_runtime()
    generated = llmj.invoke_llm(runtime, llmj.LLM_MODEL, build_prompt(load_rubrics()))
    target = llmj.DIR_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_TXT}'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(generated)
    print(f'OK : generated "{target.name}"')
    llmj.finalize()

if __name__ == '__main__':
    main()
