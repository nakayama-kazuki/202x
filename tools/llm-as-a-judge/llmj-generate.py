#!/usr/bin/env python3

import sys
import pathlib

sys.dont_write_bytecode = True
import llmj

try:
    import openpyxl
except ImportError:
    llmj.abort_missing_package('openpyxl')

ARGS = llmj.get_args(
    {
        'source' : str(llmj.DIR_SOURCE),
        'work' : str(llmj.DIR_WORK)
    },
    {
        'source' : lambda in_src: pathlib.Path(in_src),
        'work' : lambda in_src: pathlib.Path(in_src)
    }
)

def process_prompt(in_prompt_path):
    xls = in_prompt_path.name.removesuffix(llmj.SUFFIX_TXT) + llmj.SUFFIX_XLS
    xls_path = in_prompt_path.with_name(xls)
    if xls_path.exists():
        workbook = openpyxl.load_workbook(xls_path)
    else:
        workbook = openpyxl.Workbook()
    sheet = workbook.active
    colDict = {}
    for key in llmj.TERM_GEN:
        colDict[key] = llmj.find_append_column(sheet, llmj.TERM_GEN[key])
    sourceArr = sorted(ARGS['source'].glob('*.txt'))
    for row, src_path in enumerate(sourceArr, start=2):
        print(f'INFO : processing  {row - 1} / {len(sourceArr)}')
        if sheet.cell(row, colDict['GENERATED']).value:
            continue
        textDict = {}
        try:
            with open(src_path, encoding='utf-8') as f:
                textDict['ORIGINAL'] = f.read()
        except Exception:
            print(f'ERROR : can not read "{src_path.name}"')
            llmj.abort()
        prompt = llmj.text_from_template_path(in_prompt_path, {llmj.ORIGINAL_PLACEHOLDER : textDict['ORIGINAL']})
        textDict['GENERATED'] = llmj.RUNNER.toText(prompt)
        for key in llmj.TERM_GEN:
            sheet.cell(row, colDict[key]).value = textDict[key]
        workbook.save(xls_path)
    print(f'INFO : generated {xls_path.name}')

def main():
    for path in sorted(ARGS['work'].glob('*' + llmj.SUFFIX_TXT)):
        process_prompt(path)
    llmj.finalize()

if __name__ == '__main__':
    main()

