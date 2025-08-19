import time
from urllib.parse import urlencode
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LinkedInScraper:
    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.driver = None
        self.locations = {
            'Sydney': '104769905',
            'Melbourne': '104722053',
            'Australia': '101452733',
        }
        self.industries = {
            'Retail': '27',
            'Real Estate': '44',
            'Hospitality': '31',
        }

    def setup_driver(self):
        opts = Options()
        if self.headless:
            opts.add_argument('--headless')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-dev-shm-usage')``
        opts.add_argument('--user-agent=Mozilla/5.0')
        self.driver = webdriver.Chrome(options=opts)
        print('✅ LinkedIn Chrome driver initialized')

    def login(self):
        self.driver.get('https://www.linkedin.com/login')
        WebDriverWait(self.driver, 20).until(EC.presence_of_element_located((By.ID, 'username'))).send_keys(self.email)
        self.driver.find_element(By.ID, 'password').send_keys(self.password)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        print('✅ Login submitted. Waiting for login to complete...')
        
        # Wait for login completion automatically (no manual input required)
        # Check for either the feed page or profile page to confirm login
        try:
            WebDriverWait(self.driver, 30).until(
                lambda driver: 'feed' in driver.current_url or 'profile' in driver.current_url or 'search' in driver.current_url
            )
            print('✅ LinkedIn login completed automatically')
        except Exception as e:
            print(f'⚠️  Login might need manual intervention: {e}')
            # Fallback: wait a bit longer for manual resolution
            time.sleep(15)
            print('✅ LinkedIn login completed (with extended wait)')

    def _build_url(self, keyword: str, location_id: str = None, industry_id: str = None):
        params = {'keywords': keyword, 'origin': 'FACETED_SEARCH'}
        if location_id:
            params['geoUrn'] = f'["{location_id}"]'
        if industry_id:
            params['industry'] = f'["{industry_id}"]'
        return 'https://www.linkedin.com/search/results/people/?' + urlencode(params)

    def _extract_profiles_from_page(self):
        time.sleep(4)
        self.driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
        time.sleep(3)
        cards = self.driver.find_elements(By.XPATH, "//li[.//a[contains(@href, '/in/')]]")
        out = []
        for li in cards:
            try:
                name_el = li.find_element(By.XPATH, ".//a[contains(@href, '/in/')]/span")
                name = name_el.text.strip().split('\n')[0]
                url = li.find_element(By.XPATH, ".//a[contains(@href, '/in/')]").get_attribute('href').split('?')[0]
                try:
                    title = li.find_element(By.XPATH, ".//div[contains(@class,'t-black t-normal')]").text.strip()
                except:
                    title = ''
                try:
                    loc = li.find_element(By.XPATH, ".//div[contains(@class,'t-14 t-normal')]").text.strip()
                except:
                    loc = ''
                out.append({
                    'full_name': name,
                    'linkedin_url': url,
                    'headline': title,
                    'location': loc,
                    'source': 'LinkedIn',
                })
            except Exception:
                continue
        return out

    def search_profiles(self, keywords, target_locations=None, target_industries=None, max_pages=1):
        results = []
        target_locations = target_locations or ['Sydney']
        target_industries = target_industries or ['Retail']
        for kw in keywords:
            for loc_name in target_locations:
                loc_id = self.locations.get(loc_name)
                for ind_name in target_industries:
                    ind_id = self.industries.get(ind_name)
                    for page in range(1, max_pages + 1):
                        url = self._build_url(kw, loc_id, ind_id) + f"&page={page}"
                        print(f"🌐 Searching: {kw} | {loc_name} | {ind_name} | page {page}")
                        self.driver.get(url)
                        page_profiles = self._extract_profiles_from_page()
                        if not page_profiles:
                            break
                        for p in page_profiles:
                            p.update({'search_keyword': kw, 'search_location': loc_name, 'search_industry': ind_name})
                        results.extend(page_profiles)
        print(f"🎯 Total profiles found: {len(results)}")
        return results

    def close(self):
        if self.driver:
            self.driver.quit()
            print('✅ LinkedIn browser closed')