#!/usr/bin/env python3

import sys
import json
import shutil
import pathlib
import subprocess
import statistics

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

ARGS = llmj.setupArgs({
    'variation' : {
        'default' : '30',
        'convert' : lambda in_cnt: int(in_cnt),
        'explain' : 'Number of generated prompt variations.'
    },
    'iteration' : {
        'default' : '3',
        'convert' : lambda in_cnt: int(in_cnt),
        'explain' : 'Number of evaluation iterations for each variation.'
    },
    'source' : {
        'default' : None,
        'convert' : lambda in_path: None if in_path is None else pathlib.Path(in_path),
        'explain' : 'Source article directory. If omitted, fake articles are generated.'
    }
})

DIR_TEMP = llmj.DIR_ROOT / '.temp-for-configure'
DIR_TEMP_SOURCE = DIR_TEMP / 'source'
DIR_TEMP_WORK = DIR_TEMP / 'work'

def run(in_script, *in_args):
    subprocess.run([sys.executable, str(in_script), *map(str, in_args)], check=True)

def setup_aa_testing(in_iteration):
    src = DIR_TEMP_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_XLS}'
    for i in range(in_iteration):
        dst = DIR_TEMP_WORK / f'aa-{i:03d}{llmj.SUFFIX_XLS}'
        shutil.copy2(src, dst)
    src.unlink()

def collect_statistics(in_path):
    rubricScoreDict = {}
    judgedDatasetArr = llmj.build_judged_dataset_array(DIR_TEMP_WORK)
    for dataset in judgedDatasetArr:
        for article in dataset['articleArr']:
            articleScoreDict = {}
            for result in article['results']:
                articleScoreDict[result['name']] = result['score']
            for name, score in articleScoreDict.items():
                rubricScoreDict.setdefault(name, [])
                rubricScoreDict[name].append(score)
    rubricDict = {}
    for name in sorted(rubricScoreDict):
        scoreArr = rubricScoreDict[name]
        articleScoreArrArr = []
        for index in range(0, len(scoreArr), ARGS['iteration']):
            articleScoreArrArr.append(scoreArr[index:index + ARGS['iteration']])
        stddevArr = []
        avgArr = []
        for articleScoreArr in articleScoreArrArr:
            stddevArr.append(statistics.pstdev(articleScoreArr))
            avgArr.append(statistics.mean(articleScoreArr))
        rubricDict[name] = {
            'stddevAvg' : statistics.mean(stddevArr),
            'stddevMax' : max(stddevArr),
            'testDataInfo' : {
                'max' : max(avgArr),
                'min' : min(avgArr),
                'avg' : statistics.mean(avgArr),
                'stddev' : statistics.pstdev(avgArr)
            }
        }
    statsDict = {
        'model' : llmj.RUNNER.model,
        'articles' : len(judgedDatasetArr[0]['articleArr']),
        'iterations' : ARGS['iteration'],
        'note' : {
            'stddevAvg' : 'Average standard deviation of repeated evaluations for the same test data. Lower values indicate more consistent scoring.',
            'stddevMax' : 'Maximum standard deviation among all test data. Lower values indicate the worst-case evaluation inconsistency is smaller.',
            'testDataInfo.stddev' : 'Standard deviation of the average scores across the test data. Higher values indicate the test data covers a wider range of quality.'
        },
        'rubrics' : rubricDict
    }
    with open(in_path, 'w', encoding='utf-8') as f:
        json.dump(statsDict, f, ensure_ascii=False, indent=2)
    print(f'INFO : generated "{in_path.name}"')

def main():
    DIR_TEMP_SOURCE.mkdir(parents=True, exist_ok=True)
    DIR_TEMP_WORK.mkdir(parents=True, exist_ok=True)
    output_path = llmj.DIR_WORK / llmj.STATS_FILE_NAME
    try:
        if ARGS['source'] is None:
            sourceArr = list(DIR_TEMP_SOURCE.glob('*.txt'))
            if len(sourceArr) != ARGS['variation']:
                for path in sourceArr:
                    path.unlink()
                run(llmj.DIR_SUPPORTS / 'llmj-fake-source.py', '--source', DIR_TEMP_SOURCE, '--textCnt', ARGS['variation'])
        else:
            shutil.copytree(ARGS['source'], DIR_TEMP_SOURCE, dirs_exist_ok=True)
        aaPromptPath = DIR_TEMP_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_TXT}'
        if not aaPromptPath.exists():
            run(llmj.DIR_SUPPORTS / 'llmj-initial.py', '--work', DIR_TEMP_WORK)
        run(llmj.DIR_ROOT / 'llmj-generate.py', '--work', DIR_TEMP_WORK, '--source', DIR_TEMP_SOURCE)
        setup_aa_testing(ARGS['iteration'])
        run(llmj.DIR_ROOT / 'llmj-judge.py', '--work', DIR_TEMP_WORK)
        collect_statistics(output_path)
    finally:
        if output_path.exists():
            shutil.rmtree(DIR_TEMP, ignore_errors=True)
    llmj.finalize()

if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        llmj.abort(f'ERROR : {llmj.ERROR_RETRY_MESSAGE} ({err})')
