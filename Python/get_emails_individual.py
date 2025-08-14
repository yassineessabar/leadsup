#!/usr/bin/env python3
"""
Individual Email Enrichment Script
Processes contacts one by one with full FinalScout enrichment
"""
import os, sys
from dotenv import load_dotenv
from pipeline.finalscout_extractor import FinalScoutExtractor
from pipeline.supabase_manager import (
    fetch_profiles_to_enrich,   # pulls ONLY profiles where is_enriched=false
    mark_profiles_enriched      # sets is_enriched=true,enriched_at=now for attempted profiles
)
from pipeline.individual_enrichment import (
    upsert_contact_enrichment,
    mark_contact_enriched,
    finalscout_fetch_profile,
    finalscout_fetch_emails, 
    finalscout_fetch_company,
    finalscout_fetch_socials
)

def process_individual_contact(fs: FinalScoutExtractor, profile: dict, campaign_id: str, user_id: str) -> bool:
    """
    Process a single contact through the complete FinalScout enrichment pipeline
    
    Args:
        fs: FinalScout extractor instance
        profile: Profile data from database
        campaign_id: Campaign ID to associate contact with
        user_id: User ID to associate contact with
        
    Returns:
        bool: True if successfully enriched, False otherwise
    """
    linkedin_url = profile.get('linkedin_url', '')
    full_name = profile.get('full_name', '')
    
    if not linkedin_url:
        print(f"⚠️ Skipping {full_name} - no LinkedIn URL")
        return False
    
    print(f"🔍 Processing: {full_name} - {linkedin_url}")
    
    try:
        # Step 1: Fetch basic profile info (this gets email)
        profile_data = finalscout_fetch_profile(fs, linkedin_url)
        if not profile_data.get('email') or profile_data.get('email') == 'Not found':
            print(f"❌ No email found for {full_name}")
            return False
            
        print(f"✅ Found email: {profile_data.get('email')}")
        
        # Step 2-4: Fetch all additional details in one call to avoid multiple contacts page visits
        additional_details = fs.fetch_full_contact_details_by_linkedin(linkedin_url, full_name)
        
        # Return to LinkedIn finder after getting all contact details
        fs.return_to_linkedin_finder()
        
        # Extract different types of data from the single call
        email_data = {
            'email_type': additional_details.get('email_type', ''),
            'privacy': additional_details.get('privacy_label', 'Normal'),
            'source_detail': additional_details.get('source_detail', 'FinalScout')
        }
        
        company_data = {
            'company': additional_details.get('company', ''),
            'title': additional_details.get('title', ''),
            'industry': additional_details.get('industry', ''),
            'location': additional_details.get('location', ''),
            'website': additional_details.get('website', ''),
            'company_city': additional_details.get('company_city', ''),
            'company_state': additional_details.get('company_state', ''),
            'company_country': additional_details.get('company_country', ''),
            'company_postal_code': additional_details.get('company_postal_code', ''),
            'company_raw_address': additional_details.get('company_raw_address', ''),
            'company_phone': additional_details.get('company_phone', ''),
            'company_domain': additional_details.get('company_domain', ''),
            'company_linkedin': additional_details.get('company_linkedin', ''),
            'company_staff_count': additional_details.get('company_staff_count', '')
        }
        
        social_data = {
            'image_url': additional_details.get('avatar_url', ''),  # Map avatar_url to image_url
            'linkedin': additional_details.get('linkedin', linkedin_url),  # Ensure LinkedIn URL is captured
            'contact_created_at_ts': additional_details.get('contact_created_at_ts'),
            'contact_latest_update_ts': additional_details.get('contact_latest_update_ts')
        }
        
        # Merge all data
        enriched_contact = {
            **profile,  # original profile data
            **profile_data,  # basic profile + email
            **email_data,    # additional email data
            **company_data,  # company information
            **social_data,   # social profiles
            'user_id': user_id,
            'campaign_id': campaign_id
        }
        
        # Step 5: Save the enriched contact
        contact_id = upsert_contact_enrichment(enriched_contact)
        if contact_id:
            print(f"✅ Saved contact: {full_name} (ID: {contact_id})")
            
            # Step 6: Mark as enriched so we don't process again
            mark_contact_enriched(linkedin_url)
            print(f"✅ Marked as enriched: {full_name}")
            return True
        else:
            print(f"❌ Failed to save contact: {full_name}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {full_name}: {str(e)}")
        return False

def main():
    """
    Main function for individual contact enrichment
    """
    load_dotenv()

    scout_email = os.getenv('SCOUT_EMAIL','')
    scout_pwd   = os.getenv('SCOUT_PASSWORD','')
    headless = os.getenv('HEADLESS_BROWSER','false').lower() == 'true'
    
    if not scout_email or not scout_pwd:
        print('❌ Set SCOUT_EMAIL and SCOUT_PASSWORD in .env')
        sys.exit(1)

    # Get campaign and user info from environment or args
    campaign_id = os.getenv('CAMPAIGN_ID') or (sys.argv[1] if len(sys.argv) > 1 else None)
    user_id = os.getenv('USER_ID') or (sys.argv[2] if len(sys.argv) > 2 else None)
    
    if not campaign_id or not user_id:
        print('❌ Provide CAMPAIGN_ID and USER_ID as environment variables or command line arguments')
        sys.exit(1)

    batch_size = int(os.getenv('ENRICH_BATCH', '50'))

    # 1) Fetch profiles that need enrichment
    profiles = fetch_profiles_to_enrich(limit=batch_size)
    if not profiles:
        print('✅ No pending profiles to enrich (all flagged as processed)')
        return

    print(f'📧 Processing {len(profiles)} profiles individually via FinalScout...')
    
    # Initialize FinalScout
    fs = FinalScoutExtractor(scout_email, scout_pwd, headless=headless)
    fs.setup_driver()
    fs.login_to_finalscout()

    processed_urls = []
    success_count = 0
    
    try:
        # Process each contact individually
        for i, profile in enumerate(profiles, 1):
            print(f"\n📝 Processing contact {i}/{len(profiles)}")
            
            linkedin_url = profile.get('linkedin_url', '')
            if linkedin_url:
                processed_urls.append(linkedin_url)
            
            success = process_individual_contact(fs, profile, campaign_id, user_id)
            if success:
                success_count += 1
                
            # Small delay between contacts
            import time
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n⚠️ Process interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
    finally:
        fs.close()

    # Mark all attempted profiles as processed (even failures, so we don't retry them constantly)
    if processed_urls:
        try:
            updated = mark_profiles_enriched(processed_urls)
            print(f'🏁 Flagged {updated} profiles as attempted')
        except Exception as e:
            print(f'⚠️ Could not mark profiles as attempted: {e}')
    
    print(f"\n📊 Final Results:")
    print(f"   Total processed: {len(profiles)}")
    print(f"   Successfully enriched: {success_count}")
    print(f"   Failed: {len(profiles) - success_count}")

if __name__ == '__main__':
    main()