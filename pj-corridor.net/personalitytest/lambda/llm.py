#!/usr/bin/env python3

####
#### Template for prompts given to the LLM.
#### The input is always in English, and the output language is specified by {{accept_language}}.
####

PROMPT_TEMPLATE = """

You are a specialist in personality assessment.
Based on the answers to the diagnostic questions for Controller / Analyzer / Promoter / Supporter tendencies, and referring to the rule-based diagnostic result, please provide feedback written in {{accept_language}} for items 1-4 below.

1. Overall assessment of tendencies, strengths, and weaknesses (within 200 characters)
2. Job roles where strengths can be utilized effectively, and points to be mindful of when leveraging those strengths (within 200 characters)
3. Recommended skill development areas and methods for skill improvement (within 200 characters)
4. Points to keep in mind in interpersonal relationships (within 200 characters)

[Answers to the Questions]

-  I tend to be somewhat assertive
-  I have slightly strong passion for the future
-  I sometimes feel frustrated when my help is not appreciated
-  I am somewhat competitive
-  I give a warm impression on first meeting
-  I do not easily let others get close to me
-  I tend to care about how others see me
-  I have a slightly high need for recognition regarding my work output
-  I am relatively good at asking others about things I do not know
-  I do not feel jealousy when my friends talk closely with others
-  When someone asks me for a favor, I find it hard to say no
-  I tend to stand out at parties or social gatherings
-  I often make plans before doing something
-  When making decisions, I do not necessarily seek others' agreement
-  I often find myself naturally taking charge of a situation
-  I am relatively weak when it comes to change
-  I express my emotions easily
-  Even when I am tired, I push myself to work
-  I get irritated when things do not go as I want
-  When in a team, I tend to put myself last
-  I try to do as many things as possible in a short time
-  I am quick to notice others' shortcomings
-  I lack cheerfulness and childlike qualities
-  I am often a perfectionist
-  I sometimes work on things even if I am not fully convinced
-  I would not describe myself as ambitious
-  I have difficulty recovering from failure
-  I tend to focus on the positive aspects of things and become optimistic
-  I often worry about others' evaluations
-  I tend to compare myself with others
-  I sometimes make decisions even when information is insufficient
-  I am not good at casual small talk
-  I do not believe that serving others is particularly important
-  I rarely go out of my way to take care of people I dislike
-  I am not shy around strangers
-  I give things a fair amount of thought before taking action
-  I clearly state when I dislike something
-  I speak frankly about what I think
-  I am often told that I am a fun person
-  I talk more than I listen to others

[Diagnostic Result]

Your Supporter traits are strong, followed by relatively strong Controller traits.
Supporter traits include the following characteristics:

-  Enjoys helping others
-  Warm and gentle
-  Highly cooperative and motivated in the workplace
-  Not particularly interested in making plans or setting goals
-  Takes time to make decisions
-  Skilled at reading people's emotions
-  Has strong intuition
-  Makes judgments based on emotions
-  Not comfortable taking risks
-  Prioritizes human relationships over business matters

"""

####
#### HTML for testing queries to the entry points {{challenge_pixel_path}} and {{generate_fetch_path}} in the test web environment.
#### When you modify the prompt template, input this console output into the AI to run tests.
####

LOCAL_TEST_HTML = """
<html>
<body>
<img src='.{{challenge_pixel_path}}' style='width: 1px; height: 1px; visibility: hidden;' />
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
        const response = await fetch('.{{generate_fetch_path}}', {
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
    raw = f'{os.environ["LAMBDA_SECRET"]}{in_minute}{in_random}'.encode('utf-8')
    return hashlib.sha256(raw).hexdigest()

def encode_payload(in_payload: str) -> str:
    return base64.urlsafe_b64encode(in_payload.encode('utf-8')).decode('ascii').rstrip('=')

def decode_payload(in_encoded: str) -> str:
    padding = '=' * (-len(in_encoded) % 4)
    return base64.urlsafe_b64decode((in_encoded + padding).encode('ascii')).decode('utf-8')

THRESHOLD_MINUTES = 15

def challenge_pixel(in_req, in_rfc7231):
    minute = f'{datetime.datetime.utcnow().minute:02d}'
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
    minute = datetime.datetime.utcnow().minute
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
    client = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
    # $aws bedrock list-foundation-models --region ap-northeast-1 | grep nova
    response = client.invoke_model(
        modelId='amazon.nova-micro-v1:0',
        contentType='application/json',
        accept='application/json',
        body=json.dumps({'input' : in_prompt})
    )
    payload = json.loads(response['body'].read().decode('utf-8'))
    return payload['outputText']

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
    prompt = PROMPT_TEMPLATE
    prompt = prompt.replace(
        '{{user_input}}',
        json.dumps(input_to_dict(in_req), ensure_ascii=False)
    )
    prompt = prompt.replace(
        '{{accept_language}}',
        detect_language(in_req)
    )
    return {
        'status': 200,
        'headers': {
            'Content-Type': 'text/plain',
            'Date': in_rfc7231
        },
        'body': invoke_model(prompt)
    }

def local_test(in_req, in_rfc7231):
    html = LOCAL_TEST_HTML
    html = html.replace('{{challenge_pixel_path}}', CHALLENGE_PIXEL_PATH)
    html = html.replace('{{generate_fetch_path}}', GENERATE_FETCH_PATH)
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/html',
            'Date' : in_rfc7231
        },
        'body' : html
    }

if 'AWS_LAMBDA_FUNCTION_NAME' not in os.environ:
    BASE_PATH = '/'
else:
    BASE_PATH = '/personalitytest/lambda/'

TEST_PATH = BASE_PATH + 'test'
CHALLENGE_PIXEL_PATH = BASE_PATH + 'challenge'
GENERATE_FETCH_PATH = BASE_PATH + 'generate'

ROUTES = {
    ('GET', TEST_PATH) : local_test,
    ('GET', CHALLENGE_PIXEL_PATH) : challenge_pixel,
    ('POST', GENERATE_FETCH_PATH) : generate_fetch
}

def application(in_req: Dict[str, Any]) -> Dict[str, Any]:
    path = in_req.get('path')
    route = ROUTES.get((in_req.get('method'), path))
    rfc7231 = email.utils.formatdate(timeval=time.time(), usegmt=True)
    if route is None:
        return {
            'status' : 404,
            'headers' : {
                'Content-Type' : 'text/plain',
                'Date' : rfc7231
            },
            'body' : 'path ( ' + path + ' ) may be wrong ...'
        }
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
