#!/usr/bin/env python3

import sys
import copy
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

def filter_score(in_articleArr):
    filteredArr = copy.deepcopy(in_articleArr)
    for article in filteredArr:
        del article['original']
        del article['generated']
        del article['lang']
        for result in article['results']:
            del result['reason']
    return filteredArr

def main():
    judgedArr = llmj.build_judged_dataset_array()
    goldDatasetIx = 0
    articleArr = judgedArr[goldDatasetIx]['articleArr']
    filteredArr = filter_score(articleArr)
    if len(filteredArr) > 0:
        print(f'INFO : checking score')
        template1 = llmj.DIR_SUPPORTS / 'template-feedback1.txt'
        feedback1Arr = llmj.llm_processed_json(template1, {
            '__JSON__' : filteredArr
        })
        # print(feedback1Arr)
        print(f'INFO : improving')
        goldArr = []
        for gold in feedback1Arr['gold']:
            goldArr.append(articleArr[gold['articleIndex']])
        template2 = llmj.DIR_SUPPORTS / 'template-feedback2.txt'
        feedback2Arr = llmj.llm_processed_json(template2, {
            '__FEEDBACK__': feedback1Arr,
            '__RUBRICS__': llmj.load_rubrics(),
            '__GOLDDATA__': goldArr
        })
        # print(feedback2Arr)
        out_path = llmj.DIR_WORK / 'feedback.html'
        print(f'INFO : generated {out_path.name}')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(llmj.text_from_template(llmj.DIR_SUPPORTS / 'template-feedback.html', {'__JSON__' : feedback2Arr}))
    llmj.finalize()

if __name__ == '__main__':
    main()
