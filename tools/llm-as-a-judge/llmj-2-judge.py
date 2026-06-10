#!/usr/bin/env python3

import os
import io
import sys
import json
import time
import contextlib
import concurrent.futures

import llmj

try:
    import openpyxl
except ImportError:
    llmj.abort_missing_package('openpyxl')

try:
    from deepeval.metrics import GEval
    from deepeval.test_case import LLMTestCase
    from deepeval.test_case import SingleTurnParams
    from deepeval.models import DeepEvalBaseLLM
    os.environ['DEEPEVAL_TELEMETRY_OPT_OUT'] = 'YES'
except ImportError:
    llmj.abort_missing_package('deepeval')

def load_rubrics():
    rubricArr = []
    for path in sorted(llmj.DIR_RUBRIC.glob('*.json')):
        try:
            with open(path, encoding='utf-8') as f:
                rubricArr.append(json.load(f))
        except Exception:
            return None
    if len(rubricArr) == 0:
        return None
    return rubricArr

def compile_rubric(in_rubricArr):
    promptToCompile = f'''

You are an expert evaluator designer for DeepEval GEval.
Convert the criteria into evaluation_steps optimized for GEval.

[Requirements]

- Produce explicit evaluation procedures, not evaluation rules.
- Write steps in the order they should be executed.
- Avoid redundant or overlapping checks.
- Prefer fact extraction --> comparison --> scoring workflow.
- Include all important constraints from the criteria.
- The steps must be reusable across many test cases.
- Return only JSON.
  - Preserve all existing fields.
  - Add an evaluation_steps field to each rubric.
- Do not use markdown.
- Do not wrap the response in code fences.

[Expected]

[
    {{
        "name": "...",
        "criteria": "...",
        "evaluation_steps": [...]
    }},
    {{
        "name": "...",
        "criteria": "...",
        "evaluation_steps": [...]
    }},
    ...
]

[Input]

{json.dumps(in_rubricArr, ensure_ascii=False, indent=2)}

'''.strip()

    runtime = llmj.create_bedrock_runtime()
    generated = llmj.invoke_llm(runtime, llmj.LLM_MODEL, promptToCompile)
    try:
        return json.loads(generated)
    except Exception:
        print('ERROR : failed to compile rubric')
        llmj.abort()

class GatewayLLM(DeepEvalBaseLLM):
    def __init__(self, in_runtime, in_model):
        self.runtime = in_runtime
        self.model = in_model
    def get_model_name(self):
        return self.model
    def load_model(self):
        return self
    def generate(self, in_prompt):
        return llmj.invoke_llm(self.runtime, self.model, in_prompt)
    async def a_generate(self, in_prompt):
        return self.generate(in_prompt)

def create_judge(in_rubricArr):
    runtime = llmj.create_bedrock_runtime()
    def evaluate(in_rubric, in_testcase):
        metric = GEval(
            name=in_rubric['name'],
            # criteria=in_rubric['criteria'],
            evaluation_steps=in_rubric['evaluation_steps'],
            evaluation_params=[
                SingleTurnParams.INPUT,
                SingleTurnParams.ACTUAL_OUTPUT
            ],
            async_mode=False,
            model=GatewayLLM(runtime, llmj.LLM_MODEL)
        )
        llmj.invoke(lambda: metric.measure(in_testcase))
        return {
            'rubric' : metric.name,
            'score' : metric.score,
            'reason' : metric.reason
        }
    def judge(in_original, in_generated):
        testcase = LLMTestCase(
            input=in_original,
            actual_output=in_generated
        )
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(in_rubricArr)) as executor:
            callback = lambda in_rubric: evaluate(in_rubric, testcase)
            reasonArr = list(executor.map(callback, in_rubricArr))
        scoreArr = []
        for reason in reasonArr:
            scoreArr.append(reason['score'])
        return {
            'score' : sum(scoreArr) / len(scoreArr),
            'reason' : json.dumps(reasonArr, ensure_ascii=False)
        }
    return judge

def process_xlsx(in_path, in_callback):
    out_path = in_path.with_name(in_path.name.removesuffix(llmj.SUFFIX_GENERATED) + llmj.SUFFIX_JUDGED)
    workbook = openpyxl.load_workbook(in_path)
    workbook.save(out_path)
    workbook = openpyxl.load_workbook(out_path)
    sheet = workbook.active
    colDict = {}
    for key in llmj.TERM:
        colDict[key] = llmj.find_append_column(sheet, llmj.TERM[key])
    for row in range(2, sheet.max_row + 1):
        result = in_callback(
            sheet.cell(row, colDict['ORIGINAL']).value,
            sheet.cell(row, colDict['GENERATED']).value
        )
        for key in ['SCORE', 'REASON']:
            sheet.cell(row, colDict[key]).value = result[llmj.TERM[key]]
        print(f'progress : {row - 1} / {sheet.max_row - 1}')
        workbook.save(out_path)
    print(f'judged : {out_path.name}')

def main():
    rubricArr = load_rubrics()
    if rubricArr is None:
        print('ERROR : can not read some json')
        llmj.abort()
    rubricArr = compile_rubric(rubricArr)
    pathArr = llmj.find_target_files(llmj.SUFFIX_GENERATED, llmj.SUFFIX_JUDGED)
    callback = create_judge(rubricArr)
    for path in pathArr:
        process_xlsx(path, callback)
    llmj.finalize()

if __name__ == '__main__':
    main()
