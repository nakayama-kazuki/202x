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

def set_challenge_cookie(in_req, in_rfc7231):
    minute = f"{datetime.datetime.utcnow().minute:02d}"
    random = secrets.token_hex(16)
    raw = f"{os.environ['LAMBDA_SECRET']}{minute}{random}".encode("utf-8")
    token = hashlib.sha256(raw).hexdigest()
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/plain',
            'Date' : in_rfc7231
        },
        'body' : 'Set-Cookie: token=' + token + '&random=' + random
    }

def generate_llm_text(in_req, in_rfc7231):
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/plain',
            'Date' : in_rfc7231
        },
        'body' : 'generate ( ' + in_rfc7231 + ' ) '
    }

BASE_PATH = '/'
APP1_PATH = '/challenge'
APP2_PATH = '/generate'

ROUTES = {
    ('GET', APP1_PATH) : set_challenge_cookie,
    ('POST', APP2_PATH) : generate_llm_text
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
        'headers' : dict(in_req.headers),
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
