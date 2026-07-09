#!/usr/bin/env python3

import sys
import random
import pathlib
import threading
import concurrent.futures

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.dont_write_bytecode = True
import llmj

FAKE_TEXT_CNT = 30

PROMPT_TEMPLATE = 'Generate a __ARTICLE__ of approximately __LENGTH__ characters written in __LANG__ about __GENRE__. The content does not need to describe real events. Use a __FORMALITY__ tone and a __STYLE__ writing style.'

def fake_text():
    spec = {
        'lang' : 'Japanese',
        'length' : random.randint(300, 3000),
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
        'genre' : random.choice([
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
        ])
    }
    prompt = llmj.text_from_template_text(PROMPT_TEMPLATE, {
        '__LANG__' : spec['lang'],
        '__LENGTH__' : spec['length'],
        '__ARTICLE__' : spec['article'],
        '__FORMALITY__' : spec['formality'],
        '__STYLE__' : spec['style'],
        '__GENRE__' : spec['genre']
    })
    # print(prompt)
    return llmj.RUNNER.toText(prompt)

completed = 0
lock = threading.Lock()

def generate(in_counter, in_digits):
    global completed
    path = llmj.DIR_SOURCE / (str(in_counter).zfill(in_digits) + '.txt')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(fake_text())
    with lock:
        completed += 1
        progress = completed * 100 / FAKE_TEXT_CNT
        print(f'INFO : {progress:.1f}% ({completed}/{FAKE_TEXT_CNT})')

def main():
    digits = 3
    maxCounter = -1
    for path in llmj.DIR_SOURCE.glob('*.txt'):
        try:
            maxCounter = max(maxCounter, int(path.stem))
        except ValueError:
            pass
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for i in range(FAKE_TEXT_CNT):
            futures.append(executor.submit(generate, maxCounter + 1 + i, digits))
        for future in concurrent.futures.as_completed(futures):
            future.result()
    llmj.finalize()

if __name__ == '__main__':
    main()
