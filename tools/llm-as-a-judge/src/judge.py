#!/usr/bin/env python3

import argparse
import importlib
import json
import sys
from pathlib import Path

import yaml


ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT_DIR / "src" / "judge.yml"


def load_deepeval():
    try:
        import deepeval
        return deepeval
    except ImportError:
        print("ERROR: deepeval is not installed.")
        sys.exit(1)


def load_config(path: Path) -> dict:
    if not path.exists():
        print(f"ERROR: config not found: {path}")
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_args():
    parser = argparse.ArgumentParser()

    parser.add_argument("--dataset")
    parser.add_argument("--compare")
    parser.add_argument("--provider")
    parser.add_argument("--threshold", type=float)

    return parser.parse_args()


def resolve_options(config: dict, args):
    return {
        "dataset": args.dataset or config.get("dataset"),
        "compare": args.compare or config.get("compare"),
        "provider": args.provider or config.get("provider"),
        "threshold": args.threshold or config.get("threshold"),
        "prompt": config.get("prompt"),
        "rubrics": config.get("rubrics"),
    }


def load_provider(provider_name: str):
    try:
        module = importlib.import_module(
            f"providers.{provider_name}"
        )
        return module
    except ModuleNotFoundError:
        print(f"ERROR: provider not found: {provider_name}")
        sys.exit(1)


def load_prompt(prompt_name: str):
    path = ROOT_DIR / "prompt" / prompt_name

    with open(path, encoding="utf-8") as f:
        return {
            "name": prompt_name,
            "rev": "TODO",
            "content": f.read(),
        }


def load_rubrics():
    rubric_dir = ROOT_DIR / "rubric"

    rubrics = []

    for path in sorted(rubric_dir.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            rubrics.append(
                {
                    "name": path.stem,
                    "rev": "TODO",
                    "content": json.load(f),
                }
            )

    return rubrics


def build_prompt(prompt_text: str, rubrics: list):
    rubric_text = json.dumps(
        [r["content"] for r in rubrics],
        ensure_ascii=False,
        indent=2,
    )

    return f"""
{prompt_text}

Rubrics:

{rubric_text}
"""


def load_dataset(dataset_path: str):
    import pandas as pd

    df = pd.read_excel(dataset_path)

    required = {"original", "generated"}

    if not required.issubset(df.columns):
        raise ValueError(
            "Dataset must contain columns: original, generated"
        )

    return df


def validate_compare(compare_path: str | None):
    if not compare_path:
        return

    path = Path(compare_path)

    if not path.exists():
        print(f"ERROR: compare result not found: {path}")
        sys.exit(1)


def main():
    load_deepeval()

    config = load_config(CONFIG_PATH)

    args = parse_args()

    options = resolve_options(config, args)

    validate_compare(options["compare"])

    provider = load_provider(options["provider"])

    prompt = load_prompt(options["prompt"])

    rubrics = load_rubrics()

    evaluation_prompt = build_prompt(
        prompt["content"],
        rubrics,
    )

    dataset = load_dataset(options["dataset"])

    print("Provider :", options["provider"])
    print("Dataset  :", options["dataset"])
    print("Rows     :", len(dataset))

    #
    # TODO:
    #
    # for testcase in dataset:
    #     deepeval evaluate
    #
    # aggregate result
    #
    # compare
    #
    # save json
    #

    print("READY")


if __name__ == "__main__":
    main()