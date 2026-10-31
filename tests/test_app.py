import sys
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
import main  # noqa: E402

client = TestClient(main.app)
FAKE = {
    "reply": "Namaste",
    "suggestions": ["a", "b", "c", "d"],
    "ask": {"kind": "single", "options": ["₹2,00,000", "₹5,00,000", "x" * 90]},
    "plan": {"event_type": "wedding", "budget": 100000,
             "days": [{"label": "Haldi", "date": "2027-07-12"}, {"label": "Wedding", "date": "2027-07-14", "main": True}],
             "tasks": [
                 {"id": "t1", "title": "Book hall", "category": "venue", "est_cost": 30000, "done": True},
                 {"id": "t2", "title": "Hire cooks", "category": "catering", "est_cost": 50000, "done": False}]}}


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    main._hits.clear()
    monkeypatch.setattr(main, "ask_gemini", lambda body: FAKE)


def make_plan(*tasks, **kw):
    return main.Plan(tasks=[{"id": str(i), "title": f"t{i}", "category": "venue", **t} for i, t in enumerate(tasks)], **kw)


def test_totals_use_actual_cost_for_done_tasks():
    plan = main.Plan(budget=1000, tasks=[
        {"id": "a", "title": "x", "category": "venue", "est_cost": 400, "actual_cost": 350, "done": True},
        {"id": "b", "title": "y", "category": "decor", "est_cost": 300}])
    assert main.totals(plan) == {"spent": 350, "pending": 300, "planned": 650, "remaining": 350}


def test_chat_returns_totals_ask_and_capped_suggestions():
    r = client.post("/api/chat", json={"message": "book hall done"})
    assert r.status_code == 200
    data = r.json()
    assert data["totals"]["spent"] == 30000 and data["totals"]["remaining"] == 20000
    assert len(data["suggestions"]) == 3
    assert data["ask"]["kind"] == "single" and all(len(o) <= 60 for o in data["ask"]["options"])
    assert [d["main"] for d in data["plan"]["days"]] == [False, True]


@pytest.mark.parametrize("bad_ask", [None, "text", {"kind": "free"}, {"kind": "single", "options": ["only one"]},
                                     {"kind": "multi", "options": "nope"}])
def test_bad_ask_is_dropped_not_fatal(monkeypatch, bad_ask):
    monkeypatch.setattr(main, "ask_gemini", lambda body: {**FAKE, "ask": bad_ask})
    r = client.post("/api/chat", json={"message": "hi"})
    assert r.status_code == 200 and r.json()["ask"] is None


def test_date_ask_has_no_options():
    assert main.clean_ask({"kind": "date", "options": ["ignored"]}) == {"kind": "date", "options": []}


def test_alerts_flag_overdue_and_due_soon_only():
    plan = make_plan({"due": "2026-10-20", "est_cost": 1},          # overdue
                     {"due": "2026-10-27", "est_cost": 1},          # due soon
                     {"due": "2026-12-01", "est_cost": 1},          # far away
                     {"due": "2026-10-21", "est_cost": 1, "done": True},  # done: ignored
                     {"est_cost": 1})                               # no date: ignored
    found = main.alerts(plan, today=date(2026, 10, 25))
    assert [(a["type"], a["days"]) for a in found] == [("overdue", 5), ("due_soon", 2)]


def test_impossible_model_dates_become_none():
    plan = main.Plan.model_validate({"days": [{"label": "x", "date": "2027-02-30"}],
                                     "tasks": [{"id": "1", "title": "t", "category": "venue", "due": "2027-13-01"}]})
    assert plan.days[0].date is None and plan.tasks[0].due is None


def test_history_accepts_longest_reply_we_return(monkeypatch):
    monkeypatch.setattr(main, "ask_gemini", lambda body: {**FAKE, "reply": "x" * 5000})
    reply = client.post("/api/chat", json={"message": "hi"}).json()["reply"]
    ok = client.post("/api/chat", json={"message": "again", "history": [{"role": "model", "text": reply}]})
    assert ok.status_code == 200


@pytest.mark.parametrize("payload", [
    {"message": ""}, {"message": "x" * 1001}, {"message": "hi", "lang": "xx"},
    {"message": "hi", "plan": {"budget": -5}}])
def test_bad_input_rejected(payload):
    assert client.post("/api/chat", json=payload).status_code in (400, 422)


def test_invalid_model_output_gives_502(monkeypatch):
    monkeypatch.setattr(main, "ask_gemini", lambda body: {"reply": "hi", "plan": {"tasks": [{"id": "1"}]}})
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 502


def test_missing_api_key_gives_503(monkeypatch):
    def boom(body):
        raise RuntimeError("no key")
    monkeypatch.setattr(main, "ask_gemini", boom)
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 503


def test_rate_limit():
    codes = [client.post("/api/chat", json={"message": "hi"}).status_code for _ in range(21)]
    assert codes[-1] == 429


def test_security_headers_and_index():
    r = client.get("/")
    assert r.status_code == 200
    assert "script-src 'self'" in r.headers["content-security-policy"]
    assert r.headers["x-content-type-options"] == "nosniff"


def test_js_modules_are_served_as_javascript():
    # Windows can map .js to text/plain, which browsers reject for <script type="module">.
    r = client.get("/static/app.js")
    assert r.status_code == 200 and "javascript" in r.headers["content-type"]



@pytest.mark.parametrize("lang,name", [("en", "English"), ("hi", "Hindi"), ("bn", "Bengali")])
def test_language_rule_names_the_chosen_language(lang, name):
    rule = main.language_rule(lang)
    assert f"ONLY in {name}" in rule and "Never switch language" in rule