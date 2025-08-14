#!/usr/bin/env python3
import os, sys
from dotenv import load_dotenv

from pipeline.finalscout_extractor import FinalScoutExtractor
from pipeline.supabase_manager import (
    fetch_profiles_to_enrich,   # pulls ONLY profiles where is_enriched=false
    upsert_contacts,            # upserts to contacts (skips "Not found"; maps avatar_url -> image_url)
    mark_profiles_enriched      # sets is_enriched=true,enriched_at=now for attempted profiles
)

def _has_real_email(item: dict) -> bool:
    e = (item.get('email') or '').strip()
    return bool(e) and e.lower() != 'not found' and '@' in e

def main():
    load_dotenv()

    scout_email = os.getenv('SCOUT_EMAIL','')
    scout_pwd   = os.getenv('SCOUT_PASSWORD','')
    headless = os.getenv('HEADLESS_BROWSER','false').lower() == 'true'
    if not scout_email or not scout_pwd:
        print('❌ Set SCOUT_EMAIL and SCOUT_PASSWORD in .env'); sys.exit(1)

    batch = int(os.getenv('ENRICH_BATCH','100'))

    # 1) only fetch profiles not yet enriched
    profiles = fetch_profiles_to_enrich(limit=batch)
    if not profiles:
        print('✅ No pending profiles to enrich (all flagged as processed)')
        return

    print(f'📧 Enriching {len(profiles)} profiles via FinalScout...')
    fs = FinalScoutExtractor(scout_email, scout_pwd, headless=headless)
    fs.setup_driver()
    fs.login_to_finalscout()

    processed_urls = []  # track all attempted profiles (success or not)

    try:
        # 2) get emails for each LinkedIn URL
        enriched = fs.bulk_extract_emails(profiles)

        # Split by result: only those with a *real* email will open /app/contacts
        successes = [i for i in enriched if _has_real_email(i)]
        failures  = [i for i in enriched if not _has_real_email(i)]

        print(f"📊 Email results → found: {len(successes)} | not found: {len(failures)}")

        # 3) fetch full details (avatar + modal fields) ONLY for successes
        detailed_successes = []
        for item in successes:
            linkedin_url = item.get('linkedin_url') or ''
            full_name    = (item.get('full_name') or '').strip()
            fs_url       = item.get('finalscout_contact_url', '')  # optional: if you store a direct ?contact=<id> link

            details = {}
            # A) Prefer direct ?contact=<id> URL when available
            if fs_url:
                details = fs.fetch_contact_by_url(fs_url)

            # B) Else match by LinkedIn URL within Contacts table
            if not details and linkedin_url:
                details = fs.fetch_full_contact_details_by_linkedin(linkedin_url=linkedin_url, name_keyword=full_name)

            # C) Else fall back to name search + click
            if not details and full_name:
                details = fs.fetch_full_contact_details(name_keyword=full_name, visible_name_to_click=full_name)

            merged = {**item, **(details or {})}
            detailed_successes.append(merged)

        # 4) save successes to Supabase (function already dedupes by email)
        saved = upsert_contacts(detailed_successes)
        print(f'✅ Saved/updated {saved} contacts with full FinalScout details')

        # 5) print a short summary of those with real emails
        for c in detailed_successes:
            e = (c.get('email') or '').strip()
            print(f"   - {c.get('full_name','?')} | {e} | {c.get('company','')} | {c.get('title','')}")

        # Track processed LinkedIn URLs for flagging
        for item in enriched:
            if item.get('linkedin_url'):
                processed_urls.append(item['linkedin_url'])

    finally:
        fs.close()

    # 6) mark everything we attempted as enriched so we skip next time
    try:
        updated = mark_profiles_enriched(processed_urls)
        print(f'🏁 Flagged {updated} profiles as enriched (is_enriched=true)')
    except Exception as e:
        print(f'⚠️ Could not mark profiles enriched: {e}')

if __name__ == '__main__':
    main()
