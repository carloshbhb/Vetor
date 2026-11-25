#!/usr/bin/env python3
"""Fetch fresh Google Trends Brazil topics and their related news links.

The worker deliberately keeps source headlines and URLs instead of converting a
trend phrase into an unsupported news claim. Only public HTTPS article URLs are
passed downstream.
"""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import ipaddress
import json
import socket
import sys
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

FEED_URL = "https://trends.google.com/trending/rss?geo=BR"
NAMESPACE = {"ht": "https://trends.google.com/trending/rss"}
MAX_TOPIC_AGE_HOURS = 72
MAX_TOPICS = 30
MAX_NEWS_PER_TOPIC = 3


def _text(parent: ET.Element, path: str) -> str:
    value = parent.findtext(path, default="", namespaces=NAMESPACE)
    return " ".join(str(value or "").split()).strip()


def _date(value: str) -> str | None:
    if not value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        try:
            parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=dt.timezone.utc)
            return parsed.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            return None


def _is_public_https_url(value: str) -> bool:
    try:
        parsed = urlparse(value.strip())
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            return False
        host = parsed.hostname.rstrip(".").lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal", ".test")):
            return False
        try:
            address = ipaddress.ip_address(host)
            if not address.is_global:
                return False
        except ValueError:
            # DNS is not resolved here; the URL is source metadata, never fetched by the worker.
            if "." not in host:
                return False
        return True
    except (TypeError, ValueError):
        return False


def parse_feed(xml_text: str, now: dt.datetime | None = None) -> list[dict]:
    current = now or dt.datetime.now(dt.timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=dt.timezone.utc)
    current = current.astimezone(dt.timezone.utc)
    root = ET.fromstring(xml_text)
    output: list[dict] = []
    seen_topics: set[str] = set()

    for item in root.findall(".//item"):
        title = _text(item, "title")
        if len(title) < 3:
            continue
        normalized_title = title.casefold()
        if normalized_title in seen_topics:
            continue

        topic_date_raw = _text(item, "pubDate")
        topic_date = _date(topic_date_raw)
        if topic_date:
            parsed_date = dt.datetime.fromisoformat(topic_date.replace("Z", "+00:00"))
            age_hours = (current - parsed_date).total_seconds() / 3600
            if age_hours < -2 or age_hours > MAX_TOPIC_AGE_HOURS:
                continue

        news: list[dict] = []
        seen_urls: set[str] = set()
        news_nodes = item.findall("ht:news_item", NAMESPACE)
        # Some feed variants wrap the related items one level deeper.
        if not news_nodes:
            news_nodes = list(item.findall(".//ht:news_item", NAMESPACE))
        for node in news_nodes:
            news_title = _text(node, "ht:news_item_title")
            news_url = _text(node, "ht:news_item_url")
            news_source = _text(node, "ht:news_item_source")
            news_date = _date(_text(node, "ht:news_item_pubdate"))
            if not news_title or not _is_public_https_url(news_url) or news_url in seen_urls:
                continue
            if news_date:
                parsed_news_date = dt.datetime.fromisoformat(news_date.replace("Z", "+00:00"))
                if (current - parsed_news_date).total_seconds() > 7 * 86400:
                    continue
            entry = {
                "title": news_title[:240],
                "url": news_url[:1200],
                "source": news_source[:120] or "Fonte jornalística",
            }
            if news_date:
                entry["publishedAt"] = news_date
            snippet = _text(node, "ht:news_item_snippet")
            if snippet:
                entry["snippet"] = snippet[:500]
            news.append(entry)
            seen_urls.add(news_url)
            if len(news) >= MAX_NEWS_PER_TOPIC:
                break

        # A trend without a related source headline is not treated as a news story.
        if not news:
            continue
        output.append({
            "title": title[:180],
            "traffic": _text(item, "ht:approx_traffic")[:40],
            "source": "Google Trends Brasil",
            "publishedAt": topic_date,
            "news": news,
        })
        seen_topics.add(normalized_title)
        if len(output) >= MAX_TOPICS:
            break
    return output


def fetch_topics(timeout: int = 25) -> list[dict]:
    request = urllib.request.Request(
        FEED_URL,
        headers={
            "User-Agent": "VetorBlogEditorialBot/1.0 (+https://www.vetor.blog)",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = response.read(3_000_000)
    return parse_feed(payload.decode("utf-8", errors="replace"))


def self_test() -> None:
    sample = """<?xml version="1.0" encoding="UTF-8"?>
    <rss xmlns:ht="https://trends.google.com/trending/rss"><channel><item>
      <title>Inteligência artificial</title><pubDate>Tue, 24 Nov 2026 18:00:00 GMT</pubDate>
      <ht:approx_traffic>20K+</ht:approx_traffic>
      <ht:news_item><ht:news_item_title>Nova ferramenta de IA é anunciada</ht:news_item_title>
      <ht:news_item_url>https://news.example.com/ia</ht:news_item_url>
      <ht:news_item_source>News Example</ht:news_item_source></ht:news_item>
    </item></channel></rss>"""
    fixed_now = dt.datetime(2026, 11, 24, 19, 0, tzinfo=dt.timezone.utc)
    parsed = parse_feed(sample, fixed_now)
    assert len(parsed) == 1
    assert parsed[0]["title"] == "Inteligência artificial"
    assert parsed[0]["news"][0]["source"] == "News Example"
    assert parse_feed(sample.replace("https://news.example.com/ia", "http://news.example.com/ia"), fixed_now) == []
    print("trending-news feed parser tests passed")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="Write JSON array to this path")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    try:
        rows = fetch_topics()
    except Exception as exc:  # A feed outage falls back to the verified product catalog.
        print(f"[TREND_NEWS] feed unavailable: {type(exc).__name__}: {exc}", file=sys.stderr)
        rows = []
    rendered = json.dumps(rows, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as stream:
            stream.write(rendered + "\n")
    else:
        print(rendered)
    print(f"[TREND_NEWS] fresh topics with related news: {len(rows)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
