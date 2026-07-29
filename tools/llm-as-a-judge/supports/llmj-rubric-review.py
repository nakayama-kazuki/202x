#!/usr/bin/env python3

import sys
import copy
import pathlib
import shutil

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

ARGS = llmj.setupArgs({
    'work' : {
        'default' : str(llmj.DIR_WORK),
        'convert' : lambda in_src: pathlib.Path(in_src),
        'explain' : 'Directory containing prompt templates to configure.'
    }
})

DIR_TEMP = llmj.DIR_ROOT / '.temp-for-rubric-review'

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
    shutil.rmtree(DIR_TEMP, ignore_errors=True)
    shutil.copytree(ARGS['work'], DIR_TEMP)
    judgedArr = llmj.build_judged_dataset_array(DIR_TEMP)
    shutil.rmtree(DIR_TEMP, ignore_errors=True)
    gapAnalysis = {"rubrics" : [], "gold" : []}
    goldDatasetIx = 0
    rubricArr = llmj.load_rubrics()
    if len(judgedArr) > 0:
        articleArr = judgedArr[goldDatasetIx]['articleArr']
        if len(judgedArr) > 1:
            print(f'WARN : {len(judgedArr)} judged datasets found. Using {judgedArr[goldDatasetIx]["name"]} as the gold dataset.')
        filteredArr = filter_score(articleArr)
        print(f'INFO : checking score')
        template = llmj.DIR_SUPPORTS / 'template-rubric-review-1.txt'
        gapTargetArr = llmj.llm_processed_json(template, {
            '__JUDGED__' : filteredArr
        })
        # print(gapTargetArr)
        print(f'INFO : making proposal')
        goldArticleArr = []
        for gold in gapTargetArr['gold']:
            goldArticleArr.append(articleArr[gold['articleIndex']])
        template = llmj.DIR_SUPPORTS / 'template-rubric-review-2.txt'
        gapAnalysis = llmj.llm_processed_json(template, {
            '__TARGETS__': gapTargetArr,
            '__RUBRICS__': rubricArr,
            '__GOLDDATA__': goldArticleArr
        })
        # print(gapAnalysis)
    print(f'INFO : reviewing rubric')
    template = llmj.DIR_SUPPORTS / 'template-rubric-review-3.txt'
    rubricIssueArr = llmj.llm_processed_json(template, {
        '__RUBRICS__': rubricArr
    })
    # print(rubricIssueArr)
    out_path = ARGS['work'] / 'rubric-review.html'
    print(f'INFO : generated {out_path.name}')
    template = llmj.DIR_SUPPORTS / 'template-rubric-review.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(llmj.text_from_template_path(template, {
            '__JUDGED__' : judgedArr,
            '__GOLD_GAP__' : gapAnalysis,
            '__RUBRIC_ISSUE__' : rubricIssueArr
        }))
    llmj.finalize()

if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        llmj.abort(f'ERROR : {err} ({llmj.ERROR_RETRY_MESSAGE})')
