#!/usr/bin/env python3
"""
Generate all TTS audio files for Julian Reads.

Run once (or after adding new words/phrases):
    pip install requests
    set OPENAI_API_KEY=sk-...
    python scripts/generate_audio.py

Skips files that already exist, so safe to re-run.
Filenames are SHA-256(text)[:12] so they stay stable across runs.
Keep ALPHABET and SIGHT_WORD_SPEECHES in sync with src/data/ files.
"""

import hashlib
import os
import sys
import time
from pathlib import Path

import requests

VOICES = ["nova", "onyx"]
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio"
SPEED = 0.9
CONCURRENCY_DELAY = 0.15  # seconds between requests


# ---------------------------------------------------------------------------
# Data — keep in sync with src/data/alphabet.ts and src/data/sightWords.ts
# ---------------------------------------------------------------------------

ALPHABET = [
    {"letter": "A", "phonetic": "aah", "words": ["Alligator", "Apple", "Ant"]},
    {"letter": "B", "phonetic": "buh", "words": ["Bear", "Basketball", "Butterfly"]},
    {"letter": "C", "phonetic": "kuh", "words": ["Cat", "Cow", "Crab"]},
    {"letter": "D", "phonetic": "duh", "words": ["Dog", "Dolphin", "Duck"]},
    {"letter": "E", "phonetic": "eh",  "words": ["Elephant", "Eagle", "Egg"]},
    {"letter": "F", "phonetic": "fuh", "words": ["Fish", "Fox", "Frog"]},
    {"letter": "G", "phonetic": "guh", "words": ["Giraffe", "Gorilla", "Goat"]},
    {"letter": "H", "phonetic": "huh", "words": ["Horse", "Hippo", "Hawk"]},
    {"letter": "I", "phonetic": "ih",  "words": ["Iguana", "Ice Cream", "Island"]},
    {"letter": "J", "phonetic": "juh", "words": ["Julian", "Jaguar", "Jellyfish"]},
    {"letter": "K", "phonetic": "kuh", "words": ["Kangaroo", "Koala", "Kite"]},
    {"letter": "L", "phonetic": "luh", "words": ["Lion", "Lizard", "Lobster"]},
    {"letter": "M", "phonetic": "muh", "words": ["Monkey", "Moose", "Mouse"]},
    {"letter": "N", "phonetic": "nuh", "words": ["Narwhal", "Nest", "Newt"]},
    {"letter": "O", "phonetic": "ah",  "words": ["Octopus", "Otter", "Owl"]},
    {"letter": "P", "phonetic": "puh", "words": ["Panda", "Penguin", "Pig"]},
    {"letter": "Q", "phonetic": "kwuh","words": ["Queen", "Quail", "Quarter"]},
    {"letter": "R", "phonetic": "ruh", "words": ["Rabbit", "Rhino", "Raccoon"]},
    {"letter": "S", "phonetic": "sss", "words": ["Shark", "Snake", "Squirrel"]},
    {"letter": "T", "phonetic": "tuh", "words": ["Tiger", "Turtle", "Trophy"]},
    {"letter": "U", "phonetic": "uh",  "words": ["Umbrella", "Unicorn", "Uniform"]},
    {"letter": "V", "phonetic": "vuh", "words": ["Vulture", "Volleyball", "Viper"]},
    {"letter": "W", "phonetic": "wuh", "words": ["Wolf", "Whale", "Walrus"]},
    {"letter": "X", "phonetic": "ex",  "words": ["X-ray", "Ox", "Box"]},
    {"letter": "Y", "phonetic": "yuh", "words": ["Yak", "Yarn", "Yo-yo"]},
    {"letter": "Z", "phonetic": "zzz", "words": ["Zebra", "Zoo", "Zap"]},
]

# Sight-word tokens — keep in sync with src/data/sightWords.ts (word column).
SIGHT_WORDS = [
    "STOP", "GO", "EXIT", "OPEN", "CLOSED", "MEN", "WOMEN", "HOT", "COLD",
    "PUSH", "PULL", "DANGER", "WALK", "IN", "OUT", "UP", "DOWN", "RESTROOM",
    "BALL", "TEAM", "WIN", "PLAY", "SCORE", "GAME", "RUN", "JUMP",
    "YES", "NO", "HELP", "EAT", "DRINK", "GOOD", "BIG", "LITTLE",
]

# CVC phonics pilot — keep in sync with src/data/cvc.ts.
CVC_WORDS = [
    {"word": "CAT", "onset": "k", "vowel": "a", "coda": "t"},
    {"word": "DOG", "onset": "d", "vowel": "o", "coda": "g"},
    {"word": "PIG", "onset": "p", "vowel": "i", "coda": "g"},
    {"word": "SUN", "onset": "s", "vowel": "u", "coda": "n"},
    {"word": "HAT", "onset": "h", "vowel": "a", "coda": "t"},
    {"word": "BUS", "onset": "b", "vowel": "u", "coda": "s"},
    {"word": "BED", "onset": "b", "vowel": "e", "coda": "d"},
    {"word": "CUP", "onset": "k", "vowel": "u", "coda": "p"},
]

GENERIC_INDEPENDENT_PRAISE = "You did it all by yourself!"


# ---------------------------------------------------------------------------
# Phrase generation — mirrors src/utils/phrases.ts getAllPhrases()
# ---------------------------------------------------------------------------

def get_all_phrases():
    phrases = set()

    def add(s):
        phrases.add(s.strip())

    # Home + Settings
    add("Hi Julian! Let's learn today! Pick something to do!")
    add("Settings. You can change the voice and difficulty here.")

    add(GENERIC_INDEPENDENT_PRAISE)

    # ---- Trial engine prompts (mirror src/data/items.ts) ----

    # Word Touch (receptive reading) + Sight Words (picture -> word).
    add("Which word is this?")  # sight-word ask (constant)
    for w in SIGHT_WORDS:
        # word-touch ask; both skills share model/hint/prompted-praise
        add(f"Tap {w}.")
        add(f"This word is {w}.")
        add(f"{w}. Tap {w}.")
        add(f"Good job tapping {w}!")

    # First Letter (what letter does this word start with?) — uses each letter's first word.
    for entry in ALPHABET:
        L = entry["letter"]
        word = entry["words"][0]
        add(f"What letter does {word} start with?")
        add(f"{word} starts with {L}.")
        add(f"{word} starts with {L}. Tap {L}.")
        add(f"Good job! {word} starts with {L}.")

    # Phonics CVC (sound it out).
    for c in CVC_WORDS:
        w, o, v, k = c["word"], c["onset"], c["vowel"], c["coda"]
        add(f"Sound it out. {o}... {v}... {k}. What word?")
        add(f"{o}... {v}... {k}. {w}.")
        add(f"{w}. Tap {w}.")
        add(f"Good job sounding out {w}!")

    # ---- ABC Explorer + Letter Focus (kept-as-is browse tools) ----
    for entry in ALPHABET:
        L = entry["letter"]
        ph = entry["phonetic"]
        for word in entry["words"]:
            add(f'{L}! … {L} says "{ph}". {word}! {word} starts with {L}!')
            add(f'{word}! {word} starts with {L}!')
            add(f'This is the letter {L}. {L} says "{ph}". {word}! {word} starts with {L}!')
            add(f'{L} says "{ph}". {word}! {word} starts with {L}!')

    return sorted(phrases)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def audio_filename(text: str, voice: str) -> str:
    return f"{voice}_{text_hash(text)}.mp3"


def generate_audio(text: str, voice: str, api_key: str) -> bytes:
    resp = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": "tts-1", "voice": voice, "input": text, "speed": SPEED},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    api_key = os.environ.get("OPENAI_API_KEY") or input("Enter OpenAI API key: ").strip()
    if not api_key:
        print("No API key provided.", file=sys.stderr)
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    phrases = get_all_phrases()
    total = len(phrases) * len(VOICES)
    done = skipped = errors = 0

    print(f"Generating {len(phrases)} phrases × {len(VOICES)} voices = {total} files")
    print(f"Output: {OUTPUT_DIR}\n")

    for voice in VOICES:
        print(f"--- Voice: {voice} ---")
        for text in phrases:
            filename = audio_filename(text, voice)
            filepath = OUTPUT_DIR / filename

            if filepath.exists():
                skipped += 1
                done += 1
                continue

            try:
                audio = generate_audio(text, voice, api_key)
                filepath.write_bytes(audio)
                done += 1
                pct = int(done / total * 100)
                print(f"  [{pct:3d}%] {text[:70]}")
                time.sleep(CONCURRENCY_DELAY)
            except Exception as exc:
                errors += 1
                done += 1
                print(f"  ERROR: {text[:60]}: {exc}", file=sys.stderr)

    new_files = done - skipped - errors
    print(f"\nDone. {new_files} new files, {skipped} skipped, {errors} errors.")
    if errors:
        print("Re-run to retry failed files.")


if __name__ == "__main__":
    main()
