#!/usr/bin/env python3

import sys
import json
import gzip
import base64

sys.dont_write_bytecode = True
import llmj

def main():
    judgedArr = llmj.build_judged_dataset_array()
    if len(judgedArr) > 0:
        str = json.dumps(judgedArr, ensure_ascii=False)
        encoded = base64.b64encode(gzip.compress(str.encode('utf-8'))).decode('ascii')
        out_path = llmj.DIR_WORK / 'report.html'
        print(f'INFO : generated {out_path.name}')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(llmj.text_from_template_path(llmj.DIR_SUPPORTS / 'template-report.html', {'__ENCODED__': encoded}))
    llmj.finalize()

if __name__ == '__main__':
    main()
