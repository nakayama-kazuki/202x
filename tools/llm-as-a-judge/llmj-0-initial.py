#!/usr/bin/env python3

import os
import sys
import json

import llmj

def load_rubrics():
    rubrics = []
    for path in sorted(llmj.DIR_RUBRIC.glob('*.json')):
        with open(path, encoding='utf-8') as f:
            rubrics.append(json.load(f))
    return rubrics

def build_prompt(in_rubrics, in_lang=llmj.OUTOUT_LANG):
    return f'''
You are an expert prompt engineer.
This prompt will be used to transform the "original" text into the "generated" text within {llmj.OUTOUT_LENGTH} characters.
Generate the prompt in {in_lang} so that it maximizes compliance with the following rubrics.
Use {llmj.ORIGINAL_PLACEHOLDER} as a placeholder, since the original text will be embedded into the prompt during post-processing.

Assume that the generated prompt will be maintained by humans after generation.
Therefore, produce a well-structured, easy-to-maintain prompt with clear organization and high readability.
The generated prompt must include 

[Rubrics]

{json.dumps(in_rubrics, ensure_ascii=False, indent=2)}

[Note]

Return only the generated prompt.
Do not explain your reasoning.
'''.strip()

def main():
    pat = os.getenv('PAT')
    if not pat:
        print('ERROR : PAT is not set')
        sys.exit(1)
    runtime = llmj.create_bedrock_runtime(pat)
    generated = llmj.invoke_llm(runtime, llmj.LLM_MODEL, build_prompt(load_rubrics()))
    target = llmj.DIR_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_PROMPT}'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(generated)
    print(f'OK : generated "{target.name}"')
    llmj.finalize()

if __name__ == '__main__':
    main()
