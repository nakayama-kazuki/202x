#!/usr/bin/env python3

import os
import sys
import json
import base64
from typing import Dict, Any

IS_LAMBDA = 'AWS_LAMBDA_FUNCTION_NAME' in os.environ

def request_from_lambda() -> Dict[str, Any]:
    """ aws lambda http api (v2) input """
    ev = json.load(sys.stdin)
    body = ev.get('body') or ''
    if ev.get('isBase64Encoded'):
        body = base64.b64decode(body).decode('utf-8', errors='ignore')
    return {
        'method' : ev.get('requestContext', {}).get('http', {}).get('method', ''),
        'path' : ev.get('rawPath', ''),
        'query' : ev.get('queryStringParameters') or {},
        'headers' : ev.get('headers') or {},
        'cookies' : ev.get('cookies') or [],
        'body' : body
    }

def request_from_flask(in_req) -> Dict[str, Any]:
    """ flask request """
    return {
        'method' : in_req.method,
        'path' : in_req.path,
        'query' : in_req.args.to_dict(flat=True),
        'headers' : dict(in_req.headers),
        'cookies' : in_req.cookies,
        'body' : in_req.get_data(as_text=True)
    }

def respond_lambda(resp: Dict[str, Any]) -> None:
    """
    Output response for AWS Lambda
    """
    print(json.dumps({
        'statusCode': resp['status'],
        'headers': resp['headers'],
        'body': resp['body']
    }))


def app_handler(in_req: Dict[str, Any]) -> Dict[str, Any]:
    """ Environment-independent application logic """

    targetArr = ['method', 'path', 'query']
    data: Dict[str, Any] = {}
    for key in target_keys:
        data[key] = in_req.get(key)
    return {
        'status' : 200,
        'headers' : {
            'Content-Type': 'application/json'
        },
        'body' : json.dumps(data, ensure_ascii=False)
    }



if not IS_LAMBDA:
    from flask import Flask, request, Response

    app = Flask(__name__)

    @app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE'])
    @app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def entry(path: str):
        req = request_from_flask(request)
        resp = app_handler(req)
        return Response(
            resp['body'],
            status=resp['status'],
            headers=resp['headers']
        )

if __name__ == '__main__':
    if IS_LAMBDA:
        # Lambda execution
        req = request_from_lambda()
        resp = app_handler(req)
        respond_lambda(resp)
    else:
        # Local execution
        app.run(host='127.0.0.1', port=5000)
