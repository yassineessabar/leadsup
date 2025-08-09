#!/usr/bin/env python3
"""
Instantly API Uploader
Handles uploading leads to Instantly.ai platform
"""
import requests
import json
import time
from typing import List, Dict, Optional
from datetime import datetime


class InstantlyUploader:
    def __init__(self, api_key: str, workspace_id: str):
        """
        Initialize Instantly uploader

        Args:
            api_key: Your Instantly API key
            workspace_id: Your Instantly workspace ID
        """
        self.api_key = api_key
        self.workspace_id = workspace_id
        self.base_url = "https://api.instantly.ai/api/v2"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "LinkedInLeadGenerator/1.0"
        })

    def test_connection(self) -> bool:
        """Test if API credentials are working"""
        try:
            response = self.session.get(f"{self.base_url}/workspaces/current", timeout=30)
            if response.status_code == 200:
                workspace_data = response.json()
                print(f"✅ Connected to workspace: {workspace_data.get('name', 'Unknown')}")
                return True
            else:
                print(f"❌ API test failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Connection test failed: {str(e)}")
            return False

    def format_lead(self, profile: Dict) -> Dict:
        """
        Format a single profile for Instantly API v2
        Based on the API documentation, we need to send individual fields
        """
        # Ensure email is present and valid
        email = profile.get('email', '').strip()
        if not email or email == 'Not found' or '@' in email == False:
            return None  # Skip invalid emails

        full_name = profile.get('full_name', '')
        name_parts = full_name.split() if full_name else ['', '']

        # Build the lead object with API v2 expected fields
        lead = {
            "email": email,
            "first_name": name_parts[0] if len(name_parts) > 0 else '',
            "last_name": ' '.join(name_parts[1:]) if len(name_parts) > 1 else '',
        }

        # Add optional fields only if they have values
        if profile.get('linkedin_url'):
            lead["linkedin_url"] = profile['linkedin_url']

        if profile.get('headline'):
            lead["job_title"] = profile['headline']

        if profile.get('location'):
            lead["location"] = profile['location']

        # Extract company from headline
        headline = profile.get('headline', '')
        if ' at ' in headline:
            company_name = headline.split(' at ')[-1].strip()
            if company_name:
                lead["company_name"] = company_name
        elif ' @ ' in headline:
            company_name = headline.split(' @ ')[-1].strip()
            if company_name:
                lead["company_name"] = company_name

        # Add custom variables - Instantly expects simple key-value pairs
        custom_vars = {}

        # Only add variables that have meaningful values
        if profile.get('search_keyword'):
            custom_vars['search_keyword'] = str(profile['search_keyword'])
        if profile.get('search_location'):
            custom_vars['search_location'] = str(profile['search_location'])
        if profile.get('search_industry'):
            custom_vars['search_industry'] = str(profile['search_industry'])
        if profile.get('connection_degree'):
            custom_vars['connection_degree'] = str(profile['connection_degree'])
        if profile.get('email_confidence'):
            custom_vars['email_confidence'] = str(profile['email_confidence'])

        # Add timestamp
        custom_vars['imported_date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if custom_vars:
            lead['custom_variables'] = custom_vars

        return lead

    def upload_leads(self, profiles: List[Dict], batch_size: int = 100) -> Dict:
        """
        Upload leads to Instantly

        Args:
            profiles: List of profile dictionaries
            batch_size: Number of leads per batch (max 1000)

        Returns:
            Upload result dictionary
        """
        # Filter profiles that have valid emails
        valid_profiles = [
            p for p in profiles
            if p.get('email') and p.get('email') != 'Not found' and '@' in p.get('email', '')
        ]

        if not valid_profiles:
            return {
                "success": False,
                "error": "No profiles with valid emails to upload",
                "total_profiles": len(profiles),
                "valid_profiles": 0,
                "uploaded": 0
            }

        print(f"📊 Total profiles: {len(profiles)}")
        print(f"📊 Valid emails: {len(valid_profiles)}")

        # Format leads for Instantly - filter out None values
        formatted_leads = []
        for profile in valid_profiles:
            formatted_lead = self.format_lead(profile)
            if formatted_lead:  # Only add if formatting was successful
                formatted_leads.append(formatted_lead)
            else:
                print(f"⚠️ Skipped profile with invalid email: {profile.get('email', 'N/A')}")

        if not formatted_leads:
            return {
                "success": False,
                "error": "No leads passed validation after formatting",
                "total_profiles": len(profiles),
                "valid_profiles": len(valid_profiles),
                "uploaded": 0
            }

        print(f"📊 Formatted leads: {len(formatted_leads)}")

        # Debug: Print first lead to check format
        if formatted_leads:
            print(f"🔍 Sample lead format: {json.dumps(formatted_leads[0], indent=2)}")

        # Upload in batches
        total_uploaded = 0
        total_failed = 0

        for i in range(0, len(formatted_leads), batch_size):
            batch = formatted_leads[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(formatted_leads) + batch_size - 1) // batch_size

            print(f"\n📤 Uploading batch {batch_num}/{total_batches} ({len(batch)} leads)...")

            result = self._upload_batch(batch)

            if result['success']:
                total_uploaded += result['uploaded']
                print(f"✅ Batch {batch_num} uploaded successfully")
            else:
                total_failed += len(batch)
                print(f"❌ Batch {batch_num} failed: {result['error']}")

                # Debug: Show the request that failed
                print(f"🔍 Failed request payload sample: {json.dumps(batch[0] if batch else {}, indent=2)}")

            # Rate limiting - small delay between batches
            if i + batch_size < len(formatted_leads):
                time.sleep(2)

        success = total_uploaded > 0

        return {
            "success": success,
            "total_profiles": len(profiles),
            "valid_profiles": len(valid_profiles),
            "uploaded": total_uploaded,
            "failed": total_failed,
            "dashboard_url": f"https://app.instantly.ai/app/{self.workspace_id}/leads"
        }

    def _upload_batch(self, leads: List[Dict]) -> Dict:
        """Upload a single batch of leads - one by one since API v2 creates single leads"""
        uploaded_count = 0
        failed_count = 0
        last_error = ""

        for i, lead_data in enumerate(leads, 1):
            try:
                print(f"  📤 Uploading lead {i}/{len(leads)}: {lead_data.get('email', 'No email')}")

                # Create single lead - API v2 expects single lead object, not array
                response = self.session.post(
                    f"{self.base_url}/leads",
                    json=lead_data,  # Send single lead object directly
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    uploaded_count += 1
                    print(f"    ✅ Success")
                else:
                    failed_count += 1
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    last_error = error_msg
                    print(f"    ❌ Failed: {error_msg}")

                # Small delay between individual leads
                if i < len(leads):
                    time.sleep(0.5)

            except requests.exceptions.Timeout:
                failed_count += 1
                last_error = "Request timeout"
                print(f"    ❌ Timeout")
            except requests.exceptions.RequestException as e:
                failed_count += 1
                last_error = f"Network error: {str(e)}"
                print(f"    ❌ Network error: {str(e)}")
            except Exception as e:
                failed_count += 1
                last_error = f"Unexpected error: {str(e)}"
                print(f"    ❌ Unexpected error: {str(e)}")

        success = uploaded_count > 0

        return {
            "success": success,
            "uploaded": uploaded_count,
            "failed": failed_count,
            "error": last_error if failed_count > 0 else None
        }

    def get_leads(self, limit: int = 100) -> List[Dict]:
        """
        Get existing leads from Instantly

        Args:
            limit: Maximum number of leads to retrieve

        Returns:
            List of lead dictionaries
        """
        try:
            params = {
                "workspace_id": self.workspace_id,
                "limit": limit
            }

            response = self.session.get(
                f"{self.base_url}/leads",
                params=params,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('leads', [])
            else:
                print(f"❌ Failed to get leads: {response.status_code} - {response.text}")
                return []

        except Exception as e:
            print(f"❌ Error getting leads: {str(e)}")
            return []

    def export_to_csv(self, profiles: List[Dict], filename: str = None) -> str:
        """
        Export profiles to CSV file before uploading

        Args:
            profiles: List of profile dictionaries
            filename: Output filename (optional)

        Returns:
            Filename of created CSV
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"linkedin_leads_{timestamp}.csv"

        try:
            import csv

            # Filter valid profiles
            valid_profiles = [
                p for p in profiles
                if p.get('email') and p.get('email') != 'Not found'
            ]

            if not valid_profiles:
                print("❌ No valid profiles to export")
                return ""

            with open(filename, 'w', newline='', encoding='utf-8') as f:
                fieldnames = [
                    'full_name', 'email', 'email_confidence', 'linkedin_url',
                    'headline', 'location', 'search_keyword', 'search_location',
                    'search_industry', 'connection_degree', 'image_url'
                ]

                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for profile in valid_profiles:
                    writer.writerow({
                        'full_name': profile.get('full_name', ''),
                        'email': profile.get('email', ''),
                        'email_confidence': profile.get('email_confidence', ''),
                        'linkedin_url': profile.get('linkedin_url', ''),
                        'headline': profile.get('headline', ''),
                        'location': profile.get('location', ''),
                        'search_keyword': profile.get('search_keyword', ''),
                        'search_location': profile.get('search_location', ''),
                        'search_industry': profile.get('search_industry', ''),
                        'connection_degree': profile.get('connection_degree', ''),
                        'image_url': profile.get('image_url', '')
                    })

            print(f"✅ Exported {len(valid_profiles)} profiles to {filename}")
            return filename

        except Exception as e:
            print(f"❌ Export failed: {str(e)}")
            return ""


def main():
    """Test the Instantly uploader with sample data"""
    import os

    # Load environment variables
    api_key = os.getenv('INSTANTLY_API_KEY')
    workspace_id = os.getenv('INSTANTLY_WORKSPACE_ID')

    if not api_key or not workspace_id:
        print("❌ Please set INSTANTLY_API_KEY and INSTANTLY_WORKSPACE_ID environment variables")
        return

    uploader = InstantlyUploader(api_key, workspace_id)

    # Test connection
    if uploader.test_connection():
        print("✅ Instantly API connection test passed")

        # Sample data for testing
        sample_profiles = [
            {
                'full_name': 'John Doe',
                'email': 'john.doe@example.com',
                'linkedin_url': 'https://linkedin.com/in/johndoe',
                'headline': 'CEO at TechCorp',
                'location': 'San Francisco, CA',
                'search_keyword': 'ceo',
                'email_confidence': 'High'
            }
        ]

        print(f"\n📤 Testing upload with {len(sample_profiles)} sample profile(s)...")
        # Uncomment to test actual upload:
        # result = uploader.upload_leads(sample_profiles)
        # print(f"Upload result: {result}")
    else:
        print("❌ Instantly API connection test failed")


if __name__ == "__main__":
    main()