#!/usr/bin/env python3

import sys
import copy
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

ARGS = llmj.get_args(
    {
        'work' : str(llmj.DIR_WORK)
    },
    {
        'work' : lambda in_src: pathlib.Path(in_src)
    }
)

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
    judgedArr = llmj.build_judged_dataset_array(ARGS['work'])
    goldDatasetIx = 0
    if len(judgedArr) > 1:
        print(f'WARN : {len(judgedArr)} judged datasets found. Using {judgedArr[goldDatasetIx]["name"]} as the gold dataset.')
    articleArr = judgedArr[goldDatasetIx]['articleArr']
    filteredArr = filter_score(articleArr)
    if len(filteredArr) > 0:
        print(f'INFO : checking score')
        template = llmj.DIR_SUPPORTS / 'template-feedback1.txt'
        feedback1Arr = llmj.llm_processed_json(template, {
            '__JSON__' : filteredArr
        })
        # print(feedback1Arr)
        print(f'INFO : making proposal')
        goldArr = []
        for gold in feedback1Arr['gold']:
            goldArr.append(articleArr[gold['articleIndex']])
        template = llmj.DIR_SUPPORTS / 'template-feedback2.txt'
        feedback2Arr = llmj.llm_processed_json(template, {
            '__FEEDBACK__': feedback1Arr,
            '__RUBRICS__': llmj.load_rubrics(),
            '__GOLDDATA__': goldArr
        })
        # print(feedback2Arr)
        out_path = ARGS['work'] / 'feedback.html'
        print(f'INFO : generated {out_path.name}')
        template = llmj.DIR_SUPPORTS / 'template-feedback.html'
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(llmj.text_from_template_path(template, {
                '__JUDGED__' : judgedArr,
                '__FEEDBACK__' : feedback2Arr
            }))
    llmj.finalize()

if __name__ == '__main__':
    main()
