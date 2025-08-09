import csv
import os
import time
from typing import Dict, List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


class ScoutEmailExtractor:
    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.driver = None
        self.base_url = "https://finalscout.com"

    def setup_driver(self):
        """Initialize Chrome driver with options"""
        options = Options()
        if self.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

        self.driver = webdriver.Chrome(options=options)
        print("✅ Chrome driver initialized for Scout")

    def login_to_finalscout(self):
        """Login to FinalScout and remove overlay if needed"""
        try:
            login_url = f"{self.base_url}/account/signin?type=email&next=%2Fapp%2Ffind%2Flinkedin"
            self.driver.get(login_url)

            email_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "input_email"))
            )
            email_field.send_keys(self.email)

            password_field = self.driver.find_element(By.ID, "input_password")
            password_field.send_keys(self.password)

            submit_button = self.driver.find_element(By.ID, "submit_form")
            submit_button.click()

            time.sleep(5)
            self.driver.get(f"{self.base_url}/app/find/linkedin")

            # Remove modal/overlay if present
            try:
                modal = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.ID, "install_plugin_modal___BV_modal_content_"))
                )
                overlay = self.driver.find_element(By.CLASS_NAME, "modal-backdrop")
                self.driver.execute_script(
                    "arguments[0].style.display = 'none'; arguments[1].style.display = 'none';",
                    modal, overlay
                )
                print("✅ Modal/overlay removed")
            except:
                print("✅ No modal/overlay to close")

            print("✅ Successfully logged into FinalScout")

        except Exception as e:
            print(f"❌ FinalScout login failed: {str(e)}")
            raise

    def extract_email(self, profile_url: str) -> Dict:
        """Search profile URL on FinalScout and return found email or 'Not found'"""
        try:
            # Find and clear the LinkedIn input field
            linkedin_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "input[placeholder='https://www.linkedin.com/in/joe-doe-0a1b2c3/']"))
            )
            linkedin_input.clear()
            linkedin_input.send_keys(profile_url)

            # Click search button
            search_button = WebDriverWait(self.driver, 13).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.btn-primary.btn-promise"))
            )
            self.driver.execute_script("arguments[0].click();", search_button)
            time.sleep(8)

            # Get result
            result_div = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.finder-result"))
            )

            result_text = result_div.text.strip()
            email = result_text.split()[0] if result_text and '@' in result_text else "Not found"

            return {
                "email": email,
                "email_confidence": "High" if email != "Not found" else "None",
                "success": email != "Not found"
            }

        except TimeoutException:
            print(f"⏱️ Timeout for: {profile_url}")
            return {
                "email": "Not found",
                "email_confidence": "None",
                "success": False,
                "error": "Timeout"
            }
        except Exception as e:
            print(f"❌ Error for {profile_url}: {e}")
            return {
                "email": "Not found",
                "email_confidence": "None",
                "success": False,
                "error": str(e)
            }

    def bulk_extract(self, profiles: List[Dict]) -> List[Dict]:
        """Extract emails for multiple LinkedIn profiles"""
        results = []

        for i, profile in enumerate(profiles, 1):
            profile_url = profile.get("linkedin_url", "")
            if not profile_url:
                print(f"⚠️ No LinkedIn URL found for profile {i}")
                continue

            print(f"\n🔎 [{i}/{len(profiles)}] Processing: {profile_url}")

            email_result = self.extract_email(profile_url)

            # Merge profile data with email result
            enriched_profile = {**profile, **email_result}
            results.append(enriched_profile)

            name = profile.get('full_name', 'Unknown')
            email = email_result['email']
            print(f"✅ Processed: {name} | {email}")

            # Small delay between requests
            time.sleep(2)

        return results

    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            print("✅ Scout browser closed")