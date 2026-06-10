#!/usr/bin/env python3

import os
import sys
import time
import shutil
import pathlib
import dotenv

dotenv.load_dotenv()
for required in ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'SESSION_TOKEN', 'GATEWAY_URL']:
    if os.getenv(required) is None:
        print(f'ERROR : {required} is not defined in ".env".')
        abort()

def abort_missing_package(in_package):
    print(f'ERROR : exec "python -m pip install {in_package}" at first.')
    abort()

try:
    import boto3
except ImportError:
    abort_missing_package('boto3')

OUTOUT_LANG = 'Japanese'

DIR_ROOT = pathlib.Path(__file__).resolve().parent
DIR_SOURCE = DIR_ROOT / 'source'
DIR_WORK = DIR_ROOT / 'work'
DIR_RUBRIC = DIR_ROOT / 'rubric'

for path in [DIR_SOURCE, DIR_RUBRIC]:
    if not path.is_dir():
        print(f'ERROR : can not find "{path.name}" directory.')
        abort()

DIR_WORK.mkdir(exist_ok=True)

SUFFIX_PROMPT = '.0-prompt.txt'
SUFFIX_GENERATED = '.1-generated.xlsx'
SUFFIX_JUDGED = '.2-judged.xlsx'
FILE_REPORT = 'report.html'

INITIAL_VERSION_NAME = 'ver-001'

ORIGINAL_PLACEHOLDER = '{{original}}'

LLM_MODEL = 'us.anthropic.claude-sonnet-4-6'
LLM_MAX_TOKENS = 4096
LLM_TEMPERATURE = 0
LLM_RETRY_COUNT = 3
LLM_RETRY_INTERVAL_SEC = 5

TERM = {
    'ORIGINAL': 'original',
    'GENERATED': 'generated',
    'SCORE': 'score',
    'REASON': 'reason'
}

def _create_finalize():
    start_time = time.time()
    def _finalize():
        for name in ['__pycache__', '.deepeval']:
            shutil.rmtree(DIR_ROOT / name, ignore_errors=True)
        elapsed = time.time() - start_time
        print(f'completed {pathlib.Path(sys.argv[0]).name} ( elapsed : {elapsed:.1f} sec )')
    return _finalize

finalize = _create_finalize()

def abort(in_message=None):
    if in_message:
        print(in_message)
    finalize()
    sys.exit(1)

def _column(in_sheet, in_name):
    for col in range(1, in_sheet.max_column + 1):
        value = in_sheet.cell(row=1, column=col).value
        if value == in_name:
            return col
    return None

def find_column(in_sheet, in_name):
    col = _column(in_sheet, in_name)
    if col is not None:
        return col
    print(f'ERROR : can not find column "{in_name}"')
    abort()

def find_append_column(in_sheet, in_name):
    col = _column(in_sheet, in_name)
    if col is not None:
        return col
    col = in_sheet.max_column + 1
    in_sheet.cell(row=1, column=col).value = in_name
    return col

def find_target_files(in_src_suffix, in_dst_suffix):
    pathArr = []
    for path in sorted(DIR_WORK.glob('*' + in_src_suffix)):
        target = path.with_name(path.name.removesuffix(in_src_suffix) + in_dst_suffix)
        if target.exists():
            continue
        pathArr.append(path)
    return pathArr

def create_bedrock_runtime():
    session = boto3.Session(
        aws_access_key_id=os.getenv('ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('SECRET_ACCESS_KEY'),
        aws_session_token=os.getenv('SESSION_TOKEN')
    )
    return session.client(
        'bedrock-runtime',
        region_name='us-east-1',
        endpoint_url=os.getenv('GATEWAY_URL')
    )

def invoke(in_callback):
    for retry in range(LLM_RETRY_COUNT):
        try:
            return in_callback()
        except Exception as err:
            if retry + 1 >= LLM_RETRY_COUNT:
                print(f'ERROR : invoke failed : {err}')
                abort()
            print(f'WARN : retrying because : {err}')
            time.sleep(LLM_RETRY_INTERVAL_SEC * (retry + 1))

def invoke_llm(in_runtime, in_model, in_prompt):
    def callback():
        response = in_runtime.converse_stream(
            modelId=in_model,
            messages=[{
                'role' : 'user',
                'content' : [{'text' : in_prompt}]
            }],
            inferenceConfig={'maxTokens' : LLM_MAX_TOKENS, 'temperature' : LLM_TEMPERATURE}
        )
        chunkArr = []
        for event in response['stream']:
            if 'contentBlockDelta' not in event:
                continue
            delta = event['contentBlockDelta']['delta']
            if 'text' not in delta:
                continue
            chunkArr.append(delta['text'])
        return ''.join(chunkArr)
    return invoke(callback)

