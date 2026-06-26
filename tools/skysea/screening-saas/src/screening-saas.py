#!/usr/bin/env python3

# how to use :
#
# a. drag & drop aaa.csv onto sum.py at the same time.
#
# b. command line
# b.1. $ sum.py --csv aaa.csv
# b.2. $ sum.py --csv aaa.csv --computer bbb --output ccc

import os
import sys
import time
import dotenv
import pathlib
import collections
import urllib.parse

SPECS = {
    'file' : [
        {
            'type' : 'csv',
            'required' : True,
            'encoding': 'cp932'
        }
    ],
    'data' : [
        {
            'name' : 'computer',
            'required' : False
        },
        {
            'name' : 'output',
            'required' : False
        }
    ]
}

def file_spec(in_filename):
    suffix = in_filename.suffix.lower().lstrip('.')
    for spec in SPECS['file']:
        if spec['type'] == suffix:
            return spec
    return {}

def abort(in_message=None):
    if in_message:
        print(in_message)
    finalize()
    sys.exit(1)

def finalize():
    return ''

def abort_missing_package(in_package):
    print(f'ERROR : exec "python -m pip install {in_package}" at first.')
    abort()

try:
    import boto3
except ImportError:
    abort_missing_package('boto3')

try:
    import pandas
except ImportError:
    abort_missing_package('pandas')

def extract_domain(in_url):
    return urllib.parse.urlparse(str(in_url)).netloc.lower()

dotenv.load_dotenv()
for required in ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'SESSION_TOKEN', 'GATEWAY_URL']:
    if os.getenv(required) is None:
        print(f'ERROR : {required} is not defined in ".env".')
        abort()

LLM_MODEL = 'us.anthropic.claude-sonnet-4-6'
LLM_MAX_TOKENS = 4096
LLM_TEMPERATURE = 0
LLM_RETRY_COUNT = 3
LLM_RETRY_INTERVAL_SEC = 5

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

def invoke_llm(in_runtime, in_prompt):
    def callback():
        response = in_runtime.converse_stream(
            modelId=LLM_MODEL,
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

INPUT_FILE = {}
INPUT_PARM = {}

CHUNK_SIZE = 100000

IN = {
    'DATETIME' : '日時',
    'COMPUTER' : 'コンピューター名',
    'PATH_URL' : 'パス / URL',
    'WRITTEN' : '書き込み内容 / ファイル名',
}

OUT = {
    'COMPUTER' : IN['COMPUTER'],
    'DOMAIN' : 'ドメイン',
    'COUNT' : 'アクセス回数',
    'WRITTEN' : '書込サイズ',
}

def generate_readme(in_specs):
    import string
    alphabet = list(string.ascii_lowercase)
    def generate_name():
        repeat = 3
        shift = alphabet.pop(0)
        return shift * repeat
    command = pathlib.Path(sys.argv[0]).name
    file_required = []
    parm_required = []
    parm_optional = []
    for spec in in_specs['file']: 
        filename = f"{generate_name()}.{spec['type']}"
        parm = f"--{spec['type']} {filename}"
        if spec['required']:
            file_required.append(filename)
            parm_required.append(parm)
        else:
            parm_optional.append(parm)
    for spec in in_specs['data']:
        parm = f"--{spec['name']} {generate_name()}"
        if spec['required']:
            parm_required.append(parm)
        else:
            parm_optional.append(parm)
    lines = []
    lines.append(f"# how to use :")
    lines.append(f"#")
    lines.append(f"# a. drag & drop {' and '.join(file_required)} onto {command} at the same time.")
    lines.append(f"#")
    lines.append(f"# b. command line")
    lines.append(f"# b.1. $ {command} {' '.join(parm_required)}")
    if parm_optional:
        lines.append(f"# b.2. $ {command} {' '.join(parm_required)} {' '.join(parm_optional)}")
    return "\n".join(lines)

# print(generate_readme(SPECS))

if any(a.startswith('--') for a in sys.argv):
    import argparse
    parser = argparse.ArgumentParser()
    for spec in SPECS['file']:
        parser.add_argument(f"--{spec['type']}", required=spec['required'])
    for spec in SPECS['data']:
        parser.add_argument(f"--{spec['name']}", required=spec['required'])
    parsed = parser.parse_args()
    for spec in SPECS['file']:
        INPUT_FILE[spec['type']] = pathlib.Path(getattr(parsed, spec['type']))
    for spec in SPECS['data']:
        INPUT_PARM[spec['name']] = getattr(parsed, spec['name'])
else:
    required_cnt = sum(1 for spec in SPECS['file'] if spec['required'])
    if len(sys.argv) != required_cnt + 1:
        abort(f'drag & drop {required_cnt} files or give parameter')
    filenames = [pathlib.Path(a) for a in sys.argv[1:]]
    for spec in SPECS['file']:
        found = None
        for filename in filenames:
            if filename.suffix.lower() == f".{spec['type']}":
                found = filename
                break
        if found:
            INPUT_FILE[spec['type']] = found
        elif spec['required']:
            abort(f"required type ({spec['type']}) is not found.")

def create_prompt(in_summary):
    filename = pathlib.Path(sys.argv[0]).with_suffix('.prompt.txt')
    try:
        with open(filename, encoding='utf-8') as fh:
            prompt = fh.read()
    except Exception as err:
        abort(f'failed to open prompt file ({filename}) : {err}')
    return prompt.replace('{{SUMMARY}}', in_summary)


def content_size(in_data, in_encoding):
    if pandas.isna(in_data):
        return 0
    return len(str(in_data).encode(in_encoding))

summary = collections.defaultdict(lambda: {'count' : 0, 'size' : 0})

period_s = None
period_e = None

spec = file_spec(INPUT_FILE['csv'])
if spec is None:
    abort(f'spec is not defined')

for chunk in pandas.read_csv(INPUT_FILE['csv'], encoding=spec['encoding'], chunksize=CHUNK_SIZE):
    dt = pandas.to_datetime(chunk[IN['DATETIME']], errors='coerce')
    cmin = dt.min()
    cmax = dt.max()
    if period_s is None or (pandas.notna(cmin) and cmin < period_s):
        period_s = cmin
    if period_e is None or (pandas.notna(cmax) and cmax > period_e):
        period_e = cmax
    for computer, url, written in zip(chunk[IN['COMPUTER']], chunk[IN['PATH_URL']], chunk[IN['WRITTEN']]):
        key = (computer, extract_domain(url))
        summary[key]['count'] += 1
        summary[key]['size'] += content_size(written, spec['encoding'])

rows = []
for (computer, domain), values in summary.items():
    rows.append({
        OUT['COMPUTER'] : computer,
        OUT['DOMAIN'] : domain,
        OUT['COUNT'] : values['count'],
        OUT['WRITTEN'] : values['size']
    })
result = pandas.DataFrame(rows)
result = result.sort_values([OUT['COMPUTER'], OUT['COUNT'], OUT['WRITTEN']], ascending=[True, False, False])

print(f'summary from {period_s} to {period_e}')
print()
print(result.to_string(index=False))

#output = INPUT_PARM.get('output')
#if output:
#    result.to_csv(output, index=False)
#    print(f'{output} was generated.')

response = invoke_llm(
    create_bedrock_runtime(),
    create_prompt(result.to_string(index=False))
)

print(response)

finalize()
