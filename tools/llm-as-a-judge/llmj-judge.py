#!/usr/bin/env python3

import sys
import json
import gzip
import base64
import pathlib

sys.dont_write_bytecode = True
import llmj

ARGS = llmj.get_args(
    {
        'work' : str(llmj.DIR_WORK),
        'reportTarget' : None
    },
    {
        'work' : lambda in_src: pathlib.Path(in_src)
    }
)

statsPath = ARGS['work'] / llmj.STATS_FILE_NAME
if not statsPath.exists():
    ARGS['reportTarget'] = None
else:
    xlsxArr = sorted(ARGS['work'].glob('*' + llmj.SUFFIX_XLS))
    if len(xlsxArr) < 2:
        ARGS['reportTarget'] = None
    elif ARGS['reportTarget'] is None:
        ARGS['reportTarget'] = xlsxArr[-1].name

def make_advice(in_judgedArr, in_reportTarget, in_statsPath):
    currentIndex = None
    for i, dataset in enumerate(in_judgedArr):
        if dataset['name'] + llmj.SUFFIX_XLS == in_reportTarget:
            currentIndex = i
            break
    if currentIndex is None:
        print(f'WARN : report target "{in_reportTarget}" not found')
        return ''
    with open(in_statsPath, encoding='utf-8') as f:
        statsDict = json.load(f)
    prompt = llmj.text_from_template_path(
        llmj.DIR_SUPPORTS / 'template-advice.txt',
        {
            '__STATS__': json.dumps(statsDict, ensure_ascii=False, indent=2),
            '__PREV__': json.dumps(in_judgedArr[currentIndex - 1], ensure_ascii=False, indent=2),
            '__CURR__': json.dumps(in_judgedArr[currentIndex], ensure_ascii=False, indent=2)
        }
    )
    return llmj.RUNNER.toJson(prompt)

def main():
    judgedArr = llmj.build_judged_dataset_array(ARGS['work'])
    if len(judgedArr) > 0:
        judgedRaw = json.dumps(judgedArr, ensure_ascii=False)
        judgedEnc = base64.b64encode(gzip.compress(judgedRaw.encode('utf-8'))).decode('ascii')
        if ARGS['reportTarget'] is None:
            adviceEnc = ''
        else:
            adviceRaw = json.dumps(make_advice(judgedArr, ARGS['reportTarget'], statsPath), ensure_ascii=False)
            adviceEnc = base64.b64encode(gzip.compress(adviceRaw.encode('utf-8'))).decode('ascii')
        out_path = ARGS['work'] / 'report.html'
        print(f'INFO : generated {out_path.name}')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(llmj.text_from_template_path(llmj.DIR_SUPPORTS / 'template-report.html', {
                '__JUDGED__' : judgedEnc,
                '__ADVICE__' : adviceEnc
            }))
    llmj.finalize()

if __name__ == '__main__':
    main()
