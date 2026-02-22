#!/usr/bin/env python3

####
#### Template for prompts given to the LLM.
#### The input is always in English, and the output language is specified by {{accept_language}}.
####

PROMPT_TEMPLATE = """

You are an expert in social psychology and profiling. Based on both the overall summary and the individual responses below, provide balanced and constructive feedback written in {{accept_language}}.

[Overall Summary]

{{summary}}

[Responses]

{{answers}}

Please address the following two points clearly and concisely, within {{words}} words each:

1. Strengths and how to leverage them effectively in professional contexts
2. Practical advice for navigating new projects and workplace relationships successfully

Write each response as a cohesive paragraph in natural prose. Do not use bullet points or numbered lists. Do not simply restate the summary or responses. Focus on practical and actionable insights rather than abstract generalities.

"""

####
#### HTML for testing queries to the entry points {{challenge_pixel_url}} and {{generate_fetch_url}} in the test web environment.
#### When you modify the prompt template, input this console output into the AI to run tests.
####

SMOKETEST_HTML = """
<html>
<body>
<img src='{{challenge_pixel_url}}' style='width: 1px; height: 1px; visibility: hidden;' />
<form id='test-form'>
<label>
sample input : <input type='text' id='input-text' value='test input' />
</label>
<button type='submit'>send</button>
</form>
<script>
const form = document.getElementById('test-form');
form.addEventListener('submit', async (in_ev) => {
    in_ev.preventDefault();
    const payload = {text : document.getElementById('input-text').value};
    try {
        const response = await fetch('{{generate_fetch_url}}', {
            method : 'POST',
            headers : {
              'Content-Type' : 'application/json'
            },
            // required to send challenge cookie
            credentials : 'include',
            body : JSON.stringify(payload)
        });
        console.log('response : ', await response.text());
    } catch (err) {
        console.error(err);
    }
});
</script>
</body>
</html>
"""

from typing import Dict, Any

def handler(in_ev, in_ctx):
    """ change 'handler' to your Lambda setting """
    return handler_lambda(in_ev, in_ctx)

import os
import hashlib
import secrets
import email.utils
import time
import datetime
import base64
import urllib.parse
import json

def make_token(in_minute: str, in_random: str) -> str:
    raw = f"{os.environ['LAMBDA_SECRET']}{in_minute}{in_random}".encode('utf-8')
    return hashlib.sha256(raw).hexdigest()

def encode_payload(in_payload: str) -> str:
    return base64.urlsafe_b64encode(in_payload.encode('utf-8')).decode('ascii').rstrip('=')

def decode_payload(in_encoded: str) -> str:
    padding = '=' * (-len(in_encoded) % 4)
    return base64.urlsafe_b64decode((in_encoded + padding).encode('ascii')).decode('utf-8')

THRESHOLD_MINUTES = 15

def challenge_pixel(in_req, in_rfc7231):
    minute = f'{datetime.datetime.now(datetime.UTC).minute:02d}'
    random = secrets.token_hex(16)
    token = make_token(minute, random)
    encoded = encode_payload(f'token={token}&random={random}')
    second = THRESHOLD_MINUTES * 60
    cookie_field_arr = [
        f'challenge={encoded}',
        f'Max-Age={second}',
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Strict'
    ]
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'image/gif',
            'Date' : in_rfc7231,
            'Set-Cookie' : '; '.join(cookie_field_arr),
            'Cache-Control' : 'no-store'
        },
        'body' : base64.b64decode('R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==')
    }

def parse_cookie(in_cookie_field: str) -> dict:
    parsed = {}
    if not in_cookie_field:
        return parsed
    parts = in_cookie_field.split(';')
    for part in parts:
        if '=' in part:
            k, v = part.split('=', 1)
            parsed[k.strip()] = v.strip()
    return parsed

def verify_token(in_token: str, in_random: str) -> bool:
    minute = datetime.datetime.now(datetime.UTC).minute
    for diff in range(0, THRESHOLD_MINUTES + 1):
        past = (minute - diff) % 60
        if make_token(f'{past:02d}', in_random) == in_token:
            return True
    return False

def response_text(in_code, in_rfc7231, in_text):
    return {
        'status' : in_code,
        'headers' : {
            'Content-Type' : 'text/plain',
            'Date' : in_rfc7231
        },
        'body' : in_text
    }

def detect_language(in_req):
    lang = in_req['headers'].get('accept-language', '')
    if 'ja' in lang.lower():
        return 'Japanese'
    return 'English'

def input_to_dict(in_req) -> dict:
    if not in_req.get('body'):
        return {}
    try:
        return json.loads(in_req['body'])
    except Exception:
        return {}

def invoke_model(in_prompt: str) -> str:
    if 'AWS_LAMBDA_FUNCTION_NAME' not in os.environ:
        return in_prompt
    import boto3
    # client = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
    client = boto3.client('bedrock-runtime', region_name='us-east-1')
    response = client.converse(
        modelId='amazon.nova-micro-v1:0',
        messages=[
            {
                'role' : 'user',
                'content' : [{'text': in_prompt}],
            }
        ],
        inferenceConfig={
            'temperature' : 0.1,
            'topP' : 0.9,
            'maxTokens' : 500,
            'stopSequences' : []
        }
    )
    return response['output']['message']['content'][0]['text']

def generate_fetch(in_req, in_rfc7231):
    # cookies = parse_cookie(in_req['headers'].get('cookie', ''))
    cookies = {}
    raw_cookies = in_req.get('cookies')
    if isinstance(raw_cookies, list):
        for c in raw_cookies:
            if '=' in c:
                k, v = c.split('=', 1)
                cookies[k] = v
    elif isinstance(raw_cookies, dict):
        cookies = raw_cookies
    encoded = cookies.get('challenge')
    if not encoded:
        return response_text(401, in_rfc7231, 'not issued')
    try:
        params = urllib.parse.parse_qs(decode_payload(encoded))
        token = params.get('token', [None])[0]
        random = params.get('random', [None])[0]
    except Exception:
        return response_text(401, in_rfc7231, 'invalid challenge')
    if not verify_token(token, random):
        return response_text(403, in_rfc7231, 'expired ( ' + token + ', ' + random + ' )')
    payload = input_to_dict(in_req)
    summary_text = '\n'.join(payload.get('summary', []))
    answers_text = '\n'.join(
        f"- {item.get('q', '')}: {item.get('a', '')}"
        for item in payload.get('qa', [])
    )
    prompt = PROMPT_TEMPLATE
    prompt = prompt.replace('{{summary}}', summary_text)
    prompt = prompt.replace('{{answers}}', answers_text)
    prompt = prompt.replace('{{accept_language}}', detect_language(in_req))
    prompt = prompt.replace('{{words}}', str(300))
    origin = in_req['headers'].get('origin')
    if not origin or origin not in CORS_ALLOW:
        return response_text(403, in_rfc7231, origin + ' is not allowed')
    return {
        'status': 200,
        'headers': {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin' : origin,
            'Access-Control-Allow-Credentials' : 'true',
            'Vary' : 'Origin',
            'Date' : in_rfc7231
        },
        'body': invoke_model(prompt)
    }

def preflight_generate(in_req, in_rfc7231):
    origin = in_req['headers'].get('origin')
    if not origin or origin not in CORS_ALLOW:
        return response_text(403, in_rfc7231, origin + ' is not allowed')
    return {
        'status' : 204,
        'headers' : {
            'Date' : in_rfc7231,
            'Access-Control-Allow-Origin' : origin,
            'Access-Control-Allow-Credentials' : 'true',
            'Access-Control-Allow-Methods' : 'POST, OPTIONS',
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Vary' : 'Origin'
        },
        'body' : ''
    }

def smoketest(in_req, in_rfc7231):
    base = 'https://' + in_req['headers'].get('host')
    html = SMOKETEST_HTML
    html = html.replace('{{challenge_pixel_url}}', base + CHALLENGE_PIXEL_PATH)
    html = html.replace('{{generate_fetch_url}}', base + GENERATE_FETCH_PATH)
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/html',
            'Date' : in_rfc7231
        },
        'body' : html
    }

def get_version(in_req, in_rfc7231):
    target = 'version.txt'
    try:
        with open(target, 'r', encoding='utf-8') as f:
            version = f.read().strip()
    except FileNotFoundError:
        return response_text(404, in_rfc7231, target + ' not found')
    return {
        'status': 200,
        'headers': {
            'Content-Type': 'text/plain',
            'Date': in_rfc7231
        },
        'body': version
    }

if 'AWS_LAMBDA_FUNCTION_NAME' in os.environ:
    BASE_PATH = '/personalitytest/lambda/'
    CORS_ALLOW = {'https://pj-corridor.net'}
else:
    if 'APACHE_UPATH' in os.environ:
        BASE_PATH = os.environ['APACHE_UPATH']
    else:
        BASE_PATH = '/'
    CORS_ALLOW = {'https://localhost', 'https://127.0.0.1'}

####
#### These path names ( version, challenge, ... ) are not used directly in the AWS configuration
####

SMOKETEST_PATH = BASE_PATH + 'test'
VERSION_PATH = BASE_PATH + 'version'
CHALLENGE_PIXEL_PATH = BASE_PATH + 'challenge'
GENERATE_FETCH_PATH = BASE_PATH + 'generate'

ROUTES = {
    ('GET', SMOKETEST_PATH) : smoketest,
    ('GET', VERSION_PATH) : get_version,
    ('GET', CHALLENGE_PIXEL_PATH) : challenge_pixel,
    ('OPTIONS', GENERATE_FETCH_PATH) : preflight_generate,
    ('POST', GENERATE_FETCH_PATH) : generate_fetch
}

def application(in_req: Dict[str, Any]) -> Dict[str, Any]:
    path = in_req.get('path')
    route = ROUTES.get((in_req.get('method'), path))
    rfc7231 = email.utils.formatdate(timeval=time.time(), usegmt=True)
    if route is None:
        return response_text(404, rfc7231, 'path ( ' + path + ' ) or method may be wrong ...')
    return route(in_req, rfc7231)

####
#### you don't need to edit code below
####

import base64

def handler_lambda(in_ev, in_ctx):
    body = in_ev.get('body') or ''
    if in_ev.get('isBase64Encoded'):
        body = base64.b64decode(body).decode('utf-8', errors='ignore')
    src = {
        'method' : in_ev.get('requestContext', {}).get('http', {}).get('method', ''),
        'path' : in_ev.get('rawPath', ''),
        'query' : in_ev.get('queryStringParameters') or {},
        'headers' : in_ev.get('headers') or {},
        'cookies' : in_ev.get('cookies') or [],
        'body' : body
    }
    dst = application(src)
    if isinstance(dst['body'], (bytes, bytearray)):
        return {
            'statusCode' : dst['status'],
            'headers' : dst['headers'],
            'body' : base64.b64encode(dst['body']).decode('ascii'),
            'isBase64Encoded' : True
        }
    return {
        'statusCode' : dst['status'],
        'headers' : dst['headers'],
        'body' : dst['body']
    }

def handler_flask(in_req) -> Dict[str, Any]:
    src = {
        'method' : in_req.method,
        'path' : in_req.path,
        'query' : in_req.args.to_dict(flat=True),
        # normalize header names to lowercase to match API Gateway (Lambda)
        'headers' : {k.lower(): v for k, v in in_req.headers.items()},
        'cookies' : in_req.cookies,
        'body' : in_req.get_data(as_text=True)
    }
    return application(src)

if __name__ == '__main__':
    from flask import Flask, request, Response
    app = Flask(__name__)
    def entry(path: str):
        dst = handler_flask(request)
        return Response(
            dst['body'],
            status=dst['status'],
            headers=dst['headers']
        )
    entry = app.route(
        BASE_PATH + '<path:path>',
        defaults={'path': ''},
        methods=['GET', 'POST']
    )(entry)
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int, required=True)
    args = p.parse_args()
    app.run(host='127.0.0.1', port=args.port)
