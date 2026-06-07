#!/usr/bin/env python3

import os
import sys
import json

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

def create_judge(in_rubrics):
    token = os.getenv('ACCESS_TOKEN')
    if not token:
        print('ERROR : ACCESS_TOKEN is not set')
        sys.exit(1)
    runtime = llmj.create_bedrock_runtime(token)
    llm = GatewayLLM(runtime, llmj.LLM_MODEL)
    metrics = []
    for rubric in in_rubrics:
        metrics.append(
            GEval(
                name=rubric['name'],
                criteria=rubric['criteria'],
                evaluation_params=[
                    SingleTurnParams.INPUT,
                    SingleTurnParams.ACTUAL_OUTPUT
                ],
                model=llm
            )
        )
    def judge(in_original, in_generated):
        testcase = LLMTestCase(
            input=in_original,
            actual_output=in_generated
        )
        scores = []
        reasons = []
        for metric in metrics:
            metric.measure(testcase)
            scores.append(metric.score)
            reasons.append({
                'rubric' : metric.name,
                'score' : metric.score,
                'reason' : metric.reason
            })
        return {
            'score' : sum(scores) / len(scores),
            'reason' : json.dumps(reasons, ensure_ascii=False)
        }
    return judge

def process_xlsx(in_path, in_callback):
    out_path = in_path.with_name(in_path.name.removesuffix(llmj.SUFFIX_GENERATED) + llmj.SUFFIX_JUDGED)
    workbook = openpyxl.load_workbook(in_path)
    workbook.save(out_path)
    workbook = openpyxl.load_workbook(out_path)
    sheet = workbook.active
    cols = {}
    for key in llmj.TERM:
        cols[key] = llmj.find_append_column(sheet, llmj.TERM[key])
    for row in range(2, sheet.max_row + 1):
        result = in_callback(
            sheet.cell(row, cols['ORIGINAL']).value,
            sheet.cell(row, cols['GENERATED']).value
        )
        for key in ['SCORE', 'REASON']:
            sheet.cell(row, cols[key]).value = result[llmj.TERM[key]]
        print(f'progress : {row - 1} / {sheet.max_row - 1}')
        workbook.save(out_path)
    print(f'completed : {out_path.name}')

def main():
    rubricArr = load_rubrics()
    if rubricArr is None:
        print('ERROR : can not read some json')
        sys.exit(1)
    pathArr = llmj.find_target_files(llmj.SUFFIX_GENERATED, llmj.SUFFIX_JUDGED)
    callback = create_judge(rubricArr)
    for path in pathArr:
        process_xlsx(path, callback)
    llmj.finalize()

if __name__ == '__main__':
    main()
