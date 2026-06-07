#!/usr/bin/env python3

import os
import sys

import llmj

try:
    import openpyxl
except ImportError:
    llmj.abort_missing_package('openpyxl')

def process_prompt(in_runtime, in_path):
    try:
        with open(in_path, encoding='utf-8') as f:
            template = f.read()
    except Exception:
        print(f'ERROR : can not read "{in_path.name}"')
        sys.exit(1)
    filename = in_path.name.removesuffix(llmj.SUFFIX_PROMPT) + llmj.SUFFIX_GENERATED
    dst_path = in_path.with_name(filename)
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    keys = ['ORIGINAL', 'GENERATED']
    cols = {}
    for key in keys:
        cols[key] = llmj.find_append_column(sheet, llmj.TERM[key])
    sourceArr = sorted(llmj.DIR_SOURCE.glob('*.txt'))
    for row, src_path in enumerate(sourceArr, start=2):
        texts = {}
        try:
            with open(src_path, encoding='utf-8') as f:
                texts['ORIGINAL'] = f.read()
        except Exception:
            print(f'ERROR : can not read "{src_path.name}"')
            sys.exit(1)
        prompt = template.replace(llmj.ORIGINAL_PLACEHOLDER, texts['ORIGINAL'])
        texts['GENERATED'] = llmj.invoke_llm(in_runtime, llmj.LLM_MODEL, prompt)
        for key in keys:
            sheet.cell(row, cols[key]).value = texts[key]
        workbook.save(dst_path)
        print(f'progress : {row - 1} / {len(sourceArr)}')
    print(f'completed : {dst_path.name}')

def main():
    token = os.getenv('ACCESS_TOKEN')
    if not token:
        print('ERROR : ACCESS_TOKEN is not set')
        sys.exit(1)
    pathArr = llmj.find_target_files(llmj.SUFFIX_PROMPT, llmj.SUFFIX_GENERATED)
    if len(pathArr) == 0:
        print('completed : nothing to do')
        return
    runtime = llmj.create_bedrock_runtime(token)
    for path in pathArr:
        process_prompt(runtime, path)
    llmj.finalize()

if __name__ == '__main__':
    main()

