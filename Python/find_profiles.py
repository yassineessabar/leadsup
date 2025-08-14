#!/usr/bin/env python3
import os
import sys
import argparse
from dotenv import load_dotenv

from pipeline.linkedin_scraper import LinkedInScraper
from pipeline.supabase_manager import upsert_profiles  # must use ?on_conflict=linkedin_url

def parse_args():
    p = argparse.ArgumentParser(
        description="Find LinkedIn profiles and save to Supabase 'profiles' (stamped with campaign_id & user_id)."
    )
    p.add_argument("keyword",   help="Search keyword, e.g. 'ceo'")
    p.add_argument("location",  help="Location, e.g. 'Sydney'")
    p.add_argument("industry",  help="Industry, e.g. 'Retail'")
    p.add_argument("max_pages", type=int, help="Pages to fetch per search")
    # Optional overrides (you don't need to pass these; defaults below match your request)
    p.add_argument("--campaign-id", dest="campaign_id", default=None, help="UUID to stamp into profiles.campaign_id")
    p.add_argument("--user-id",     dest="user_id",     default=None, help="UUID to stamp into profiles.user_id")
    return p.parse_args()

def main():
    load_dotenv()

    # ⬇️ Your requested defaults (will apply if no CLI/env override is provided)
    DEFAULT_CAMPAIGN_ID = "e7803b65-508c-4dd4-a5da-9b1859996dce"
    DEFAULT_USER_ID     = "d155d4c2-2f06-45b7-9c90-905e3648e8df"

    args = parse_args()

    campaign_id = args.campaign_id or os.getenv("CAMPAIGN_ID") or DEFAULT_CAMPAIGN_ID
    user_id     = args.user_id     or os.getenv("USER_ID")     or DEFAULT_USER_ID

    li_email = os.getenv("LINKEDIN_EMAIL", "")
    li_pass  = os.getenv("LINKEDIN_PASSWORD", "")
    headless = os.getenv("HEADLESS_BROWSER", "false").lower() == "true"

    if not li_email or not li_pass:
        print("❌ Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in your .env")
        sys.exit(1)

    print(
        f"🔎 Find profiles | keyword='{args.keyword}' | location='{args.location}' | "
        f"industry='{args.industry}' | pages={args.max_pages}\n"
        f"🏷  campaign_id={campaign_id} | user_id={user_id}"
    )

    li = LinkedInScraper(li_email, li_pass, headless=headless)
    li.setup_driver()
    li.login()

    try:
        profiles = li.search_profiles(
            keywords=[args.keyword],
            target_locations=[args.location],
            target_industries=[args.industry],
            max_pages=args.max_pages
        )

        if not profiles:
            print("ℹ️ No profiles found for the given parameters.")
            return

        # 🔁 Stamp every profile with your IDs (UUID strings)
        for p in profiles:
            p["campaign_id"] = campaign_id
            p["user_id"]     = user_id

        saved_count = upsert_profiles(profiles)
        print(f"✅ Saved/updated {saved_count} profiles to Supabase (with campaign_id & user_id)")

    finally:
        li.close()

if __name__ == "__main__":
    main()
