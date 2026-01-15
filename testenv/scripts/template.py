#!/usr/bin/env python3

BASE_PATH = '/'
# BASE_PATH = '/hello'

from typing import Dict, Any

HTML_TEMPLATE = """<html>
<style type='text/css'>
TABLE {{
	border-collapse : collapse;
}}
TD {{
	border : 1px solid black;
}}
SPAN {{
	margin : 5px;
}}
</style>
<body>
<table>{rows}</table>
</body>
</html>"""

def application(in_req: Dict[str, Any]) -> Dict[str, Any]:
    """ need to implement what you want to do """
    targetArr = ['method', 'path', 'query']
    data: Dict[str, Any] = {}
    rowArr = []
    for key in targetArr:
        value = in_req.get(key)
        rowArr.append(
            f"<tr><td><span>{key}</span></td><td><span>{value}</span></td></tr>"
        )
    html = HTML_TEMPLATE.format(rows=''.join(rowArr))
    return {
        'status' : 200,
        'headers' : {
            'Content-Type': 'text/html'
        },
        'body' : html
    }

####
#### you don't need to edit code below
####

import os
import sys
import json
import base64

def request_from_lambda() -> Dict[str, Any]:
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
    return {
        'method' : in_req.method,
        'path' : in_req.path,
        'query' : in_req.args.to_dict(flat=True),
        'headers' : dict(in_req.headers),
        'cookies' : in_req.cookies,
        'body' : in_req.get_data(as_text=True)
    }

def response_to_lambda(in_resp: Dict[str, Any]) -> None:
    print(json.dumps({
        'statusCode': in_resp['status'],
        'headers': in_resp['headers'],
        'body': in_resp['body']
    }))

if __name__ == '__main__':
    if 'AWS_LAMBDA_FUNCTION_NAME' in os.environ:
        src = request_from_lambda()
        dst = application(src)
        response_to_lambda(dst)
    else:
        from flask import Flask, request, Response
        app = Flask(__name__)
        def entry(path: str):
            src = request_from_flask(request)
            dst = application(src)
            return Response(
                dst['body'],
                status=dst['status'],
                headers=dst['headers']
            )
        entry = app.route(
            BASE_PATH,
            defaults={'path': ''},
            methods=['GET', 'POST', 'PUT', 'DELETE']
        )(entry)
        import argparse
        p = argparse.ArgumentParser()
        p.add_argument("--port", type=int, required=True)
        args = p.parse_args()
        app.run(host='127.0.0.1', port=args.port)

