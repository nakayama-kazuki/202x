#!/usr/bin/env python3

import os
import sys
import json

import llmj

def load_rubrics():
    rubricArr = []
    for path in sorted(llmj.DIR_RUBRIC.glob('*.json')):
        with open(path, encoding='utf-8') as f:
            rubricArr.append(json.load(f))
    return rubricArr

def build_prompt(in_rubricArr, in_lang=llmj.OUTOUT_LANG):
    return f'''
You are an expert prompt engineer.

Please generate a GENERATED-PROMPT that transforms the ORIGINAL-TEXT into a GENERATED-TEXT.
The GENERATED-PROMPT must be written in {in_lang}.
The GENERATED-TEXT must satisfy the evaluation criteria defined in the following [Rubrics].

[Relationship]

  ORIGINAL-TEXT
      |
      v
  GENERATED-PROMPT (this is what you must generate in {in_lang})
      |
      v
  GENERATED-TEXT (compliant with the following [Rubrics])

Use {llmj.ORIGINAL_PLACEHOLDER} as a placeholder in the GENERATED-PROMPT,
since the ORIGINAL-TEXT will be embedded into the GENERATED-PROMPT during post-processing.

Assume that the GENERATED-PROMPT will be maintained by humans after generation.
Therefore, produce a well-structured, easy-to-maintain GENERATED-PROMPT with clear organization and high readability.

[Rubrics]

{json.dumps(in_rubricArr, ensure_ascii=False, indent=2)}

[Note]

Return only the GENERATED-PROMPT.
Do not explain your reasoning.
'''.strip()

def main():
    runtime = llmj.create_bedrock_runtime()
    generated = llmj.invoke_llm(runtime, llmj.LLM_MODEL, build_prompt(load_rubrics()))
    target = llmj.DIR_WORK / f'{llmj.INITIAL_VERSION_NAME}{llmj.SUFFIX_PROMPT}'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(generated)
    print(f'OK : generated "{target.name}"')
    llmj.finalize()

if __name__ == '__main__':
    main()
