#!/usr/bin/env python3

import os
import sys
import time
import json
import shutil
import pathlib
import importlib

dependencies = {
    'boto3' : {},
    'Config' : {
        'pkg' : 'botocore',
        'src' : 'botocore.config'
    },
    'requests' : {},
    'dotenv' : {
        'pkg' : 'python-dotenv'
    },
    'openpyxl' : {}
}

def _create_finalize():
    start_time = time.time()
    def _finalize():
        for name in []:
            shutil.rmtree(pathlib.Path.cwd() / name, ignore_errors=True)
        elapsed = time.time() - start_time
        print(f'INFO : completed {pathlib.Path(sys.argv[0]).name} ( elapsed : {elapsed:.1f} sec )')
    return _finalize

finalize = _create_finalize()

SHOWHELP = 'help'

def abort(in_message):
    print(in_message)
    print(f'Use "--{SHOWHELP}" to check the available parameters.')
    finalize()
    sys.exit(1)

for dependency, info in dependencies.items():
    try:
        if 'src' in info:
            module = importlib.import_module(info['src'])
            globals()[dependency] = getattr(module, dependency)
        else:
            globals()[dependency] = importlib.import_module(dependency)
    except ImportError:
        packageName = info.get('pkg', dependency)
        abort(f'ERROR : exec "$ python -m pip install {packageName}" at first.')

ERROR_RETRY_MESSAGE = 'Check whether your PAT has expired.'

def setupArgs(in_specDict, in_prefix='--'):
    if f'{in_prefix}{SHOWHELP}' in sys.argv:
        for name, spec in in_specDict.items():
            print(f'{in_prefix}{name} : {spec["explain"]} ( default = {spec["default"]} )')
        finalize()
        sys.exit(0)
    parmDict = {}
    if any(arg.startswith(in_prefix) for arg in sys.argv):
        import argparse
        parser = argparse.ArgumentParser(add_help=False)
        nameSet = set()
        for arg in sys.argv[1:]:
            if arg.startswith(in_prefix):
                name = arg[len(in_prefix):].split('=')[0]
                if name not in nameSet:
                    parser.add_argument(f'{in_prefix}{name}')
                    nameSet.add(name)
        parmDict = vars(parser.parse_args())
    for name, spec in in_specDict.items():
        if parmDict.get(name) is None:
            parmDict[name] = spec['default']
        if 'convert' in spec:
            parmDict[name] = spec['convert'](parmDict[name])
    return parmDict

ARGS = setupArgs({
    'xlsx' : {
        'default' : None,
        'convert' : lambda in_path: None if in_path is None else pathlib.Path(in_path),
        'explain' : 'Target XLSX file. Required.'
    },
    'sheet' : {
        'default' : None,
        'explain' : 'Target worksheet name. Defaults to the first worksheet.'
    },
    'range' : {
        'default' : 'A:XFD',
        'explain' : 'Cell range to translate (for example, "F:E"). Defaults to the entire worksheet.'
    },
    'maxtokens' : {
        'default' : '4096',
        'convert' : lambda in_tokens: int(in_tokens),
        'explain' : 'Maximum number of output tokens for each translation request.'
    },
    'lang' : {
        'default' : 'Japanese',
        'explain' : 'Target language for translation.'
    }
})

class _cBackendBedrock:
    def __init__(
        self,
        in_model,
        in_timeoutConn,
        in_timeoutRead,
        in_region='us-east-1'
    ):
        self._model = in_model
        self._region = in_region
        for required in [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_SESSION_TOKEN',
            'GATEWAY_URL'
        ]:
            if os.getenv(required) is None:
                abort(f'ERROR : {required} is not defined in ".env".')
        session = boto3.Session(
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
        self._runtime = session.client(
            'bedrock-runtime',
            region_name=self._region,
            endpoint_url=os.getenv('GATEWAY_URL'),
            config=Config(
                connect_timeout=in_timeoutConn,
                read_timeout=in_timeoutRead
            )
        )
    @property
    def model(self):
        return self._model
    def _buildParams(self, in_prompt, in_maxTokens, in_temperature):
        return {
            'modelId' : self._model,
            'messages' : [{
                'role' : 'user',
                'content' : [{'text' : in_prompt}]
            }],
            'inferenceConfig' : {
                'maxTokens' : in_maxTokens,
                'temperature' : in_temperature
            }
        }
    def _request(self, in_params):
        return self._runtime.converse_stream(**in_params)
    def _parseResponse(self, in_response):
        chunkArr = []
        for event in in_response['stream']:
            if 'contentBlockDelta' not in event:
                continue
            delta = event['contentBlockDelta']['delta']
            if 'text' not in delta:
                continue
            chunkArr.append(delta['text'])
        return ''.join(chunkArr)
    def invoke(self, in_prompt, in_maxTokens, in_temperature):
        params = self._buildParams(in_prompt, in_maxTokens, in_temperature)
        response = self._request(params)
        return self._parseResponse(response)

class _cBackendOpenAI:
    def __init__(
        self,
        in_model,
        in_timeoutConn,
        in_timeoutRead
    ):
        self._model = in_model
        self._timeoutConn = in_timeoutConn
        self._timeoutRead = in_timeoutRead
        for required in [
            'OPENAI_API_KEY',
            'GATEWAY_URL'
        ]:
            if os.getenv(required) is None:
                abort(f'ERROR : {required} is not defined in ".env".')
    @property
    def model(self):
        return self._model
    def _buildParams(self, in_prompt, in_maxTokens, in_temperature):
        return {
            'model' : self._model,
            'messages' : [{
                'role' : 'user',
                'content' : in_prompt
            }],
            'max_completion_tokens' : in_maxTokens,
            'temperature' : in_temperature
        }
    def _request(self, in_params):
        response = requests.post(
            os.getenv('GATEWAY_URL').rstrip('/') + '/v1/chat/completions',
            headers={
                'Content-Type' : 'application/json',
                'Authorization' : f'Bearer {os.getenv("OPENAI_API_KEY")}'
            },
            json=in_params,
            timeout=(
                self._timeoutConn,
                self._timeoutRead
            )
        )
        response.raise_for_status()
        return response
    def _parseResponse(self, in_response):
        data = in_response.json()
        return data['choices'][0]['message']['content']
    def invoke(self, in_prompt, in_maxTokens, in_temperature):
        params = self._buildParams(in_prompt, in_maxTokens, in_temperature)
        response = self._request(params)
        return self._parseResponse(response)

class _cBackendGemini:
    def __init__(
        self,
        in_model,
        in_timeoutConn,
        in_timeoutRead,
        in_region='us-east-1'
    ):
        self._model = in_model
        self._timeoutConn = in_timeoutConn
        self._timeoutRead = in_timeoutRead
        self._region = in_region
        for required in [
            'GEMINI_PROJECT',
            'GEMINI_API_KEY',
            'GATEWAY_URL'
        ]:
            if os.getenv(required) is None:
                abort(f'ERROR : {required} is not defined in ".env".')
    @property
    def model(self):
        return self._model
    def _buildParams(self, in_prompt, in_maxTokens, in_temperature):
        return {
            'contents' : [{
                'role' : 'user',
                'parts' : [{
                    'text' : in_prompt
                }]
            }],
            'generationConfig' : {
                'maxOutputTokens' : in_maxTokens,
                'temperature' : in_temperature
            }
        }
    def _request(self, in_params):
        url = (
            os.getenv('GATEWAY_URL').rstrip('/')
            + f'/v1/projects/{os.getenv("GEMINI_PROJECT")}'
            + f'/locations/{self._region}'
            + f'/publishers/google/models/{self._model}:generateContent'
        )
        response = requests.post(
            url,
            headers={
                'Content-Type' : 'application/json',
                'Authorization' : f'Bearer {os.getenv("GEMINI_API_KEY")}',
                'X-Provider' : 'google'
            },
            json=in_params,
            timeout=(
                self._timeoutConn,
                self._timeoutRead
            )
        )
        response.raise_for_status()
        return response
    def _parseResponse(self, in_response):
        data = in_response.json()
        textArr = []
        for part in data['candidates'][0]['content']['parts']:
            textArr.append(part.get('text', ''))
        return ''.join(textArr)
    def invoke(self, in_prompt, in_maxTokens, in_temperature):
        params = self._buildParams(in_prompt, in_maxTokens, in_temperature)
        response = self._request(params)
        return self._parseResponse(response)

class _cLLMRunnerBase:
    def __init__(
        self,
        in_backendClass,
        in_backendModel,
        in_maxTokens=8192,
        in_temperature=0,
        in_timeoutConn=60,
        in_timeoutRead=60,
        in_retryCount=3,
        in_retryInterval=5
    ):
        dotenv.load_dotenv()
        self._backend = in_backendClass(
            in_backendModel,
            in_timeoutConn,
            in_timeoutRead
        )
        self._maxTokens = in_maxTokens
        self._temperature = in_temperature
        self._retryCount = in_retryCount
        self._retryInterval = in_retryInterval
    @property
    def model(self):
        return self._backend.model
    def _retry(self, in_callback):
        lastErr = None
        for i in range(self._retryCount):
            try:
                return in_callback(i)
            except Exception as err:
                lastErr = err
                if i < self._retryCount - 1:
                    if '429' in str(err):
                        time.sleep(self._retryInterval * 10)
                    else:
                        time.sleep(self._retryInterval)
        abort(f'{ERROR_RETRY_MESSAGE} ({lastErr})')
    def _invoke(self, in_prompt, in_maxTokens, in_temperature, in_cnt):
        if in_maxTokens is None:
            in_maxTokens = self._maxTokens
        if in_temperature is None:
            in_temperature = self._temperature
        if in_cnt > 0:
            in_maxTokens *= 2
            if in_temperature == 0:
                in_temperature = 0.5
            print(f'INFO : boosting parameters for retry {in_cnt}')
        return self._backend.invoke(in_prompt, in_maxTokens, in_temperature)

class cLLMRunner(_cLLMRunnerBase):
    def toText(self, in_prompt, in_maxTokens=None, in_temperature=None):
        def _toText(in_cnt):
            return self._invoke(in_prompt, in_maxTokens, in_temperature, in_cnt)
        return self._retry(_toText)
    def toJson(self, in_prompt, in_maxTokens=None, in_temperature=None):
        def _toJson(in_cnt):
            text = self._invoke(in_prompt, in_maxTokens, in_temperature, in_cnt)
            return json.loads(text)
        return self._retry(_toJson)

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
            response_text = self._callback(prompt)
            tempArr = json.loads(response_text)
            resDict = {}
            for item in tempArr:
                if 'marker' not in item:
                    continue
                resDict[item['marker']] = item.get('dst', '')
            for i in range(in_start_index, in_end_index + 1):
                marker = self._targetBufArr[i]['marker']
                if marker in resDict:
                    self._targetBufArr[i]['dst'] = resDict[marker]
                else:
                    print(f"WARN : Missing translation for {marker}")
                    self._targetBufArr[i]['dst'] = self._targetBufArr[i]['src']
        except Exception as err:
            abort(f'ERROR : invalid json or mapping failed : {err}')
    def append(self, in_marker, in_text):
        text = '' if in_text is None else in_text
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

gRunner = cLLMRunner(_cBackendBedrock, 'us.anthropic.claude-sonnet-4-6')
#gRunner = cLLMRunner(_cBackendOpenAI, 'gpt-5.2')
#gRunner = cLLMRunner(_cBackendGemini, 'gemini-2.5-flash')

gTranslater = cBulkTranslater(gRunner.toText, ARGS['lang'], ARGS['maxtokens'])

if ARGS['xlsx'] is None:
    abort('ERROR : parameter is required.')
else:
    try:
        workbook = openpyxl.load_workbook(ARGS['xlsx'])
    except Exception as err:
        abort(f'ERROR : can not open xlsx ({err})')

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
            if markerText == '' or cell.data_type == 'f':
                continue
            gTranslater.append(cell.coordinate, markerText)
    for translated in gTranslater.translate():
        if translated['dst'] is not None:
            sheet[translated['marker']].value = translated['dst']
    workbook.save(ARGS['xlsx'])
except Exception as err:
    abort(f'ERROR : can not handle xlsx ({err})')
finally:
    workbook.close()

finalize()
