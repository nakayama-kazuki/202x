#!/usr/bin/env python3

import sys
import random
import pathlib
import threading
import concurrent.futures

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

PROMPT_TEMPLATE = 'Generate a __QUALITY__ __ARTICLE__ of approximately __LENGTH__ characters written in __LANG__ about __GENRE__. The content does not need to describe real events. Generate articles that are realistic and moderately challenging for text understanding tasks. Prefer articles that contain realistic ambiguity, multiple related facts, quotations, temporal information, or similar characteristics requiring careful reading while remaining internally consistent. Use a __FORMALITY__ tone and a __STYLE__ writing style.'

ARGS = llmj.get_args(
    {
        'textCnt' : '10',
        'genreMode' : 'balanced',
        'source' : str(llmj.DIR_SOURCE)
    },
    {
        'textCnt' : lambda in_cnt: int(in_cnt),
        'source' : lambda in_src: pathlib.Path(in_src)
    }
)

def fake_text(in_genre):
    spec = {
        'lang' : 'Japanese',
        'length' : random.randint(300, 3000),
        'quality' : random.choice([
            'high-quality ( well-structured and coherent )',
            'low-quality ( poorly structured, ambiguous, or inconclusive )'
        ]),
        'article' : random.choice([
            'fact-based article ( must be based on real facts )',
            'fictional article ( write it as if it were a real news article; the events do not need to be real )'
        ]),
        'formality' : random.choice([
            'Formal',
            'Neutral',
            'Conversational'
        ]),
        'style' : random.choice([
            'Objective',
            'Analytical',
            'Explanatory',
            'Narrative'
        ]),
        'genre' : in_genre
    }
    prompt = llmj.text_from_template_text(PROMPT_TEMPLATE, {
        '__LANG__' : spec['lang'],
        '__QUALITY__' : spec['quality'],
        '__LENGTH__' : spec['length'],
        '__ARTICLE__' : spec['article'],
        '__FORMALITY__' : spec['formality'],
        '__STYLE__' : spec['style'],
        '__GENRE__' : spec['genre']
    })
    # print(prompt)
    return llmj.RUNNER.toText(prompt)

genreArr = [
    'Accidents & Traffic Incidents',
    'Crime & Criminal Cases',
    'Courts & Justice',
    'Disasters & Disaster Prevention',
    'Weather & Climate',
    'Government & Local Administration',
    'Politics & Public Policy',
    'Elections',
    'International Affairs',
    'Economy & Markets',
    'Business & Corporate News',
    'Corporate Earnings & Financial Results',
    'New Products & Services',
    'Product Recalls',
    'System Outages & Service Disruptions',
    'Healthcare & Medicine',
    'Infectious Diseases',
    'Science & Research',
    'Environment & Climate Change',
    'Artificial Intelligence & Technology',
    'Cybersecurity',
    'Education',
    'Parenting',
    'Senior Care & Aging',
    'Careers & Workplace',
    'Personal Finance',
    'Law & Legal Systems',
    'Lifestyle & Daily Living',
    'Food & Cooking',
    'Travel & Tourism',
    'Housing & Real Estate',
    'DIY & Gardening',
    'Pets & Animals',
    'Sports',
    'Entertainment',
    'Movies & TV Dramas',
    'Music',
    'Video Games',
    'Anime & Manga',
    'Books & Publishing',
    'Social Media & Online Trends',
    'Interviews',
    'Surveys & Rankings',
    'Opinion & Analysis',
    'Reviews & Personal Experiences',
    'Events & Exhibitions',
    'Local News',
    'Obituaries & Memorials',
    'Volunteer & Community Activities',
    'History & Culture'
]

random.shuffle(genreArr)

completed = 0
lock = threading.Lock()

def generate(in_counter, in_digits):
    global completed
    path = ARGS['source'] / (str(in_counter).zfill(in_digits) + '.txt')
    if ARGS['genreMode'] == 'balanced':
        genre = genreArr[in_counter % len(genreArr)]
    elif ARGS['genreMode'] == 'random':
        genre = random.choice(genreArr)
    else:
        llmj.abort(f'unknown genre mode : {ARGS["genreMode"]}')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(fake_text(genre))
    with lock:
        completed += 1
        progress = completed * 100 / ARGS['textCnt']
        print(f'INFO : {progress:.1f}% ({completed}/{ARGS['textCnt']})')

def main():
    digits = 3
    maxCounter = -1
    for path in ARGS['source'].glob('*.txt'):
        try:
            maxCounter = max(maxCounter, int(path.stem))
        except ValueError:
            pass
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for i in range(ARGS['textCnt']):
            futures.append(executor.submit(generate, maxCounter + 1 + i, digits))
        for future in concurrent.futures.as_completed(futures):
            future.result()
    llmj.finalize()

if __name__ == '__main__':
    main()
