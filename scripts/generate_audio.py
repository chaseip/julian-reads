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

SIGHT_WORD_SPEECHES = [
    "STOP. This sign means STOP!",
    "GO. This means you can go!",
    "EXIT. The exit is the way out!",
    "OPEN. This place is open!",
    "CLOSED. This place is closed!",
    "MEN. This bathroom is for men.",
    "WOMEN. This bathroom is for women.",
    "HOT. Be careful, this is hot!",
    "COLD. This is cold!",
    "PUSH. Push the door to open it!",
    "PULL. Pull the door to open it!",
    "DANGER. This means danger, be careful!",
    "WALK. It is safe to walk!",
    "IN. Go in!",
    "OUT. Go out!",
    "UP. Go up!",
    "DOWN. Go down!",
    "RESTROOM. The restroom is the bathroom!",
    "BALL. Kick the ball!",
    "TEAM. A team plays together!",
    "WIN. Our team wins!",
    "PLAY. Let's play!",
    "SCORE. We scored a point!",
    "GAME. Let's play a game!",
    "RUN. Run fast!",
    "JUMP. Jump high!",
    "YES!",
    "NO!",
    "HELP. Ask for help!",
    "EAT. Time to eat!",
    "DRINK. Have a drink!",
    "GOOD. That is good!",
    "BIG. That is very big!",
    "LITTLE. That is very little!",
]


# ---------------------------------------------------------------------------
# Phrase generation — mirrors src/utils/phrases.ts getAllPhrases()
# ---------------------------------------------------------------------------

def get_all_phrases():
    phrases = set()

    def add(s):
        phrases.add(s.strip())

    # Home
    add("Hi Julian! Let's learn today! Pick something to do!")

    # Settings
    add("Settings. You can change the voice and difficulty here.")
    add("Hi Julian! Great job today! Keep learning! You are doing amazing!")
    add("Progress has been reset.")

    # Match game fixed
    add("What letter does this start with?")
    add("Yes! Great job, Julian!")

    for entry in ALPHABET:
        L = entry["letter"]
        ph = entry["phonetic"]
        words = entry["words"]

        for word in words:
            # ABC Explorer / Letter Focus intro
            add(f'{L}! … {L} says "{ph}". {word}! {word} starts with {L}!')
            # Word card tap
            add(f'{word}! {word} starts with {L}!')
            # Match game question
            add(f'What letter does {word} start with?')
            # Match re-tap picture
            add(f'{word}. What letter does {word} start with?')
            # Match correct
            add(f'Yes! Great job, Julian! {word} starts with {L}!')
            # Match hint (constant time delay)
            add(f'{word} starts with the letter {L}. Can you find the {L}?')
            # Match wrong / retry
            add(f"Let's try again. {word} starts with {L}.")

        # Letter Focus auto-speak (first word)
        w0 = words[0]
        add(f'This is the letter {L}. {L} says "{ph}". {w0}! {w0} starts with {L}!')
        # Letter Focus replay button
        add(f'{L} says "{ph}". {w0}! {w0} starts with {L}!')

    for speech in SIGHT_WORD_SPEECHES:
        add(speech)

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
