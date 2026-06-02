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
+- README.md
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
| Original Text (ex. Full news article text) | Generated Text (ex. Generated briefing text) |

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

- Named entities
- Numbers and dates
- Hallucinations
- Fact preservation
- Causality
- Speculation presented as facts

### clarity.json

Evaluates readability and comprehensibility.

Checks include:

- Natural sentence structure
- Clear wording
- Logical organization
- Appropriate information ordering
- Avoidance of ambiguity

### relevance.json

Evaluates whether important information from the original article is preserved.

Checks include:

- Preservation of key facts
- Preservation of major conclusions
- Appropriate information prioritization
- Consistency between main topic and generated text

### sensitivity.json

Evaluates whether sensitive topics are handled appropriately.

Checks include:

- Appropriate handling of deaths, accidents, disasters, crime, and illness
- Avoidance of sensational expressions
- Consideration for victims and stakeholders
- Avoidance of discriminatory or harmful language

## Configuration

Configuration is stored in:

```text
src/judge.yml
```

Typical configuration:

```yaml
provider: debug
dstype: gold
compare:
threshold: 1.0
```

## Usage

Run with configuration defaults:

```bash
python src/judge.py
```

Specify dataset type:

```bash
python src/judge.py --dstype gold
```

```bash
python src/judge.py --dstype test
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

## Regression Testing

Planned feature.
