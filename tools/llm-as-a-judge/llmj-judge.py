#!/usr/bin/env python3

import sys
import json

sys.dont_write_bytecode = True
import llmj

def build_html(in_judgedArr):
    with open(llmj.DIR_SUPPORTS / 'template-report.html', encoding='utf-8') as f:
        html = f.read()
    return html.replace('__JSON__', json.dumps(in_judgedArr, ensure_ascii=False))

def main():
    judgedArr = llmj.build_judged_dataset_array()
    if len(judgedArr) > 0:
        out_path = llmj.DIR_WORK / 'report.html'
        print(f'processing : {out_path.name}')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(build_html(judgedArr))
    llmj.finalize()

if __name__ == '__main__':
    main()
