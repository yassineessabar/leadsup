# pipeline/individual_enrichment.py
"""
Individual contact enrichment functions for processing contacts one by one
"""
import os
import time
from datetime import datetime, timezone
from typing import Dict, Optional
import requests
from urllib.parse import quote

# Import supabase config from supabase_manager
from .supabase_manager import (
    SUPABASE_URL, 
    HEADERS, 
    CONTACTS_TABLE,
    PROFILES_TABLE
)

def finalscout_fetch_profile(fs, linkedin_url: str) -> Dict:
    """
    Fetch basic profile information including email from FinalScout
    """
    try:
        # Use the basic email extraction function
        result = fs.extract_email(linkedin_url)
        
        if result.get('success'):
            return {
                'email': result.get('email'),
                'email_confidence': result.get('email_confidence', 'High'),
                'linkedin_url': linkedin_url
            }
        else:
            return {
                'email': 'Not found',
                'email_confidence': 'None',
                'linkedin_url': linkedin_url
            }
    except Exception as e:
        print(f"❌ Error fetching profile for {linkedin_url}: {str(e)}")
        return {
            'email': 'Not found',
            'email_confidence': 'None',
            'linkedin_url': linkedin_url
        }

def finalscout_fetch_emails(fs, linkedin_url: str, full_name: str = "") -> Dict:
    """
    Fetch additional email information and validation details
    """
    try:
        # Try to get more detailed email info from contacts page
        details = fs.fetch_full_contact_details_by_linkedin(linkedin_url, full_name)
        
        # After getting contact details, return to LinkedIn finder for next email extraction
        fs.return_to_linkedin_finder()
        
        if details:
            return {
                'email_type': details.get('email_type', ''),
                'privacy': details.get('privacy_label', 'Normal'),
                'source_detail': details.get('source_detail', 'FinalScout')
            }
        else:
            return {
                'email_type': '',
                'privacy': 'Normal',
                'source_detail': 'FinalScout'
            }
    except Exception as e:
        print(f"❌ Error fetching email details for {full_name}: {str(e)}")
        # Make sure we return to LinkedIn finder even on error
        fs.return_to_linkedin_finder()
        return {
            'email_type': '',
            'privacy': 'Normal', 
            'source_detail': 'FinalScout'
        }

def finalscout_fetch_company(fs, linkedin_url: str, full_name: str = "") -> Dict:
    """
    Fetch company information from FinalScout
    """
    try:
        # Try to get company details from the contact modal
        details = fs.fetch_full_contact_details_by_linkedin(linkedin_url, full_name)
        
        # After getting contact details, return to LinkedIn finder for next email extraction
        fs.return_to_linkedin_finder()
        
        if details:
            return {
                'company': details.get('company', ''),
                'title': details.get('title', ''),
                'industry': details.get('industry', ''),
                'location': details.get('location', ''),
                'website': details.get('website', ''),
                'company_city': details.get('company_city', ''),
                'company_state': details.get('company_state', ''),
                'company_country': details.get('company_country', ''),
                'company_postal_code': details.get('company_postal_code', ''),
                'company_raw_address': details.get('company_raw_address', ''),
                'company_phone': details.get('company_phone', ''),
                'company_domain': details.get('company_domain', ''),
                'company_linkedin': details.get('company_linkedin', ''),
                'company_staff_count': details.get('company_staff_count', '')
            }
        else:
            return {}
    except Exception as e:
        print(f"❌ Error fetching company info for {full_name}: {str(e)}")
        # Make sure we return to LinkedIn finder even on error
        fs.return_to_linkedin_finder()
        return {}

def finalscout_fetch_socials(fs, linkedin_url: str, full_name: str = "") -> Dict:
    """
    Fetch social media profiles and avatar from FinalScout
    """
    try:
        # Try to get social/avatar details from the contact modal
        details = fs.fetch_full_contact_details_by_linkedin(linkedin_url, full_name)
        
        # After getting contact details, return to LinkedIn finder for next email extraction
        fs.return_to_linkedin_finder()
        
        if details:
            return {
                'image_url': details.get('avatar_url', ''),  # Map avatar_url to image_url
                'linkedin': details.get('linkedin', linkedin_url),  # Ensure LinkedIn URL is captured
                'contact_created_at_ts': details.get('contact_created_at_ts'),
                'contact_latest_update_ts': details.get('contact_latest_update_ts')
            }
        else:
            return {
                'image_url': '',
                'linkedin': linkedin_url
            }
    except Exception as e:
        print(f"❌ Error fetching social info for {full_name}: {str(e)}")
        # Make sure we return to LinkedIn finder even on error
        fs.return_to_linkedin_finder()
        return {
            'image_url': '',
            'linkedin': linkedin_url
        }

def upsert_contact_enrichment(contact_data: Dict) -> Optional[str]:
    """
    Upsert enriched contact data to the database
    
    Returns:
        str: Contact ID if successful, None if failed
    """
    try:
        # Extract and clean up the data
        email = (contact_data.get('email') or '').strip()
        if not email or email.lower() == 'not found' or '@' not in email:
            print("❌ Cannot save contact without valid email")
            return None
        
        # Get user and campaign IDs
        user_id = contact_data.get('user_id')
        campaign_id = contact_data.get('campaign_id') 
        
        if not user_id or not campaign_id:
            print("❌ Cannot save contact without user_id and campaign_id")
            return None
        
        # Parse name
        full_name = contact_data.get('full_name', '')
        parts = full_name.split() if full_name else []
        first_name = contact_data.get('first_name') or (parts[0] if parts else '')
        last_name = contact_data.get('last_name') or (' '.join(parts[1:]) if len(parts) > 1 else '')
        
        # Map email confidence to status
        confidence = contact_data.get('email_confidence', 'Unknown')
        email_status = {
            'High': 'Valid',
            'Medium': 'Risky', 
            'Low': 'Risky',
            'None': 'Not found'
        }.get(confidence, 'Unknown')
        
        # Build the contact payload
        contact_payload = {
            'user_id': user_id,
            'campaign_id': campaign_id,
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'email_status': email_status,
            'privacy': contact_data.get('privacy', 'Normal'),
            'tags': contact_data.get('tags', ''),
            'linkedin': contact_data.get('linkedin') or contact_data.get('linkedin_url', ''),
            'title': contact_data.get('title') or contact_data.get('headline', ''),
            'location': contact_data.get('location', ''),
            'company': contact_data.get('company', ''),
            'industry': contact_data.get('industry') or contact_data.get('search_industry', ''),
            'website': contact_data.get('website', ''),
            'email_type': contact_data.get('email_type', ''),
            'source_detail': contact_data.get('source_detail', 'FinalScout'),
            'company_city': contact_data.get('company_city', ''),
            'company_state': contact_data.get('company_state', ''),
            'company_country': contact_data.get('company_country', ''),
            'company_postal_code': contact_data.get('company_postal_code', ''),
            'company_raw_address': contact_data.get('company_raw_address', ''),
            'company_phone': contact_data.get('company_phone', ''),
            'company_domain': contact_data.get('company_domain', ''),
            'company_linkedin': contact_data.get('company_linkedin', ''),
            'company_staff_count': contact_data.get('company_staff_count', ''),
            'contact_created_at_ts': contact_data.get('contact_created_at_ts'),
            'contact_latest_update_ts': contact_data.get('contact_latest_update_ts'),
            'image_url': contact_data.get('image_url', ''),
            'note': f"Source: {contact_data.get('source_detail', 'FinalScout')}. Search: {contact_data.get('search_keyword', '')} in {contact_data.get('search_location', '')}"
        }
        
        # Upsert to database
        url = f"{SUPABASE_URL}/rest/v1/{CONTACTS_TABLE}?on_conflict=user_id,campaign_id,email"
        headers = {**HEADERS, 'Prefer': 'resolution=merge-duplicates,return=representation'}
        
        response = requests.post(url, headers=headers, json=[contact_payload], timeout=60)
        
        if response.status_code in [200, 201]:
            result = response.json()
            if result:
                contact_id = result[0].get('id')
                return str(contact_id) if contact_id else 'saved'
            return 'saved'
        else:
            print(f"❌ Failed to upsert contact: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error upserting contact: {str(e)}")
        return None

def mark_contact_enriched(linkedin_url: str) -> bool:
    """
    Mark a contact as enriched in the profiles table
    
    Returns:
        bool: True if successful, False if failed
    """
    try:
        if not linkedin_url:
            return False
            
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        
        url = f"{SUPABASE_URL}/rest/v1/{PROFILES_TABLE}?linkedin_url=eq.{quote(linkedin_url, safe='')}"
        
        response = requests.patch(
            url,
            headers=HEADERS,
            json={"is_enriched": True, "enriched_at": ts},
            timeout=30
        )
        
        if response.status_code in [200, 204]:
            return True
        else:
            print(f"❌ Failed to mark profile as enriched: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error marking profile as enriched: {str(e)}")
        return False