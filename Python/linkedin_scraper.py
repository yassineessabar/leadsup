import csv
import time
import os
import random
from typing import List, Dict, Optional
from urllib.parse import urlencode
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LinkedInScraper:
    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.driver = None

        # Predefined locations and industries from your working code
        self.locations = {
            "Sydney": "104769905",
            "Greater Sydney": "90009524",
            "London": "90009496",
            "Australia": "101452733",
            "Brisbane": "104468365",
            "New York": "90000070",
            "Los Angeles": "90000049",
            "California": "102095887",
            "Boston": "102380872",
            "Philadelphia": "104937023",
            "San Francisco": "90000084",
            "Singapore": "102454443",
            "Melbourne": "104722053"
        }

        self.industries = {
            "Retail": "27",
            "Hospitality": "31",
            "Accommodation": "2190",
            "Higher Education": "68",
            "Education": "1999",
            "Food and Beverage": "34",
            "Fitness": "124",
            "Real Estate": "44",
            "Restaurant": "32",
            "Retail & Fashion": "19",
            "Medical Practices": "13",
            "Wellness": "124"
        }

    def setup_driver(self):
        """Initialize Chrome driver with options"""
        options = Options()
        if self.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

        self.driver = webdriver.Chrome(options=options)
        print("✅ Chrome driver initialized")

    def login(self):
        """Login to LinkedIn with manual CAPTCHA handling"""
        try:
            self.driver.get("https://www.linkedin.com/login")

            email_field = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            email_field.send_keys(self.email)

            password_field = self.driver.find_element(By.ID, "password")
            password_field.send_keys(self.password)

            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()

            print("✅ Login submitted. Please solve CAPTCHA/MFA manually in the browser.")
            input("⏳ Press ENTER when fully logged in and on the LinkedIn feed...")
            print("✅ LinkedIn login completed")

        except Exception as e:
            print(f"❌ Login failed: {str(e)}")
            raise

    def build_linkedin_url(self, keyword: str, location_id: str = None, industry_id: str = None) -> str:
        """Build LinkedIn search URL dynamically"""
        params = {
            "keywords": keyword,
            "origin": "FACETED_SEARCH",
        }
        if location_id:
            params["geoUrn"] = f"[\"{location_id}\"]"
        if industry_id:
            params["industry"] = f"[\"{industry_id}\"]"
        return "https://www.linkedin.com/search/results/people/?" + urlencode(params)

    def safe_get(self, url: str, retries: int = 3) -> bool:
        """Try loading a page with retries in case of timeout or failure"""
        for attempt in range(retries):
            try:
                self.driver.get(url)
                return True
            except Exception as e:
                print(f"⚠️ Error loading page (attempt {attempt + 1}): {e}")
                time.sleep(5)
        return False

    def extract_profiles_from_page(self) -> List[Dict]:
        """Extract all profiles from current LinkedIn search page"""
        time.sleep(random.uniform(4, 6))
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(3, 5))

        profiles = self.driver.find_elements(By.XPATH, "//li[.//a[contains(@href, '/in/')]]")
        if not profiles:
            return []

        extracted_profiles = []
        for profile in profiles:
            try:
                name_raw = profile.find_element(By.XPATH, ".//a[contains(@href, '/in/')]/span").text.strip()
                name = name_raw.split("\n")[0]

                full_url = profile.find_element(By.XPATH, ".//a[contains(@href, '/in/')]").get_attribute("href")
                profile_url = full_url.split('?')[0]  # clean URL

                title = profile.find_element(By.XPATH, ".//div[contains(@class,'t-black t-normal')]").text.strip()
                location = profile.find_element(By.XPATH, ".//div[contains(@class,'t-14 t-normal')]").text.strip()

                try:
                    image = profile.find_element(By.XPATH,
                                                 ".//img[contains(@class, 'ivm-view-attr__img--centered')]").get_attribute(
                        "src")
                except:
                    image = ""

                try:
                    connection = profile.find_element(By.XPATH,
                                                      ".//span[contains(text(), 'degree connection')]").text.strip()
                except:
                    connection = ""

                profile_data = {
                    "full_name": name,
                    "linkedin_url": profile_url,
                    "headline": title,
                    "location": location,
                    "image_url": image,
                    "connection_degree": connection
                }

                extracted_profiles.append(profile_data)
                print(f"✅ {name} | {connection} | {title} | {location}")

            except Exception as e:
                print(f"❌ Error extracting profile: {e}")

        return extracted_profiles

    def search_profiles(self, keywords: List[str], target_locations: List[str] = None,
                        target_industries: List[str] = None, max_pages: int = 5) -> List[Dict]:
        """Search for LinkedIn profiles based on criteria"""
        all_profiles = []

        # Use provided locations or default to a few
        search_locations = target_locations or ["Sydney", "Melbourne"]
        search_industries = target_industries or ["Retail", "Real Estate"]

        try:
            for keyword in keywords:
                for location_name in search_locations:
                    location_id = self.locations.get(location_name)
                    if not location_id:
                        print(f"⚠️ Location '{location_name}' not found in predefined locations")
                        continue

                    for industry_name in search_industries:
                        industry_id = self.industries.get(industry_name)
                        if not industry_id:
                            print(f"⚠️ Industry '{industry_name}' not found in predefined industries")
                            continue

                        page = 1
                        while page <= max_pages:
                            url = self.build_linkedin_url(keyword, location_id, industry_id) + f"&page={page}"
                            print(f"\n🌐 Keyword: {keyword} | {location_name} | {industry_name} | Page {page}")

                            if not self.safe_get(url):
                                print(f"❌ Failed to load page {page}. Skipping...")
                                break

                            page_profiles = self.extract_profiles_from_page()
                            if not page_profiles:
                                print(
                                    f"❌ No more profiles for {keyword} - {location_name} - {industry_name}. Moving on.")
                                break

                            # Add metadata to each profile
                            for profile in page_profiles:
                                profile.update({
                                    "search_keyword": keyword,
                                    "search_location": location_name,
                                    "search_industry": industry_name
                                })

                            all_profiles.extend(page_profiles)
                            page += 1
                            time.sleep(random.uniform(5, 10))  # Random wait between pages

        except Exception as e:
            print(f"❌ Search failed: {str(e)}")

        print(f"🎯 Total profiles found: {len(all_profiles)}")
        return all_profiles

    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            print("✅ Browser closed")