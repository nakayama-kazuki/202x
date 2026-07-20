#!/usr/bin/env python3

#
# Emoji ranges.
#

import re

EMOJI_PATTERN = re.compile(
    '['
    '\U0001F300-\U0001F5FF'
    '\U0001F600-\U0001F64F'
    '\U0001F680-\U0001F6FF'
    '\U0001F700-\U0001F77F'
    '\U0001F780-\U0001F7FF'
    '\U0001F800-\U0001F8FF'
    '\U0001F900-\U0001F9FF'
    '\U0001FA00-\U0001FA6F'
    '\U0001FA70-\U0001FAFF'
    '\U00002600-\U000026FF'
    '\U00002700-\U000027BF'
    ']'
)

#
# Maximum allowed UTF-8 byte length.
#

MAX_BYTES = 1000

def utf8(in_text):
    return in_text.encode('utf-8')

def postproc(in_text):
    #
    # Replace emojis with spaces.
    #

    in_text = EMOJI_PATTERN.sub(' ', in_text)

    #
    # Retry if the generated text exceeds the maximum UTF-8 byte length.
    #

    if len(utf8(in_text)) > MAX_BYTES:
        return None

    #
    # Accept the generated text.
    #

    return in_text
