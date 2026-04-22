"""Iteration 22 — photo analysis feature tests + regression checks.

Tests:
- POST /api/chat/image: 1st/2nd/3rd photo all return 200, non-empty Russian text.
- AI must NOT contain forbidden words: 'ожирение', 'диагноз', 'идеал' across image responses.
- Regression: /api/chat returns Russian, no closed endings.
- Regression: /api/health, /api/problems, /api/tariffs, /api/specialists -> 200.
"""
import os
import re
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

# 1x1 JPEG (valid base64)
TINY_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8l"
    "JCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIo"
    "Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAAR"
    "CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAA"
    "AAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAM"
    "AwEAAhEDEQA/AL+AH//Z"
)

CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
FORBIDDEN_WORDS = ["ожирение", "диагноз", "идеал"]
CLOSED_ENDINGS = {"понятно.", "ясно.", "хорошо.", "окей.", "принято."}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def session_id():
    return f"TEST_iter22_{uuid.uuid4().hex[:12]}"


# ---------- Regression: public endpoints ----------
def test_health(session):
    r = session.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200, r.text


def test_problems(session):
    r = session.get(f"{BASE_URL}/api/problems", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


def test_tariffs(session):
    r = session.get(f"{BASE_URL}/api/tariffs", timeout=15)
    assert r.status_code == 200


def test_specialists(session):
    r = session.get(f"{BASE_URL}/api/specialists", timeout=15)
    assert r.status_code == 200


# ---------- /api/chat regression: closed endings ----------
def test_chat_no_closed_ending(session):
    r = session.post(
        f"{BASE_URL}/api/chat",
        json={
            "message": "Привет, я очень устал на этой неделе.",
            "session_id": f"TEST_iter22_chat_{uuid.uuid4().hex[:8]}",
            "language": "ru",
            "voice": "female",
        },
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    text = data.get("message") or data.get("response") or ""
    assert text.strip(), "empty response"
    assert CYRILLIC_RE.search(text), f"not Russian: {text[:120]}"
    # last sentence
    sentences = re.split(r"(?<=[.!?…])\s+", text.strip())
    last = (sentences[-1].lower().strip() if sentences else "")
    assert last not in CLOSED_ENDINGS, f"forbidden closed ending: {last!r}"


# ---------- /api/chat/image: 3 consecutive photos in same session ----------
@pytest.fixture(scope="module")
def photo_responses(session, session_id):
    """Send 3 photos to the SAME session_id and collect responses."""
    responses = []
    for i in range(3):
        r = session.post(
            f"{BASE_URL}/api/chat/image",
            json={
                "session_id": session_id,
                "image": TINY_JPEG_B64,
                "language": "ru",
            },
            timeout=120,
        )
        responses.append(r)
    return responses


def test_image_first_photo_200_russian(photo_responses):
    r = photo_responses[0]
    assert r.status_code == 200, r.text
    text = r.json().get("response", "")
    assert text.strip(), "empty 1st-photo response"
    assert CYRILLIC_RE.search(text), f"1st response not Russian: {text[:120]}"


def test_image_second_photo_200_russian(photo_responses):
    r = photo_responses[1]
    assert r.status_code == 200, r.text
    text = r.json().get("response", "")
    assert text.strip(), "empty 2nd-photo response"
    assert CYRILLIC_RE.search(text)


def test_image_third_photo_200_russian(photo_responses):
    r = photo_responses[2]
    assert r.status_code == 200, r.text
    text = r.json().get("response", "")
    assert text.strip(), "empty 3rd-photo response"
    assert CYRILLIC_RE.search(text)


def test_image_responses_no_forbidden_words(photo_responses):
    """AI must NOT diagnose / use 'ожирение' / 'идеал' across photo replies."""
    bad = []
    for idx, r in enumerate(photo_responses):
        text = (r.json().get("response", "") or "").lower()
        for w in FORBIDDEN_WORDS:
            if w in text:
                bad.append(f"photo#{idx+1} contains '{w}'")
    assert not bad, f"Forbidden words found: {bad}"


def test_image_2nd_differs_from_1st(photo_responses):
    """2nd reply should differ from the 1st (photo_count directive injected)."""
    t1 = (photo_responses[0].json().get("response", "") or "").strip()
    t2 = (photo_responses[1].json().get("response", "") or "").strip()
    assert t1 and t2
    assert t1 != t2, "2nd response identical to 1st — photo_count directive may not be injected"
