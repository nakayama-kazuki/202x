#!/usr/bin/env python3

import sys
import pathlib
import copy

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

def filter_score(in_judgedArr):
    filteredArr = copy.deepcopy(in_judgedArr)
    for judged in filteredArr:
        for article in judged['articleArr']:
            del article['original']
            del article['generated']
            del article['lang']
            for result in article['results']:
                del result['reason']
    return filteredArr

def main():
    judgedArr = llmj.build_judged_dataset_array()
    filteredArr = filter_score(judgedArr)
    if len(filteredArr) > 0:
        feedback1Arr = llmj.json_from_template('template-feedback1.txt', {
            '__JSON__' : filteredArr
        })
        # print(feedback1Arr)
        goldArr = []
        for gold in feedback1Arr['gold']:
            goldArr.append(judgedArr[0]['articleArr'][gold['index'] - 1])
        feedback2Arr = llmj.json_from_template('template-feedback2.txt', {
            '__FEEDBACK__': feedback1Arr,
            '__RUBRICS__': llmj.load_rubrics(),
            '__GOLDDATA__': goldArr
        })
        print(feedback2Arr)
    llmj.finalize()

if __name__ == '__main__':
    main()
