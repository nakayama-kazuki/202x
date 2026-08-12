#!/usr/bin/env python3

import sys
import json
import random
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
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
    }
})

TEMPLATE_ARR = [
    '{{CATEGORY_S}} 系の情報に興味はありますか？',
    'もしかして {{CATEGORY_M}} 系に興味あり？{{CATEGORY_S}} 関連の投稿がありました',
    '投稿のあった {{CATEGORY_S}} 系の内容、気になりませんか？',
    'もし {{CATEGORY_S}} 系の情報に関心があれば、投稿をご覧ください',
    'あなたが興味がありそうな {{CATEGORY_S}} に関する投稿がありました'
]

TEMPLATE_WITHOUT_CATEGORY = 'あなたが興味がありそうな投稿がありました'

def get_meta(in_path):
    meta_path = in_path.with_suffix(llmj.SUFFIX_META)
    if not meta_path.exists():
        return llmj.WITHOUT_META_MESSAGE, None
    with open(meta_path, encoding='utf-8') as f:
        parsed = json.load(f)
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
    if isinstance(parsed, dict):
        _choose(parsed)
    metastring = json.dumps(parsed, ensure_ascii=False, indent=2)
    return metastring, parsed

def rulebased_briefing(in_metainfo):
    try:
        categories = in_metainfo['Metadata attached to the input text']['categories'][0]
        category_m = categories[0]
        category_s = categories[1]
    except Exception:
        return TEMPLATE_WITHOUT_CATEGORY
    return llmj.text_from_template_text(random.choice(TEMPLATE_ARR), {
        '{{CATEGORY_M}}' : category_m,
        '{{CATEGORY_S}}' : category_s
    })

def process_for_run(in_path):
    xls_path = in_path.with_suffix(llmj.SUFFIX_XLS)
    if xls_path.exists():
        workbook = llmj.openpyxl.load_workbook(xls_path)
    else:
        workbook = llmj.openpyxl.Workbook()
    sheet = workbook.active
    colDict = {}
    for key in llmj.COL_GEN:
        colDict[key] = llmj.find_append_column(sheet, llmj.COL_GEN[key])
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
            llmj.abort(f'ERROR : can not read "{src_path.name}"')
        metastring, parsed = get_meta(src_path)
        textDict['METADATA'] = metastring
        textDict['GENERATED'] = rulebased_briefing(parsed)
        for key in llmj.COL_GEN:
            sheet.cell(row, colDict[key]).value = textDict[key]
        workbook.save(xls_path)
    print(f'INFO : generated {xls_path.name}')

def main():
    for path in sorted(ARGS['work'].glob('*' + llmj.SUFFIX_TXT)):
        process_for_run(path)
    llmj.finalize()

if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        llmj.abort(f'ERROR : {err} ({llmj.ERROR_RETRY_MESSAGE})')
