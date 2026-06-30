#!/usr/bin/env python3

import sys

sys.dont_write_bytecode = True
import llmj

def main():
    judgedArr = llmj.build_judged_dataset_array()
    if len(judgedArr) > 0:
        out_path = llmj.DIR_WORK / 'report.html'
        print(f'INFO : generated {out_path.name}')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(llmj.text_from_template(llmj.DIR_SUPPORTS / 'template-report.html', {'__JSON__' : judgedArr}))
    llmj.finalize()

if __name__ == '__main__':
    main()
