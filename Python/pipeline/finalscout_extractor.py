# pipeline/finalscout_extractor.py
import time, re
from urllib.parse import urlencode, urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


class FinalScoutExtractor:
    """
    FinalScout automation:
      - extract_email(linkedin_url): single lookup on Find > LinkedIn Email
      - bulk_extract_emails(profiles): batch wrapper
      - fetch_contact_by_url(url): open Contacts page with ?contact=<id> and scrape modal (incl. avatar)
      - fetch_full_contact_details_by_linkedin(linkedin_url, name_keyword): find contact in Contacts by LinkedIn URL
      - fetch_full_contact_details(name_keyword, visible_name_to_click): fallback: search by name then click first match
    All detail scrapers return a dict with normalized keys and "avatar_url" if present.
    """

    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.driver = None
        self.base_url = "https://finalscout.com"

    # ---------- browser/session ----------

    def setup_driver(self):
        opts = Options()
        if self.headless:
            opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--user-agent=Mozilla/5.0")
        self.driver = webdriver.Chrome(options=opts)
        print("✅ FinalScout Chrome driver initialized")

    def login_to_finalscout(self):
        login_url = f"{self.base_url}/account/signin?type=email&next=%2Fapp%2Ffind%2Flinkedin"
        self.driver.get(login_url)
        WebDriverWait(self.driver, 15).until(
            EC.presence_of_element_located((By.ID, "input_email"))
        ).send_keys(self.email)
        self.driver.find_element(By.ID, "input_password").send_keys(self.password)
        self.driver.find_element(By.ID, "submit_form").click()
        time.sleep(5)
        # land on LinkedIn finder (keeps session alive)
        self.driver.get(f"{self.base_url}/app/find/linkedin")
        print("✅ Logged into FinalScout")

    def close(self):
        if self.driver:
            self.driver.quit()
            print("✅ FinalScout browser closed")

    # ---------- email extraction (finder) ----------

    def extract_email(self, profile_url: str):
        """Single LinkedIn → email lookup on Find > LinkedIn Email."""
        try:
            li_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "input[placeholder^='https://www.linkedin.com/in/']")
                )
            )
            li_input.clear()
            li_input.send_keys(profile_url)
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.btn-primary.btn-promise"))
            ).click()
            time.sleep(8)
            result_div = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.finder-result"))
            )
            text = result_div.text.strip()
            email = text.split()[0] if "@" in text else "Not found"
            return {
                "email": email,
                "email_confidence": "High" if email != "Not found" else "None",
                "success": email != "Not found",
            }
        except TimeoutException:
            return {"email": "Not found", "email_confidence": "None", "success": False, "error": "Timeout"}
        except Exception as e:
            return {"email": "Not found", "email_confidence": "None", "success": False, "error": str(e)}

    def bulk_extract_emails(self, profiles):
        out = []
        for i, p in enumerate(profiles, 1):
            url = p.get("linkedin_url", "")
            if not url:
                out.append(p)
                continue
            print(f"🔎 [{i}/{len(profiles)}] {url}")
            res = self.extract_email(url)
            enriched = {**p, **res}
            out.append(enriched)
            time.sleep(2)
        return out

    # ---------- contacts modal scraping ----------

    def _wait_for_modal(self, timeout=12):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#contact_detail_modal___BV_modal_body_"))
        )

    def _find_avatar_url(self, container) -> str:
        """Extract avatar image URL if present; returns '' for initials-only avatars."""
        # Case 1: explicit <img>
        try:
            img = container.find_element(By.CSS_SELECTOR, ".b-avatar-img img, img.b-avatar-img, img.avatar, .b-avatar img")
            src = (img.get_attribute("src") or "").strip()
            if src:
                return src
        except Exception:
            pass
        # Case 2: CSS background-image on .b-avatar / .b-avatar-img
        try:
            avatar = container.find_element(By.CSS_SELECTOR, ".b-avatar, .b-avatar-img")
            style = (avatar.get_attribute("style") or "")
            m = re.search(r"background-image\s*:\s*url\((['\"]?)(.*?)\1\)", style, re.IGNORECASE)
            if m:
                return m.group(2).strip()
        except Exception:
            pass
        return ""

    def _extract_modal_key_values(self) -> dict:
        """Parse <dt>/<dd> pairs in the contact modal; normalize keys; include avatar_url."""
        data = {}
        try:
            body = self._wait_for_modal()
            data["avatar_url"] = self._find_avatar_url(body)

            dts = body.find_elements(By.TAG_NAME, "dt")
            dds = body.find_elements(By.TAG_NAME, "dd")
            key_map = {
                "first name": "first_name", "last name": "last_name", "full name": "full_name",
                "email": "email", "email type": "email_type", "linkedin": "linkedin",
                "source": "source_detail", "privacy": "privacy_label", "title": "title",
                "company": "company", "website": "website", "location": "location", "industry": "industry",
                "company city": "company_city", "company state": "company_state",
                "company country": "company_country", "company postal code": "company_postal_code",
                "company raw address": "company_raw_address", "company phone": "company_phone",
                "company domain": "company_domain", "company linkedin": "company_linkedin",
                "company staff count": "company_staff_count", "created at": "contact_created_at_ts",
                "latest update": "contact_latest_update_ts",
            }
            for i in range(min(len(dts), len(dds))):
                label = dts[i].text.strip().lower().rstrip(":")
                val_el = dds[i]
                try:
                    a = val_el.find_element(By.TAG_NAME, "a")
                    value = a.get_attribute("href") or a.text.strip()
                except Exception:
                    value = val_el.text.strip()
                key = key_map.get(label, label.replace(" ", "_"))
                data[key] = value
        except Exception:
            pass
        return data

    # A) Direct URL with ?contact=<id>
    def fetch_contact_by_url(self, contact_url: str) -> dict:
        self.driver.get(contact_url)
        time.sleep(2)
        details = {}
        
        # if modal auto-shows:
        try:
            self._wait_for_modal(timeout=8)
            details = self._extract_modal_key_values()
            if details.get("email"):
                details.setdefault("email_confidence", "High")
        except Exception:
            # else click the row by id if present
            try:
                cid = parse_qs(urlparse(contact_url).query).get("contact", [None])[0]
                if cid:
                    selectors = [
                        f"tr[data-id='{cid}'] span.font-weight-bold.text-primary.text-link",
                        f"a[href*='contact={cid}'] span.font-weight-bold.text-primary.text-link",
                        f"a[href*='contact={cid}']",
                    ]
                    for sel in selectors:
                        elems = self.driver.find_elements(By.CSS_SELECTOR, sel)
                        if elems:
                            self.driver.execute_script("arguments[0].click();", elems[0])
                            break
                    self._wait_for_modal(timeout=8)
                    details = self._extract_modal_key_values()
                    if details.get("email"):
                        details.setdefault("email_confidence", "High")
            except Exception:
                # fallback: click first result
                try:
                    first = WebDriverWait(self.driver, 8).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "span.font-weight-bold.text-primary.text-link"))
                    )
                    self.driver.execute_script("arguments[0].click();", first)
                    self._wait_for_modal(timeout=8)
                    details = self._extract_modal_key_values()
                    if details.get("email"):
                        details.setdefault("email_confidence", "High")
                except Exception:
                    pass
        
        # Don't navigate back here - let calling code decide where to go
        return details

    # B) Match by LinkedIn URL in the contacts list
    def fetch_full_contact_details_by_linkedin(self, linkedin_url: str, name_keyword: str = "") -> dict:
        params = {"keywords": name_keyword or "", "privacy": "0"}
        self.driver.get(f"{self.base_url}/app/contacts/?{urlencode(params)}")
        time.sleep(2)
        details = {}
        try:
            rows = self.driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
            for row in rows:
                try:
                    lnks = row.find_elements(By.CSS_SELECTOR, "a[href*='linkedin.com']")
                    if any(linkedin_url.split("?")[0] in (a.get_attribute("href") or "") for a in lnks):
                        name_node = row.find_element(By.CSS_SELECTOR, "span.font-weight-bold.text-primary.text-link")
                        self.driver.execute_script("arguments[0].click();", name_node)
                        self._wait_for_modal(timeout=8)
                        details = self._extract_modal_key_values()
                        if details.get("email"):
                            details.setdefault("email_confidence", "High")
                        break
                except Exception:
                    continue
        except Exception:
            pass
        
        # Don't navigate back here - let calling code decide where to go
        return details

    # C) Fallback: search by name then click
    def open_contacts_search(self, name_keyword: str):
        params = {"cursor": "", "keywords": name_keyword, "privacy": "0"}
        self.driver.get(f"{self.base_url}/app/contacts/?{urlencode(params)}")
        time.sleep(3)

    def click_contact_by_visible_name(self, visible_name: str) -> bool:
        nodes = self.driver.find_elements(By.CSS_SELECTOR, "span.font-weight-bold.text-primary.text-link")
        for n in nodes:
            try:
                if n.text.strip().lower() == visible_name.strip().lower():
                    self.driver.execute_script("arguments[0].click();", n)
                    return True
            except Exception:
                continue
        return False

    def close_modal_if_open(self):
        """Close any open modal dialog"""
        try:
            # Try to find and click the close button on the modal
            close_buttons = self.driver.find_elements(By.CSS_SELECTOR, ".modal-header .close, .btn-close, [data-dismiss='modal'], .modal .close")
            if close_buttons:
                self.driver.execute_script("arguments[0].click();", close_buttons[0])
                time.sleep(1)
        except Exception:
            # If modal close fails, press Escape key
            try:
                from selenium.webdriver.common.keys import Keys
                self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
                time.sleep(1)
            except Exception:
                pass

    def return_to_contacts_search(self):
        """Navigate back to the contacts search page"""
        try:
            # Close any open modal first
            self.close_modal_if_open()
            
            # Navigate to contacts search page
            self.driver.get(f"{self.base_url}/app/contacts/")
            time.sleep(2)
        except Exception as e:
            print(f"⚠️ Error returning to contacts search: {str(e)}")

    def return_to_linkedin_finder(self):
        """Navigate back to the LinkedIn email finder page"""
        try:
            # Close any open modal first
            self.close_modal_if_open()
            
            # Navigate to LinkedIn finder page
            self.driver.get(f"{self.base_url}/app/find/linkedin")
            time.sleep(2)
        except Exception as e:
            print(f"⚠️ Error returning to LinkedIn finder: {str(e)}")

    def fetch_full_contact_details(self, name_keyword: str, visible_name_to_click: str = None) -> dict:
        self.open_contacts_search(name_keyword)
        time.sleep(2)
        clicked = False
        if visible_name_to_click:
            clicked = self.click_contact_by_visible_name(visible_name_to_click)
        if not clicked:
            try:
                first = WebDriverWait(self.driver, 8).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "span.font-weight-bold.text-primary.text-link"))
                )
                self.driver.execute_script("arguments[0].click();", first)
            except Exception:
                return {}
        time.sleep(1.5)
        details = self._extract_modal_key_values()
        if details.get("email"):
            details.setdefault("email_confidence", "High")
        
        # Don't navigate back here - let calling code decide where to go
        return details
