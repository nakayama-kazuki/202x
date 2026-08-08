#!/usr/bin/env python3

import sys
import json
import random
import pathlib
import importlib.util

sys.dont_write_bytecode = True
import llmj

ARGS = llmj.setupArgs({
    'source' : {
        'default' : str(llmj.DIR_SOURCE),
        'convert' : lambda in_src: pathlib.Path(in_src),
        'explain' : 'Directory containing source text files.'
    },
    'work' : {
        'default' : str(llmj.DIR_WORK),
        'convert' : lambda in_src: pathlib.Path(in_src),
        'explain' : 'Directory containing prompt templates and generated XLSX files.'
    },
    'postprocRetry' : {
        'default' : '10',
        'convert' : lambda in_cnt: int(in_cnt),
        'explain' : 'Maximum number of retries when postproc() requests regeneration.'
    }
})

def load_postproc(in_prompt_path):
    path = in_prompt_path.with_suffix('.postproc.py')
    if not path.exists():
        return lambda in_text: in_text
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, 'postproc'):
        llmj.abort(f'ERROR : "postproc" is not defined in "{path.name}"')
    return module.postproc

def get_meta(in_path):
    meta_path = in_path.with_suffix(llmj.SUFFIX_META)
    if not meta_path.exists():
        return llmj.WITHOUT_META_MESSAGE
    with open(meta_path, encoding='utf-8') as f:
        metainfo = json.load(f)
    def _choose(in_dict):
        for key, value in list(in_dict.items()):
            if key.endswith(llmj.RANDOM_IN_META):
                try:
                    name = key[:-len(llmj.RANDOM_IN_META)]
                    in_dict[name] = random.choice(value)
                    del in_dict[key]
                except Exception:
                    llmj.abort(f'ERROR : "{key}" in "{meta_path.name}" must be a non-empty list.')
            elif isinstance(value, dict):
                _choose(value)
    if isinstance(metainfo, dict):
        _choose(metainfo)
    return json.dumps(metainfo, ensure_ascii=False, indent=2)

def process_prompt(in_prompt_path):
    xls = in_prompt_path.name.removesuffix(llmj.SUFFIX_TXT) + llmj.SUFFIX_XLS
    xls_path = in_prompt_path.with_name(xls)
    if xls_path.exists():
        workbook = llmj.openpyxl.load_workbook(xls_path)
    else:
        workbook = llmj.openpyxl.Workbook()
    sheet = workbook.active
    colDict = {}
    for key in llmj.COL_GEN:
        colDict[key] = llmj.find_append_column(sheet, llmj.COL_GEN[key])
    sourceArr = sorted(ARGS['source'].glob('*.txt'))
    postproc = load_postproc(in_prompt_path)
    for row, src_path in enumerate(sourceArr, start=2):
        print(f'INFO : processing  {row - 1} / {len(sourceArr)}')
        if sheet.cell(row, colDict['GENERATED']).value:
            continue
        textDict = {}
        try:
            with open(src_path, encoding='utf-8') as f:
                textDict['ORIGINAL'] = f.read()
        except Exception:
            llmj.abort(f'ERROR : can not read "{src_path.name}"')
        prompt = llmj.text_from_template_path(in_prompt_path, {llmj.PLACEHOLDER_ORIGINAL : textDict['ORIGINAL']})
        metadata = get_meta(src_path)
        textDict['METADATA'] = metadata
        if llmj.PLACEHOLDER_METADATA in prompt:
            prompt = llmj.text_from_template_text(prompt, {llmj.PLACEHOLDER_METADATA : metadata})
        additionalOrder = ''
        for retry in range(ARGS['postprocRetry']):
            generated = llmj.RUNNER.toText(prompt + additionalOrder)
            checked = postproc(generated)
            if checked is not None:
                textDict['GENERATED'] = checked
                break
            additionalOrder = chr(10).join([
                '',
                '',
                'Additionally, the following output is considered invalid:',
                generated,
                'Generate a different output that satisfies all requirements.'
            ])
            print(f'WARN : retrying {retry + 1}/{ARGS["postprocRetry"]} because postproc returned None for "{generated}"')
        else:
            llmj.abort(f'ERROR : postproc failed after {ARGS["postprocRetry"]} retries')
        for key in llmj.COL_GEN:
            sheet.cell(row, colDict[key]).value = textDict[key]
        workbook.save(xls_path)
    print(f'INFO : generated {xls_path.name}')

def main():
    for path in sorted(ARGS['work'].glob('*' + llmj.SUFFIX_TXT)):
        process_prompt(path)
    llmj.finalize()

if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        llmj.abort(f'ERROR : {err} ({llmj.ERROR_RETRY_MESSAGE})')
