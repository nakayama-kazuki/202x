#!/usr/bin/env python3

import sys
import shutil
import pathlib
import subprocess
import statistics

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

ARGS = llmj.get_args(
    {
        'variation': '10',
        'iteration': '5'
    },
    {
        'variation': lambda in_cnt: int(in_cnt),
        'iteration': lambda in_cnt: int(in_cnt)
    }
)

DIR_TEMP = llmj.DIR_ROOT / '__aa__'
DIR_TEMP_SOURCE = DIR_TEMP / 'source'
DIR_TEMP_WORK = DIR_TEMP / 'work'

def run(in_script, *in_args):
    subprocess.run([sys.executable, str(in_script), *map(str, in_args)], check=True)

def copy_initial_prompt():
    src = DIR_TEMP_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_TXT}'
    for i in range(ARGS['iteration']):
        dst = DIR_TEMP_WORK / f'aa-{i:03d}{llmj.SUFFIX_TXT}'
        shutil.copy2(src, dst)
    src.unlink()

def collect_statistics():
    scoreDict = {}
    judgedDatasetArr = llmj.build_judged_dataset_array(DIR_TEMP_WORK)
    for dataset in judgedDatasetArr:
        for article in dataset['articleArr']:
            for result in article['results']:
                scoreDict.setdefault(result['name'], [])
                scoreDict[result['name']].append(result['score'])
    threshold = 0.9
    rubricArr = []
    for name in sorted(scoreDict):
        scores = scoreDict[name]
        below = 0
        for score in scores:
            if score < threshold:
                below += 1
        rubricArr.append({
            'name': name,
            'count': len(scores),
            'average': statistics.mean(scores),
            'min': min(scores),
            'max': max(scores),
            'stddev': statistics.pstdev(scores),
            'belowThreshold': below
        })
    statisticsDict = {
        'model': llmj.RUNNER.model,
        'articles': ARGS['variation'],
        'iterations': ARGS['iteration'],
        'threshold': threshold,
        'rubrics': rubricArr
    }
    path = llmj.DIR_RUBRIC / 'statistics.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(statisticsDict, f, ensure_ascii=False, indent=2)
    print(f'INFO : generated "{path.name}"')

def main():
    shutil.rmtree(DIR_TEMP, ignore_errors=True)
    DIR_TEMP_SOURCE.mkdir(parents=True)
    DIR_TEMP_WORK.mkdir(parents=True)
    try:
        run(llmj.DIR_SUPPORTS / 'llmj-fake-source.py', '--source', DIR_TEMP_SOURCE, '--textCnt', ARGS['variation'])
        run(llmj.DIR_SUPPORTS / 'llmj-initial.py', '--work', DIR_TEMP_WORK)
        copy_initial_prompt()
        run(llmj.DIR_ROOT / 'llmj-generate.py', '--work', DIR_TEMP_WORK, '--source', DIR_TEMP_SOURCE)
        run(llmj.DIR_ROOT / 'llmj-judge.py', '--work', DIR_TEMP_WORK)
        collect_statistics()
    finally:
        shutil.rmtree(DIR_TEMP, ignore_errors=True)
    llmj.finalize()

if __name__ == '__main__':
    main()
