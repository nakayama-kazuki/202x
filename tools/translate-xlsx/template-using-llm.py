#!/usr/bin/env python3

import os
import sys
import time
import json
import shutil
import pathlib
import importlib

SHOWHELP_OPTION = 'help'
ERROR_RETRY_MESSAGE = 'Check whether your PAT has expired.'

dependencies = {
    'boto3' : {},
    'Config' : {
        'pkg' : 'botocore',
        'src' : 'botocore.config'
    },
    'requests' : {},
    'dotenv' : {
        'pkg' : 'python-dotenv'
    }
}

dependencies.update({
    # add modules
})

def _create_finalize():
    start_time = time.time()
    def _finalize():
        for name in []:
            shutil.rmtree(pathlib.Path.cwd() / name, ignore_errors=True)
        elapsed = time.time() - start_time
        print(f'INFO : completed {pathlib.Path(sys.argv[0]).name} ( elapsed : {elapsed:.1f} sec )')
    return _finalize

finalize = _create_finalize()

def abort(in_message):
    print(in_message)
    print(f'Use "--{SHOWHELP_OPTION}" to check the available parameters.')
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

def setupArgs(in_specDict, in_prefix='--'):
    if f'{in_prefix}{SHOWHELP_OPTION}' in sys.argv:
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

gRunner = cLLMRunner(_cBackendBedrock, 'us.anthropic.claude-sonnet-4-6')
#gRunner = cLLMRunner(_cBackendOpenAI, 'gpt-5.2')
#gRunner = cLLMRunner(_cBackendGemini, 'gemini-2.5-flash')

ARGS = setupArgs({
    'sample_input' : {
        'default' : 'input.json',
        'convert' : lambda in_path: None if in_path is None else pathlib.Path(in_path),
        'explain' : 'Input file path.'
    },
    'sample_mode' : {
        'default' : 'fast',
        'convert' : lambda in_mode: in_mode if in_mode in ['fast', 'slow'] else 'fast',
        'explain' : 'fast or slow.'
    },
    'sample_limit' : {
        'default' : '100',
        'convert' : lambda in_limit: int(in_limit),
        'explain' : 'Maximum number of items to process.'
    },
    'sample_language' : {
        'default' : 'Japanese',
        'explain' : 'Output language.'
    }
})

def main():
    # application logic

if __name__ == '__main__':
    main()
