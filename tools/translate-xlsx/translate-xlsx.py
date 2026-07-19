#!/usr/bin/env python3

import os
import sys
import time
import json
import boto3
import shutil
import dotenv
import pathlib
import openpyxl

MAXTOKENS = 4096
TRANSLATE_TO = 'Japanese'
PARAM_PREFIX = '--'

SPEC = {
    'xlsx' : {
        'value' : None,
        'note' : 'Target XLSX file. Required.'
    },
    'sheet' : {
        'value' : None,
        'note' : 'Target worksheet name. Defaults to the first worksheet.'
    },
    'range' : {
        'value' : 'A:XFD',
        'note' : 'Cell range to translate (for example, "F:E"). Defaults to the entire worksheet.'
    }
}

def get_args(in_defaultDict, in_convDict={}):
    parmDict = {}
    if any(arg.startswith(PARAM_PREFIX) for arg in sys.argv):
        import argparse
        parser = argparse.ArgumentParser(add_help=False)
        nameSet = set()
        for arg in sys.argv[1:]:
            if arg.startswith(PARAM_PREFIX):
                name = arg[len(PARAM_PREFIX):].split('=')[0]
                if name not in nameSet:
                    parser.add_argument(f'{PARAM_PREFIX}{name}')
                    nameSet.add(name)
        parmDict = vars(parser.parse_args())
    for name, info in in_defaultDict.items():
        if parmDict.get(name) is None:
            parmDict[name] = info['value']
    for name, callback in in_convDict.items():
        parmDict[name] = callback(parmDict[name])
    return parmDict

ARGS = get_args(SPEC, {
    'xlsx' : lambda in_path: None if in_path is None else pathlib.Path(in_path)
})

def abort(in_message, in_showNote=False):
    print(in_message)
    if in_showNote:
        print()
        for name, info in SPEC.items():
            print(f'    {PARAM_PREFIX}{name} : {info["note"]}')
        print()
    finalize()
    sys.exit(1)

def _create_finalize():
    start_time = time.time()
    def _finalize():
        for name in []:
            shutil.rmtree(pathlib.Path.cwd() / name, ignore_errors=True)
        elapsed = time.time() - start_time
        print(f'INFO : completed {pathlib.Path(sys.argv[0]).name} ( elapsed : {elapsed:.1f} sec )')
    return _finalize

finalize = _create_finalize()

def _retry(in_callback, in_retry_count, in_retry_interval):
    for retry in range(in_retry_count):
        try:
            return in_callback()
        except Exception as err:
            if retry + 1 >= in_retry_count:
                abort(f'ERROR : invoke failed : {err}')
            print(f'WARN : retrying because : {err}')
            if '429' in str(err):
                time.sleep(in_retry_interval * 10)
            else:
                time.sleep(in_retry_interval)

class cLLMRunner:
    def __init__(
        self,
        in_model='us.anthropic.claude-sonnet-4-6',
        in_region='us-east-1',
        in_maxTokens=MAXTOKENS,
        in_temperature=0,
        in_retryCount=3,
        in_retryInterval=5
    ):
        self._model = in_model
        self._region = in_region
        self._maxTokens = in_maxTokens
        self._temperature = in_temperature
        self._retryCount = in_retryCount
        self._retryInterval = in_retryInterval
        self._runtime = self._create_runtime()
    @property
    def model(self):
        return self._model
    def _create_runtime(self):
        dotenv.load_dotenv()
        for required in [
            'ACCESS_KEY_ID',
            'SECRET_ACCESS_KEY',
            'SESSION_TOKEN',
            'GATEWAY_URL'
        ]:
            if os.getenv(required) is None:
                abort(f'ERROR : {required} is not defined in ".env".')
        session = boto3.Session(
            aws_access_key_id=os.getenv('ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('SESSION_TOKEN')
        )
        return session.client(
            'bedrock-runtime',
            region_name=self._region,
            endpoint_url=os.getenv('GATEWAY_URL')
        )
    def _invoke(self, in_prompt, in_maxTokens, in_temperature):
        if in_maxTokens is None:
            in_maxTokens = self._maxTokens
        if in_temperature is None:
            in_temperature = self._temperature
        def callback():
            response = self._runtime.converse_stream(
                modelId=self._model,
                messages=[{
                    'role' : 'user',
                    'content' : [{'text' : in_prompt}]
                }],
                inferenceConfig={'maxTokens' : in_maxTokens, 'temperature' : in_temperature}
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
        return _retry(callback, self._retryCount, self._retryInterval)
    def toText(self,
        in_prompt,
        in_maxTokens=None,
        in_temperature=None
    ):
        return self._invoke(in_prompt, in_maxTokens, in_temperature)
    def toJson(self,
        in_prompt,
        in_maxTokens=None,
        in_temperature=None
    ):
        try:
            return json.loads(self._invoke(in_prompt, in_maxTokens, in_temperature))
        except Exception as err:
            abort(f'ERROR : invalid json : {err}')

dotenv.load_dotenv()

for required in ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'SESSION_TOKEN', 'GATEWAY_URL']:
    if os.getenv(required) is None:
        abort(f'ERROR : {required} is not defined in ".env".')

def text_from_template_text(in_text, in_replaceDict):
    text = in_text
    for placeholder, replaced in in_replaceDict.items():
        if isinstance(replaced, (dict, list)):
            replaced = json.dumps(replaced, ensure_ascii=False, indent=2)
        else:
            replaced = str(replaced)
        text = text.replace(placeholder, replaced)
    return text

class cBulkTranslater:
    _prompt = chr(10).join([
        'Translate the "src" field of each object in the input JSON into __LANG__.',
        'Return a JSON array with the original "marker" and "src" fields unchanged,',
        'and add the translated text in the "dst" field,',
        '',
        'Interpret the context of the document from the "src" text.',
        'Translate technical terms and proper nouns according to the context rather than literally.',
        'Keeping the original term is acceptable when it is the standard usage in the target language.',
        '',
        'Return only JSON.',
        'Do not use markdown.',
        'Do not wrap the response in code fences.',
        '',
        '[Input]',
        '',
        '__JSON__'
    ])
    _tokenParm = {
        'wLangTokenPerChar' : 1.5,
        'eLangTokenPerChar' : 0.25,
        'slack' : 0.2
    }
    def __init__(
        self,
        in_callback=None,
        in_language=None,
        in_maxTokens=None
    ):
        self._targetBufArr = []
        self._totalChars = 0
        for required in [in_callback, in_language, in_maxTokens]:
            if required is None:
                abort('ERROR : no required parameter')
        self._callback = in_callback
        self._maxTokens = in_maxTokens
        self._language = in_language
    def _isFullBuffer(self, in_start_index, in_end_index):
        chars = 0
        for i in range(in_start_index, in_end_index + 1):
            chars += len(self._targetBufArr[i]['src'])
        if self._language in ['Japanese', 'Chinese', 'Korean']:
            estimated = chars * cBulkTranslater._tokenParm['wLangTokenPerChar']
        else:
            estimated = chars * cBulkTranslater._tokenParm['eLangTokenPerChar']
        if estimated >= self._maxTokens * (1 - cBulkTranslater._tokenParm['slack']):
            if in_start_index == in_end_index:
                abort('ERROR : in_maxTokens is not enough')
            return True
        return False
    def _invoke(self, in_start_index, in_end_index):
        slicedArr = self._targetBufArr[in_start_index:in_end_index + 1]
        prompt = text_from_template_text(cBulkTranslater._prompt, {
            '__LANG__' : self._language,
            '__JSON__' : json.dumps(slicedArr, ensure_ascii=False, indent=2)
        })
        try:
            tempArr = json.loads(self._callback(prompt))
            for i in range(in_end_index - in_start_index + 1):
                self._targetBufArr[in_start_index + i]['dst'] = tempArr[i]['dst']
        except Exception as err:
            abort(f'ERROR : invalid json : {err}')
    def append(self, in_marker, in_text):
        text = in_text
        for doubleQuote in [chr(0x0022), chr(0x201C), chr(0x201D)]:
            text = text.replace(doubleQuote, "'")
        self._totalChars += len(text)
        self._targetBufArr.append({'marker' : in_marker, 'src' : text, 'dst' : None})
    def translate(self):
        start_index = 0
        processedChars = 0
        for end_index in range(1, len(self._targetBufArr)):
            if self._isFullBuffer(start_index, end_index):
                print(f'INFO : {processedChars * 100 / self._totalChars:.1f}%')
                self._invoke(start_index, end_index - 1)
                for i in range(start_index, end_index):
                    processedChars += len(self._targetBufArr[i]['src'])
                start_index = end_index
        if start_index < len(self._targetBufArr):
            self._invoke(start_index, len(self._targetBufArr) - 1)
        return self._targetBufArr

gRunner = cLLMRunner()
gTranslater = cBulkTranslater(gRunner.toText, TRANSLATE_TO, MAXTOKENS)

if ARGS['xlsx'] is None:
    abort('ERROR : parameter is required.', True)
else:
    try:
        workbook = openpyxl.load_workbook(ARGS['xlsx'])
    except Exception as err:
        abort(f'ERROR : can not open xlsx ({err})', True)

try:
    if ARGS['sheet'] is None:
        sheet = workbook.worksheets[0]
    else:
        sheet = workbook[ARGS['sheet']]
    for rowArr in sheet[ARGS['range']]:
        for cell in rowArr:
            if not isinstance(cell.value, str):
                continue
            markerText = cell.value.strip()
            if markerText == '':
                continue
            gTranslater.append(cell.coordinate, markerText)
    for translated in gTranslater.translate():
        sheet[translated['marker']].value = translated['dst']
    workbook.save(ARGS['xlsx'])
except Exception as err:
    abort(f'ERROR : can not handle xlsx ({err})', True)
finally:
    workbook.close()

finalize()
