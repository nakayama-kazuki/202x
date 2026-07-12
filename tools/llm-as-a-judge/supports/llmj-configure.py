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

ARGS = llmj.get_args(
    {
        'variation': '30',
        'iteration': '3'
    },
    {
        'variation': lambda in_cnt: int(in_cnt),
        'iteration': lambda in_cnt: int(in_cnt)
    }
)

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
    scoreDict = {}
    judgedDatasetArr = llmj.build_judged_dataset_array(DIR_TEMP_WORK)
    for dataset in judgedDatasetArr:
        for article in dataset['articleArr']:
            for result in article['results']:
                scoreDict.setdefault(result['name'], [])
                scoreDict[result['name']].append(result['score'])
    rubricArr = []
    for name in sorted(scoreDict):
        scores = scoreDict[name]
        rubricArr.append({
            'name': name,
            'count': len(scores),
            'average': statistics.mean(scores),
            'min': min(scores),
            'max': max(scores),
            'stddev': statistics.pstdev(scores)
        })
    statsDict = {
        'model': llmj.RUNNER.model,
        'articles': ARGS['variation'],
        'iterations': ARGS['iteration'],
        'rubrics': rubricArr
    }
    with open(in_path, 'w', encoding='utf-8') as f:
        json.dump(statsDict, f, ensure_ascii=False, indent=2)
    print(f'INFO : generated "{in_path.name}"')

def main():
    DIR_TEMP_SOURCE.mkdir(parents=True, exist_ok=True)
    DIR_TEMP_WORK.mkdir(parents=True, exist_ok=True)
    output_path = llmj.DIR_WORK / llmj.STATS_FILE_NAME
    try:
        run(llmj.DIR_SUPPORTS / 'llmj-fake-source.py', '--source', DIR_TEMP_SOURCE, '--textCnt', ARGS['variation'])
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
    main()
