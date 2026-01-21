#!/usr/bin/env python3

from typing import Dict, Any

BASE_PATH = '/'
# BASE_PATH = '/hello'

HTML_TEMPLATE = """
<html>
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
</html>
"""

def your_entry(in_ev, in_ctx):
    """
    In the AWS Lambda handler setting,
    specify a string composed of the file name (without '.py')
    and this function name ('your_entry'), joined by a dot ('.').
    """
    return handler_lambda(in_ev, in_ctx)

from datetime import datetime, timezone, timedelta

def row(in_key: str, in_value) -> str:
    return f"<tr><td><span>{in_key}</span></td><td><span>{in_value}</span></td></tr>"

def application(in_req: Dict[str, Any]) -> Dict[str, Any]:
    """ need to implement what you want to do """
    rowArr = []
    JST = timezone(timedelta(hours=9))
    now = datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S JST')
    rowArr.append(row('timestamp', now))
    targetArr = ['method', 'path', 'query']
    for key in targetArr:
        value = in_req.get(key)
        rowArr.append(row(key, value))
    html = HTML_TEMPLATE.format(rows=''.join(rowArr))
    return {
        'status' : 200,
        'headers' : {
            'Content-Type' : 'text/html'
        },
        'body' : html
    }

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
    return application(src)

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
        BASE_PATH,
        defaults={'path': ''},
        methods=['GET', 'POST', 'PUT', 'DELETE']
    )(entry)
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, required=True)
    args = p.parse_args()
    app.run(host='127.0.0.1', port=args.port)
