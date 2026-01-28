#!/usr/bin/env python3

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

def make_token(in_minute: str, in_random: str) -> str:
    raw = f"{os.environ['LAMBDA_SECRET']}{in_minute}{in_random}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def encode_payload(in_payload: str) -> str:
    return base64.urlsafe_b64encode(in_payload.encode("utf-8")).decode("ascii").rstrip("=")

def decode_payload(in_encoded: str) -> str:
    padding = "=" * (-len(in_encoded) % 4)
    return base64.urlsafe_b64decode((in_encoded + padding).encode("ascii")).decode("utf-8")

THRESHOLD_MINUTES = 15

def challenge_pixel(in_req, in_rfc7231):
    minute = f"{datetime.datetime.utcnow().minute:02d}"
    random = secrets.token_hex(16)
    token = make_token(minute, random)
    encoded = encode_payload(f"token={token}&random={random}")
    second = THRESHOLD_MINUTES * 60
    cookie_field_arr = [
        f"challenge={encoded}",
        f"Max-Age={second}",
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Strict"
    ]
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'image/gif',
            'Date' : in_rfc7231,
            'Set-Cookie' : "; ".join(cookie_field_arr),
            'Cache-Control' : 'no-store'
        },
        'body' : base64.b64decode("R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==")
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
        if make_token(f"{past:02d}", in_random) == in_token:
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

def llm_generate(in_req, in_rfc7231):
    cookies = parse_cookie(in_req['headers'].get('cookie', ''))
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
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/plain',
            'Date' : in_rfc7231
        },
        'body' : 'verified ( ' + random + ' )'
    }

BASE_PATH = '/'
CHALLENGE_PIXEL_PATH = BASE_PATH + 'challenge'
LLM_GENERATE_PATH = BASE_PATH + 'generate'

ROUTES = {
    ('GET', CHALLENGE_PIXEL_PATH) : challenge_pixel,
    #('POST', LLM_GENERATE_PATH) : llm_generate
    ('GET', LLM_GENERATE_PATH) : llm_generate
}

def application(in_req: Dict[str, Any]) -> Dict[str, Any]:
    route = ROUTES.get((in_req.get('method'), in_req.get('path')))
    rfc7231 = email.utils.formatdate(timeval=time.time(), usegmt=True)
    if route is None:
        return {
            'status' : 404,
            'headers' : {
                'Content-Type' : 'text/plain',
                'Date' : rfc7231
            },
            'body' : 'path may be wrong ...'
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
    p.add_argument("--port", type=int, required=True)
    args = p.parse_args()
    app.run(host='127.0.0.1', port=args.port)
