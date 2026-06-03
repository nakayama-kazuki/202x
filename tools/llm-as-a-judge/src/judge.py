#!/usr/bin/env python3

import argparse
import importlib.util
import json
import sys
import pathlib
import yaml
import subprocess
import openpyxl

try:
    import deepeval
except ImportError:
    print('ERROR : deepeval is not installed.')
    sys.exit(1)

DIR_SRC = pathlib.Path(__file__).resolve().parent
DIR_ROOT = DIR_SRC.parent
DIR_PROMPT = DIR_ROOT / 'prompt'
DIR_RUBRIC = DIR_ROOT / 'rubric'
DIR_DATASET = DIR_ROOT / 'dataset'
DIR_PROVIDERS = DIR_SRC / 'providers'

FILE_CONFIG = DIR_SRC / 'judge.yml'

OPTIONS = {
    'dstype' : str,
    'provider' : str,
    'compare' : str,
    'threshold' : float
}

def load_config():
    if not FILE_CONFIG.exists():
        return None
    with open(FILE_CONFIG, encoding='utf-8') as f:
        return yaml.safe_load(f)

def parse_args():
    parser = argparse.ArgumentParser()
    for dataName, dataClass in OPTIONS.items():
        parser.add_argument(f'--{dataName}', type=dataClass)
    return parser.parse_args()

def resolve_options(in_config, in_args):
    options = {}
    for key in OPTIONS:
        options[key] = getattr(in_args, key)
        if options[key] is None:
            options[key] = in_config.get(key)
    return options

def load_provider(in_provider_name):
    target = DIR_PROVIDERS / in_provider_name / f'{in_provider_name}.py'
    try:
        spec = importlib.util.spec_from_file_location(in_provider_name, target)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception:
        return None

def git_rev(in_path):
    try:
        result = subprocess.run(
            ['git', 'log', '-n', '1', '--format=%h', str(in_path)],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception:
        return '(no-rev)'

def load_files(in_dir):
    try:
        files = []
        for path in sorted(in_dir.glob('*')):
            with open(path, encoding='utf-8') as f:
                files.append(
                    {
                        'name': path.stem,
                        'rev': git_rev(path),
                        'data': f.read(),
                    }
                )
        return files
    except Exception:
        return []

def load_prompt():
    files = load_files(DIR_PROMPT)
    if len(files) == 1:
        return files[0]
    return None

def load_rubrics():
    files = load_files(DIR_RUBRIC)
    if len(files) == 0:
        return None
    for file in files:
        file['data'] = json.loads(file['data'])
    return files

def build_prompt(in_prompt, in_rubrics):
    linespace = chr(10) + chr(10)
    built = in_prompt['data'] + linespace + 'Rubrics:' +linespace
    for rubric in in_rubrics:
        built += json.dumps(rubric['data'], ensure_ascii=False, indent=2)
        built += linespace
    return built

def load_dataset(in_dstype):
    try:
        path = next((DIR_DATASET / in_dstype).glob('*.xlsx'))
        workbook = openpyxl.load_workbook(path, read_only=True)
        sheet = workbook.active
        rows = list(sheet.iter_rows(values_only=True))
        parsed = []
        for row in rows[1:]:
            parsed.append({
                rows[0][0] : row[0],
                rows[0][1] : row[1]
            })
        return {
            'name': path.stem,
            'rev': git_rev(path),
            'data': parsed,
        }
    except Exception:
        return None

def main():
    config = load_config()
    if config is None:
        print('ERROR : can not read config.')
        sys.exit(1)
    args = parse_args()
    options = resolve_options(config, args)
    if options['compare'] is not None:
        if not pathlib.Path(options['compare']).exists():
            print('ERROR : can not read compare.')
            sys.exit(1)
    provider = load_provider(options['provider'])
    if provider is None:
        print('ERROR : can not read provider.')
        sys.exit(1)
    prompt = load_prompt()
    if prompt is None:
        print('ERROR : can not read prompt.')
        sys.exit(1)
    rubrics = load_rubrics()
    if rubrics is None:
        print('ERROR : can not read rubrics.')
        sys.exit(1)
    built = build_prompt(prompt, rubrics)
    dataset = load_dataset(options['dstype'])
    if dataset is None:
        print('ERROR : can not read xlsx.')
        sys.exit(1)


    for testcase in dataset['data']:
        generated = provider.evaluate(
            built_prompt,
            testcase['original'],
        )

        print('=== GENERATED ===')
        print(generated)
        break

    #
    # TODO:
    #
    # for testcase in dataset:
    #     deepeval evaluate
    #
    # aggregate result
    #
    # compare
    #
    # save json
    #

    print('READY')


if __name__ == '__main__':
    main()

