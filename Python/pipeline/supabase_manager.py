# pipeline/supabase_manager.py
"""
Supabase helpers with duplicate-safe upserts.

- Loads .env from project root (one level up from /pipeline).
- Pre-filters rows that already exist to reduce API churn.
- Uses on_conflict=... + 'Prefer: resolution=merge-duplicates' to avoid 409 errors.
- Chunked requests for large batches.

Tables & unique constraints expected:
  public.profiles  : UNIQUE (linkedin_url)
  public.contacts  : UNIQUE (email)

If your schema differs, update:
  PROFILES_TABLE, CONTACTS_TABLE, PROFILES_CONFLICT_COL, CONTACTS_CONFLICT_COL
"""
from datetime import datetime, timezone

import os
import math
from pathlib import Path
from typing import List, Dict, Iterable, Set
import requests
from urllib.parse import quote

try:
    from dotenv import load_dotenv
except ImportError:
    # Optional; the app can run without python-dotenv if env is set outside
    def load_dotenv(*args, **kwargs):  # type: ignore
        pass

# -----------------------------------------------------------------------------
# Config & env loading
# -----------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]          # project root
ROOT_ENV = ROOT / ".env"
load_dotenv(ROOT_ENV)                               # load root .env if present

SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Table/column names (adjust if your schema uses different names)
PROFILES_TABLE = "profiles"
CONTACTS_TABLE = "contacts"
PROFILES_CONFLICT_COL = "linkedin_url"  # must have a UNIQUE index/constraint
CONTACTS_CONFLICT_COL = "email"         # must have a UNIQUE index/constraint

# Safety checks
if not SUPABASE_URL or not SUPABASE_URL.startswith(("http://", "https://")):
    raise RuntimeError(
        "Invalid or missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co in your .env"
    )
if not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

# Tunables
UPSERT_CHUNK_SIZE = int(os.getenv("UPSERT_CHUNK_SIZE", "500"))  # rows per request


# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------
def fetch_profiles_to_enrich(limit=100):
    url = (
        f"{SUPABASE_URL}/rest/v1/profiles"
        f"?select=full_name,headline,location,company,linkedin_url,search_keyword,search_location,search_industry,"
        f"campaign_id,user_id,finalscout_contact_url"
        f"&is_enriched=eq.false&order=created_at.desc&limit={limit}"
    )
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json()

def mark_profiles_enriched(linkedin_urls):
    """
    Set is_enriched=true and enriched_at=now() for the given linkedin URLs.
    Uses a single PATCH with an OR filter.
    """
    urls = [u for u in (linkedin_urls or []) if u]
    if not urls:
        return 0

    # Build OR filter: (linkedin_url.eq.url1,linkedin_url.eq.url2,...)
    or_filter = ",".join([f"linkedin_url.eq.{quote(u, safe='')}" for u in urls])
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?or=({or_filter})",
        headers=HEADERS,
        json={"is_enriched": True, "enriched_at": ts},
        timeout=60
    )
    if r.status_code not in (200, 204):
        raise RuntimeError(f"mark_profiles_enriched failed: {r.status_code} {r.text[:300]}")
    # PostgREST may not return row count reliably; return the number we attempted
    return len(urls)

def _chunk_iter(items: List[Dict], size: int) -> Iterable[List[Dict]]:
    if size <= 0:
        size = len(items) or 1
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _ensure_col(d: Dict, k: str) -> bool:
    """Return True if dict has a non-empty string value for key k."""
    v = d.get(k)
    return isinstance(v, str) and len(v.strip()) > 0


def _get_existing_values(table: str, column: str, values: List[str]) -> Set[str]:
    """
    Query existing rows for 'column IN (values...)' and return the present set.
    Uses PostgREST `or=(col.eq.val1,col.eq.val2,...)` filter.
    """
    if not values:
        return set()

    # PostgREST prefers chunks to avoid very long URLs. Use groups of 200.
    existing: Set[str] = set()
    for chunk in _chunk_iter([{"v": v} for v in values], 200):
        ors = " or ".join([f"{column}.eq.{quote(item['v'], safe='')}" for item in chunk])
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={column}&or=({ors})"
        r = requests.get(url, headers=HEADERS, timeout=60)
        r.raise_for_status()
        existing.update([row[column] for row in r.json() if row.get(column)])
    return existing


# -----------------------------------------------------------------------------
# Profiles (Step 1)
# -----------------------------------------------------------------------------

def upsert_profiles(rows: List[Dict]) -> int:
    """
    Upsert profile rows, deduping by PROFILES_CONFLICT_COL.
    - Pre-filters rows whose conflict key already exists.
    - Uses on_conflict to avoid 409.
    """
    if not rows:
        return 0

    # Keep only rows that have the conflict key
    key = PROFILES_CONFLICT_COL
    rows = [r for r in rows if _ensure_col(r, key)]
    if not rows:
        return 0

    # Pre-filter: don't send rows whose key already exists
    keys = [r[key].strip() for r in rows]
    existing = _get_existing_values(PROFILES_TABLE, key, keys)
    to_insert = [r for r in rows if r[key].strip() not in existing]
    if not to_insert:
        return 0

    total = 0
    url = f"{SUPABASE_URL}/rest/v1/{PROFILES_TABLE}?on_conflict={key}"
    headers = {**HEADERS, "Prefer": "resolution=merge-duplicates"}

    for batch in _chunk_iter(to_insert, UPSERT_CHUNK_SIZE):
        r = requests.post(url, headers=headers, json=batch, timeout=120)
        if r.status_code not in (200, 201):  # 201 Created, 200 OK for upserts
            raise RuntimeError(f"Profiles upsert failed: {r.status_code} {r.text[:300]}")
        total += len(batch)
    return total


def fetch_profiles_without_email(limit: int = 100) -> List[Dict]:
    """
    Fetch recent profiles that do NOT yet exist in contacts by linkedin_url.
    This is duplicate-safe: it filters out profiles whose linkedin already in contacts.
    """
    # 1) Pull recent profiles (only columns we need downstream)
    select_cols = ",".join([
        "full_name", "headline", "location", "company",
        "linkedin_url", "search_keyword", "search_location", "search_industry", "source"
    ])
    url = f"{SUPABASE_URL}/rest/v1/{PROFILES_TABLE}?select={select_cols}&order=created_at.desc&limit={limit}"
    pr = requests.get(url, headers=HEADERS, timeout=60)
    pr.raise_for_status()
    profiles = pr.json()

    if not profiles:
        return []

    # 2) Filter out those whose linkedin already present in contacts
    urls = [p.get("linkedin_url", "").strip() for p in profiles if _ensure_col(p, "linkedin_url")]
    if not urls:
        return profiles

    existing_in_contacts = _get_existing_values(CONTACTS_TABLE, "linkedin", urls)
    return [p for p in profiles if p.get("linkedin_url", "").strip() not in existing_in_contacts]


# -----------------------------------------------------------------------------
# Contacts (Step 2)
# -----------------------------------------------------------------------------

# pipeline/supabase_manager.py
def upsert_contacts(rows):
    """
    Upsert contacts scoped by (user_id, campaign_id, email).
    - Skips empty/'Not found' emails
    - Dedupes within payload by (user_id, campaign_id, lower(email))
    - Saves extended FinalScout fields + avatar_url -> image_url
    """
    if not rows:
        return 0

    mapped = []
    for r in rows:
        email = (r.get('email') or '').strip()
        if not email or email.lower() == 'not found' or '@' not in email:
            continue

        # propagate user/campaign from profiles/enrichment
        user_id     = r.get('user_id')
        campaign_id = r.get('campaign_id')

        full = r.get('full_name') or r.get('name') or ''
        parts = full.split()
        first = r.get('first_name') or (parts[0] if parts else '')
        last  = r.get('last_name')  or (' '.join(parts[1:]) if len(parts) > 1 else '')

        conf = r.get('email_confidence', 'Unknown')
        status = {'High':'Valid','Medium':'Risky','Low':'Risky','None':'Not found'}.get(conf,'Unknown')

        mapped.append({
            'user_id': user_id,
            'campaign_id': campaign_id,

            'first_name': first,
            'last_name':  last,
            'email': email,                         # citext in DB
            'email_status': status,
            'privacy': 'Normal',
            'tags': r.get('tags',''),

            'linkedin': r.get('linkedin_url') or r.get('linkedin',''),
            'title': r.get('title') or r.get('headline', r.get('job_title','')),
            'location': r.get('location',''),
            'company': r.get('company',''),
            'industry': r.get('industry') or r.get('search_industry',''),

            'website': r.get('website',''),
            'email_type': r.get('email_type',''),
            'source_detail': r.get('source_detail',''),
            'company_city': r.get('company_city',''),
            'company_state': r.get('company_state',''),
            'company_country': r.get('company_country',''),
            'company_postal_code': r.get('company_postal_code',''),
            'company_raw_address': r.get('company_raw_address',''),
            'company_phone': r.get('company_phone',''),
            'company_domain': r.get('company_domain',''),
            'company_linkedin': r.get('company_linkedin',''),
            'company_staff_count': r.get('company_staff_count',''),
            'contact_created_at_ts': r.get('contact_created_at_ts') or None,
            'contact_latest_update_ts': r.get('contact_latest_update_ts') or None,

            'image_url': r.get('avatar_url') or r.get('image_url',''),

            'note': f"Source: {r.get('source','LinkedIn') or r.get('source_detail','')}. "
                    f"Search: {r.get('search_keyword','')} in {r.get('search_location','')}",
        })

    # Deduplicate within this payload: (user_id, campaign_id, email)
    dedup = {}
    for item in mapped:
        key = (item.get('user_id'), item.get('campaign_id'), (item['email'] or '').lower())
        dedup[key] = item  # last one wins
    payload = list(dedup.values())
    if not payload:
        print("ℹ️ No valid contacts with emails to upsert.")
        return 0

    # Upsert target matches our DB unique constraint
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/contacts?on_conflict=user_id,campaign_id,email",
        headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'},
        json=payload,
        timeout=60
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Contacts upsert failed: {r.status_code} {r.text[:300]}")
    return len(payload)

