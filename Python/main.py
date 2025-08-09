
# !/usr/bin/env python3
"""
Simple LinkedIn Lead Generation Pipeline
"""
import os
import sys
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))


def load_env_file():
    """Load environment variables from .env file with debugging"""
    env_file = Path('.env')

    print(f"🔍 Looking for .env file at: {env_file.absolute()}")
    print(f"🔍 .env file exists: {env_file.exists()}")
    print(f"🔍 Current working directory: {Path.cwd()}")

    if not env_file.exists():
        print("❌ .env file not found!")
        return False

    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"🔍 .env file has {len(lines)} lines")

            for line_num, line in enumerate(lines, 1):
                original_line = line
                line = line.strip()

                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue

                # Check for = sign
                if '=' not in line:
                    print(f"⚠️ Line {line_num} has no '=': {repr(original_line)}")
                    continue

                # Split key and value
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()

                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]

                # Set environment variable
                os.environ[key] = value
                print(f"✅ Set {key} = {value[:20]}...")

        return True

    except Exception as e:
        print(f"❌ Error reading .env file: {e}")
        return False


# Load environment variables
print("📂 Loading environment variables...")
load_env_file()

# Get environment variables
LINKEDIN_EMAIL = os.getenv('LINKEDIN_EMAIL', '')
LINKEDIN_PASSWORD = os.getenv('LINKEDIN_PASSWORD', '')
SCOUT_EMAIL = os.getenv('SCOUT_EMAIL', '')
SCOUT_PASSWORD = os.getenv('SCOUT_PASSWORD', '')
INSTANTLY_API_KEY = os.getenv('INSTANTLY_API_KEY', '')
INSTANTLY_WORKSPACE_ID = os.getenv('INSTANTLY_WORKSPACE_ID', '')


def test_setup():
    """Test if environment variables are set"""
    print("\n🔧 Testing setup...")

    required_vars = [
        ('LinkedIn Email', LINKEDIN_EMAIL),
        ('LinkedIn Password', LINKEDIN_PASSWORD),
        ('Scout Email', SCOUT_EMAIL),
        ('Scout Password', SCOUT_PASSWORD),
        ('Instantly API Key', INSTANTLY_API_KEY),
        ('Instantly Workspace ID', INSTANTLY_WORKSPACE_ID)
    ]

    missing = []
    for name, value in required_vars:
        if value:
            print(f"✅ {name}: Set ({value[:20]}{'...' if len(value) > 20 else ''})")
        else:
            print(f"❌ {name}: Missing")
            missing.append(name)

    if missing:
        print(f"\n❌ Missing environment variables: {', '.join(missing)}")
        print("Please check your .env file format")
        return False

    print("\n✅ All environment variables are set!")
    return True


def scrape_linkedin():
    """Step 1: Scrape LinkedIn profiles"""
    print("🔍 Starting LinkedIn scraping...")

    try:
        # Import and initialize LinkedIn scraper
        from linkedin_scraper import LinkedInScraper

        # Define search parameters
        keywords = ["ceo"]
        locations = ["Sydney"]
        industries = ["Retail"]

        # Initialize scraper
        scraper = LinkedInScraper(LINKEDIN_EMAIL, LINKEDIN_PASSWORD, headless=False)
        scraper.setup_driver()
        scraper.login()

        # Search for profiles (limit to 1 page for testing)
        profiles = scraper.search_profiles(
            keywords=keywords,
            target_locations=locations,
            target_industries=industries,
            max_pages=1
        )

        scraper.close()

        print(f"✅ Found {len(profiles)} LinkedIn profiles")
        return profiles

    except Exception as e:
        print(f"❌ LinkedIn scraping failed: {str(e)}")
        return []


def extract_emails(profiles):
    """Step 2: Extract emails using Scout"""
    print("📧 Starting email extraction...")

    if not profiles:
        print("No profiles to process")
        return []

    try:
        # Import and initialize Scout email extractor
        from scout_extractor import ScoutEmailExtractor

        # Initialize Scout extractor
        scout = ScoutEmailExtractor(SCOUT_EMAIL, SCOUT_PASSWORD, headless=False)
        scout.setup_driver()
        scout.login_to_finalscout()

        # Extract emails for all profiles
        enriched_profiles = scout.bulk_extract(profiles)

        scout.close()

        # Count successful email extractions
        with_emails = len([p for p in enriched_profiles if p.get('email') and p.get('email') != 'Not found'])

        print(f"✅ Extracted emails for {with_emails}/{len(profiles)} profiles")
        return enriched_profiles

    except Exception as e:
        print(f"❌ Email extraction failed: {str(e)}")
        return profiles


def upload_to_instantly(profiles):
    """Step 3: Upload to Instantly"""
    print("⬆️ Uploading to Instantly...")

    # DEBUG: Check what we're actually getting
    print(f"🔍 DEBUG: Received {len(profiles)} profiles")
    if profiles:
        print(f"🔍 DEBUG: First profile structure:")
        for key, value in profiles[0].items():
            print(f"  {key}: {value}")

    try:
        from instantly_uploader import InstantlyUploader

        # Initialize uploader
        uploader = InstantlyUploader(INSTANTLY_API_KEY, INSTANTLY_WORKSPACE_ID)

        # Test connection first
        print("🔧 Testing Instantly connection...")
        if not uploader.test_connection():
            print("❌ Failed to connect to Instantly API")
            return False

        # Export to CSV backup before uploading
        print("📄 Creating CSV backup...")
        csv_filename = uploader.export_to_csv(profiles)
        if csv_filename:
            print(f"✅ Backup created: {csv_filename}")

        # Upload to Instantly
        print("📤 Starting upload to Instantly...")
        result = uploader.upload_leads(profiles, batch_size=10)

        if result['success']:
            print(f"\n🎉 Successfully uploaded {result['uploaded']} leads to Instantly!")
            print(f"📊 Total processed: {result['total_profiles']}")
            print(f"📊 Valid emails: {result['valid_profiles']}")
            print(f"📊 Uploaded: {result['uploaded']}")
            if result['failed'] > 0:
                print(f"📊 Failed: {result['failed']}")
            print(f"🎯 View leads: {result['dashboard_url']}")
            return True
        else:
            print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
            print(f"📊 Valid profiles found: {result['valid_profiles']}")
            if result.get('failed', 0) > 0:
                print(f"📊 Failed uploads: {result['failed']}")
            return False

    except ImportError:
        print("❌ Could not import instantly_uploader.py")
        print("Make sure the file exists in the same directory")
        return False
    except Exception as e:
        print(f"❌ Upload to Instantly failed: {str(e)}")
        return False

def main():
    """Main pipeline"""
    print("🚀 LinkedIn Lead Generation Pipeline")
    print("=" * 50)

    # Test setup first
    if not test_setup():
        return

    print("\n" + "=" * 50)

    # Step 1: LinkedIn scraping
    profiles = scrape_linkedin()
    print(f"Found {len(profiles)} profiles")

    # Step 2: Email extraction
    if profiles:
        enriched_profiles = extract_emails(profiles)
        print(f"Processed {len(enriched_profiles)} profiles")

        # Step 3: Upload to Instantly
        if enriched_profiles:
            success = upload_to_instantly(enriched_profiles)
            if success:
                print("✅ Pipeline completed successfully!")
            else:
                print("❌ Upload failed")
        else:
            print("❌ No profiles to upload")
    else:
        print("❌ No profiles found")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_setup()
    else:
        main()