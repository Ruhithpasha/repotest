"""
Test Website Settings 10-Tab Configuration & Training Academy Feature
Tests:
- 10 tabs: Navigation, Home, Diploma, Faculty, Admissions, About Us, Contact, Blog, Training Academy, Footer
- Training Academy tab has all required fields
- Public Training Academy page content
- Access control for non-super_admin users
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# 10 Tab sections as per requirements
SECTIONS_10_TABS = [
    'navigation',  # Navigation tab
    'home',        # Home tab
    'diploma',     # Diploma tab
    'faculty',     # Faculty tab
    'admissions',  # Admissions tab
    'about',       # About Us tab
    'contact',     # Contact tab
    'blog',        # Blog tab
    'academy',     # Training Academy tab
    'footer',      # Footer tab
]


class TestWebsiteSettingsAuth:
    """Authentication fixtures for Website Settings tests"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super_admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        """Get manager (non-super_admin) authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sales@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def super_admin_headers(self, super_admin_token):
        """Headers with super_admin auth"""
        return {
            "Authorization": f"Bearer {super_admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def manager_headers(self, manager_token):
        """Headers with manager auth"""
        return {
            "Authorization": f"Bearer {manager_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def sales_headers(self, sales_token):
        """Headers with sales auth"""
        return {
            "Authorization": f"Bearer {sales_token}",
            "Content-Type": "application/json"
        }


class TestAll10TabsAccessible(TestWebsiteSettingsAuth):
    """Test all 10 tabs are accessible via admin endpoint"""
    
    def test_super_admin_can_access_all_10_sections(self, super_admin_headers):
        """Super admin should be able to fetch all 10 sections"""
        for section in SECTIONS_10_TABS:
            response = requests.get(f"{BASE_URL}/api/admin/website-settings/{section}", headers=super_admin_headers)
            assert response.status_code == 200, f"Section '{section}' failed: {response.text}"
            data = response.json()
            assert data["section"] == section, f"Returned section mismatch for '{section}'"
        
        print(f"SUCCESS: All {len(SECTIONS_10_TABS)} tab sections accessible")
    
    def test_super_admin_can_update_all_10_sections(self, super_admin_headers):
        """Super admin should be able to update all 10 sections"""
        for section in SECTIONS_10_TABS:
            test_content = {
                "test_field": f"test_value_for_{section}",
                "timestamp": str(time.time())
            }
            response = requests.put(
                f"{BASE_URL}/api/admin/website-settings/{section}",
                headers=super_admin_headers,
                json={"content": test_content}
            )
            assert response.status_code == 200, f"Section '{section}' update failed: {response.text}"
        
        print(f"SUCCESS: All {len(SECTIONS_10_TABS)} tab sections updatable")


class TestTrainingAcademyTab(TestWebsiteSettingsAuth):
    """Test Training Academy tab has all required fields"""
    
    def test_academy_tab_can_store_page_title(self, super_admin_headers):
        """Academy tab should store Page Title"""
        content = {"page_title": "Our Training Academy"}
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        assert response.json()["content"]["page_title"] == "Our Training Academy"
        print("SUCCESS: Page Title field works")
    
    def test_academy_tab_can_store_page_subtitle(self, super_admin_headers):
        """Academy tab should store Page Subtitle"""
        content = {"page_subtitle": "State-of-the-art facilities"}
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        assert response.json()["content"]["page_subtitle"] == "State-of-the-art facilities"
        print("SUCCESS: Page Subtitle field works")
    
    def test_academy_tab_can_store_hero_image(self, super_admin_headers):
        """Academy tab should store Hero Image URL"""
        content = {"hero_image": "/uploads/website/academy-hero.jpg"}
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        assert response.json()["content"]["hero_image"] == "/uploads/website/academy-hero.jpg"
        print("SUCCESS: Hero Image field works")
    
    def test_academy_tab_can_store_description(self, super_admin_headers):
        """Academy tab should store Academy Introduction (description)"""
        content = {"description": "Experience world-class dental implant training at our purpose-built academy."}
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        assert "Experience world-class" in response.json()["content"]["description"]
        print("SUCCESS: Academy Introduction (description) field works")
    
    def test_academy_tab_can_store_highlights(self, super_admin_headers):
        """Academy tab should store Facility Highlights as array"""
        content = {
            "highlights": [
                {"title": "Modern Equipment", "description": "Latest dental implant systems", "icon": "🦷"},
                {"title": "Realistic Training", "description": "Phantom heads for practice", "icon": "🎯"}
            ]
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        highlights = response.json()["content"]["highlights"]
        assert len(highlights) == 2
        assert highlights[0]["title"] == "Modern Equipment"
        print("SUCCESS: Facility Highlights field works")
    
    def test_academy_tab_can_store_gallery(self, super_admin_headers):
        """Academy tab should store Academy Gallery as array"""
        content = {
            "gallery": [
                {"image": "/uploads/academy/room1.jpg", "caption": "Training Room 1", "description": "Main clinical area"},
                {"image": "/uploads/academy/room2.jpg", "caption": "Equipment Room", "description": "Latest technology"}
            ]
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        gallery = response.json()["content"]["gallery"]
        assert len(gallery) == 2
        assert gallery[0]["caption"] == "Training Room 1"
        print("SUCCESS: Academy Gallery field works")
    
    def test_academy_tab_can_store_sections(self, super_admin_headers):
        """Academy tab should store Training Sections as array"""
        content = {
            "sections": [
                {"title": "Clinical Training Room", "description": "State-of-the-art equipment", "image": "/uploads/academy/clinical.jpg"},
                {"title": "Lecture Theatre", "description": "For theoretical sessions", "image": "/uploads/academy/lecture.jpg"}
            ]
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        sections = response.json()["content"]["sections"]
        assert len(sections) == 2
        assert sections[0]["title"] == "Clinical Training Room"
        print("SUCCESS: Training Sections field works")
    
    def test_academy_tab_can_store_location_info(self, super_admin_headers):
        """Academy tab should store Location Information"""
        content = {
            "location_title": "Visit Our Academy",
            "address": "Rochester, United Kingdom",
            "location_description": "Conveniently located with easy access from London",
            "maps_embed": "https://www.google.com/maps/embed?pb=..."
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        data = response.json()["content"]
        assert data["location_title"] == "Visit Our Academy"
        assert data["address"] == "Rochester, United Kingdom"
        print("SUCCESS: Location Information fields work")
    
    def test_academy_tab_can_store_cta_button(self, super_admin_headers):
        """Academy tab should store CTA Button fields"""
        content = {
            "cta_button": "Book a Tour",
            "cta_url": "/contact"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert response.status_code == 200
        data = response.json()["content"]
        assert data["cta_button"] == "Book a Tour"
        assert data["cta_url"] == "/contact"
        print("SUCCESS: CTA Button fields work")
    
    def test_academy_full_content_save_and_retrieve(self, super_admin_headers):
        """Full Training Academy content should be saved and retrieved correctly"""
        full_content = {
            "page_title": "TEST Our Training Academy",
            "page_subtitle": "TEST State-of-the-art facilities",
            "hero_image": "/uploads/website/test-hero.jpg",
            "description": "TEST Experience world-class dental implant training.",
            "highlights": [
                {"title": "Modern Equipment", "description": "Latest systems", "icon": "🦷"},
            ],
            "gallery": [
                {"image": "/uploads/test.jpg", "caption": "Test Image", "description": "Test desc"}
            ],
            "sections": [
                {"title": "TEST Section", "description": "Test description", "image": "/uploads/test-sec.jpg"}
            ],
            "location_title": "TEST Visit Our Academy",
            "address": "TEST Rochester, UK",
            "location_description": "TEST Easy access",
            "maps_embed": "https://maps.google.com/test",
            "cta_button": "TEST Book Tour",
            "cta_url": "/test-contact"
        }
        
        # Save
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=super_admin_headers,
            json={"content": full_content}
        )
        assert response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/admin/website-settings/academy", headers=super_admin_headers)
        assert get_response.status_code == 200
        retrieved = get_response.json()["content"]
        
        assert retrieved["page_title"] == "TEST Our Training Academy"
        assert retrieved["page_subtitle"] == "TEST State-of-the-art facilities"
        assert len(retrieved["highlights"]) == 1
        assert len(retrieved["gallery"]) == 1
        assert len(retrieved["sections"]) == 1
        assert retrieved["cta_button"] == "TEST Book Tour"
        
        print("SUCCESS: Full Training Academy content persists correctly")


class TestPublicTrainingAcademyEndpoint:
    """Test public endpoint for Training Academy page"""
    
    def test_public_academy_endpoint_works_without_auth(self):
        """Public endpoint /api/website-settings/academy should work without auth"""
        response = requests.get(f"{BASE_URL}/api/website-settings/academy")
        assert response.status_code == 200, f"Public endpoint failed: {response.text}"
        data = response.json()
        assert data["section"] == "academy"
        print("SUCCESS: Public academy endpoint works without auth")
    
    def test_public_academy_returns_saved_content(self, super_admin_headers=None):
        """Public endpoint should return content saved by admin"""
        # First save some content (need to get token)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        test_content = {
            "page_title": "PUBLIC_TEST Training Academy",
            "description": "PUBLIC_TEST description content"
        }
        
        save_response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=headers,
            json={"content": test_content}
        )
        assert save_response.status_code == 200
        
        # Now fetch via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/website-settings/academy")
        assert public_response.status_code == 200
        public_data = public_response.json()
        
        assert public_data["content"]["page_title"] == "PUBLIC_TEST Training Academy"
        assert public_data["content"]["description"] == "PUBLIC_TEST description content"
        print("SUCCESS: Public endpoint returns saved content")


class TestAccessControlNonSuperAdmin(TestWebsiteSettingsAuth):
    """Test that non-super_admin users cannot access Website Settings"""
    
    def test_manager_cannot_access_website_settings(self, manager_headers):
        """Manager should get 403 Forbidden"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=manager_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Manager correctly blocked from Website Settings")
    
    def test_manager_cannot_update_website_settings(self, manager_headers):
        """Manager should not be able to update settings"""
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/academy",
            headers=manager_headers,
            json={"content": {"test": "should_fail"}}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Manager correctly blocked from updating settings")
    
    def test_sales_cannot_access_website_settings(self, sales_headers):
        """Sales user should get 403 Forbidden"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=sales_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Sales user correctly blocked from Website Settings")
    
    def test_no_auth_cannot_access_admin_settings(self):
        """Request without auth should get 401 Unauthorized"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("SUCCESS: No auth correctly blocked from admin settings")


class TestDataPersistence(TestWebsiteSettingsAuth):
    """Test that data persists after save"""
    
    def test_navigation_section_data_persists(self, super_admin_headers):
        """Navigation section data should persist"""
        content = {
            "site_name": "Plan4Growth Academy Test",
            "cta_text": "Apply Now Test",
            "nav_links": [{"label": "Test Link", "url": "/test", "order": 1}]
        }
        
        # Save
        save_response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/navigation",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert save_response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/admin/website-settings/navigation", headers=super_admin_headers)
        assert get_response.status_code == 200
        retrieved = get_response.json()["content"]
        assert retrieved["site_name"] == "Plan4Growth Academy Test"
        print("SUCCESS: Navigation section data persists")
    
    def test_home_section_data_persists(self, super_admin_headers):
        """Home section data should persist"""
        content = {
            "hero_title_1": "Level 7 Diploma in",
            "hero_title_2": "Dental Implantology",
            "hero_tags": [{"text": "EduQual-Approved"}]
        }
        
        save_response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/home",
            headers=super_admin_headers,
            json={"content": content}
        )
        assert save_response.status_code == 200
        
        get_response = requests.get(f"{BASE_URL}/api/admin/website-settings/home", headers=super_admin_headers)
        assert get_response.status_code == 200
        retrieved = get_response.json()["content"]
        assert retrieved["hero_title_2"] == "Dental Implantology"
        print("SUCCESS: Home section data persists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
