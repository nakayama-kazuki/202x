# LLM as a Judge

## Overview

LLM as a Judge is a CLI-based evaluation framework for assessing LLM-generated content using DeepEval and rubric-based evaluation.

The framework evaluates generated outputs against original source content across one or more evaluation dimensions.

Typical use cases include:

- Summarization
- Content generation
- Translation
- Rewriting
- Briefing generation
- Other source-to-generated text tasks

## Requirements

- Python 3.13+
- DeepEval

Install DeepEval:

```bash
python -m pip install deepeval
```

Verify installation:

```bash
python -c "import deepeval; print('OK')"
```

## Directory Layout

```text
llm-as-a-judge/
|
+- readme.md
|
+- prompt/
|   |
|   +- *.txt
|
+- rubric/
|   |
|   +- *.json
|   |
|   +- ...
|
+- dataset/
|   |
|   +- gold/
|   |   |
|   |   +- results/
|   |   |   |
|   |   |   +- yyyymmdd-seq.json
|   |   |   |
|   |   |   +- ...
|   |   |
|   |   +- *.xlsx
|   |
|   +- test/
|       |
|       +- *.xlsx
|
+- src/
    |
    +- judge.py
    |
    +- judge.yml
    |
    +- providers/
        |
        +- debug/
        |
        +- openai/
        |
        +- bedrock/
```

## Dataset Format

Datasets are stored as Excel files.

The following columns are required:

| original | generated |
|-----------|-----------|
| Original Text (ex. Full news article text ) | Generated Text (ex. Generated briefing text) |

## Example Rubrics

```text
llm-as-a-judge/
|
+- rubric/
    |
    +- accuracy.json
    |
    +- clarity.json
    |
    +- relevance.json
    |
    +- sensitivity.json
```

### accuracy.json

Evaluates whether the generated text accurately represents facts contained in the original article.

Checks include:

ex. Named entities
ex. Numbers and dates
ex. Hallucinations
ex. Fact preservation
ex. Causality
ex. Speculation presented as facts

### clarity.json

Evaluates readability and comprehensibility.

Checks include:

ex. Natural sentence structure
ex. Clear wording
ex. Logical organization
ex. Appropriate information ordering
ex. Avoidance of ambiguity

### relevance.json

Evaluates whether important information from the original article is preserved.

Checks include:

ex. Preservation of key facts
ex. Preservation of major conclusions
ex. Appropriate information prioritization
ex. Consistency between main topic and generated text

### sensitivity.json

Evaluates whether sensitive topics are handled appropriately.

Checks include:

ex. Appropriate handling of deaths, accidents, disasters, crime, and illness
ex. Avoidance of sensational expressions
ex. Consideration for victims and stakeholders
ex. Avoidance of discriminatory or harmful language

## Configuration

Configuration is stored in:

```text
src/judge.yml
```

Typical configuration:

```yaml
provider: debug
dataset: dataset/gold/sample.xlsx
compare:
threshold: 1.0
prompt: sample.txt
rubrics: rubric/*
```

## Usage

Run with configuration defaults:

```bash
python src/judge.py
```

Specify dataset:

```bash
python src/judge.py --dataset dataset/gold/news.xlsx
```

Specify provider:

```bash
python src/judge.py --provider debug
```

Compare against a previous evaluation result:

```bash
python src/judge.py --compare dataset/gold/results/20260601-001.json
```

Specify comparison threshold:

```bash
python src/judge.py --threshold 1.0
```

## Providers

### debug

Development provider.

Typical use cases:

- Prompt inspection
- DeepEval integration testing
- Mock evaluation
- Debugging rubric and prompt generation

### openai

Provider backed by OpenAI models.

### bedrock

Provider backed by Amazon Bedrock models.

## Results

Results are written to:

```text
dataset/gold/results/yyyymmdd-seq.json
```

Each result file contains:

- Evaluation scores
- Evaluation reasons
- Overall average score
- Per-dimension average scores
- Comparison results (if enabled)
- Threshold exceedances
- Prompt revision information
- Rubric revision information
- Dataset revision information
- Provider information

## Regression Testing

The tool supports regression testing by comparing a new evaluation run against a previous result file.

Comparison includes:

- Overall score differences
- Per-dimension score differences
- Individual test cases whose score differences exceed a configured threshold

This enables prompt, rubric, and model changes to be evaluated systematically over time.
