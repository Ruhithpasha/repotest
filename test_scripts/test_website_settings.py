"""
Test Website Settings API
Tests: GET/PUT for super_admin endpoints, public endpoint, access control for non-super_admin users
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWebsiteSettingsAuth:
    """Test authentication for Website Settings endpoints"""
    
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


class TestWebsiteSettingsGetAll(TestWebsiteSettingsAuth):
    """Test GET /api/admin/website-settings - fetch all sections"""
    
    def test_get_all_settings_super_admin(self, super_admin_headers):
        """Super admin should be able to fetch all website settings"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=super_admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return settings object
        assert "settings" in data, "Response should contain 'settings' key"
        assert isinstance(data["settings"], dict), "Settings should be a dictionary"
        
        print(f"Super admin fetched {len(data['settings'])} sections")
    
    def test_get_all_settings_manager_forbidden(self, manager_headers):
        """Manager (non-super_admin) should get 403 Forbidden"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=manager_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "error" in data or "detail" in data, "Response should contain error message"
        print(f"Manager correctly blocked: {data.get('error') or data.get('detail')}")
    
    def test_get_all_settings_no_auth(self):
        """Request without auth should get 401 Unauthorized"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("No auth correctly blocked")


class TestWebsiteSettingsGetSection(TestWebsiteSettingsAuth):
    """Test GET /api/admin/website-settings/:section - fetch single section"""
    
    def test_get_section_super_admin(self, super_admin_headers):
        """Super admin should fetch single section"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings/header", headers=super_admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "section" in data, "Response should contain 'section' key"
        assert data["section"] == "header", "Section should be 'header'"
        assert "content" in data, "Response should contain 'content' key"
        
        print(f"Super admin fetched header section: exists={data.get('exists', 'N/A')}")
    
    def test_get_section_manager_forbidden(self, manager_headers):
        """Manager should get 403 when fetching single section"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings/header", headers=manager_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Manager correctly blocked from fetching section")
    
    def test_get_nonexistent_section(self, super_admin_headers):
        """Fetching non-existent section should return empty content, not error"""
        response = requests.get(f"{BASE_URL}/api/admin/website-settings/nonexistent_test_section", headers=super_admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "section" in data
        assert "content" in data
        assert data.get("exists") == False, "Non-existent section should have exists=false"
        print("Non-existent section returns empty content correctly")


class TestWebsiteSettingsUpsert(TestWebsiteSettingsAuth):
    """Test PUT /api/admin/website-settings/:section - upsert section"""
    
    def test_upsert_section_super_admin_create(self, super_admin_headers):
        """Super admin should be able to create new section"""
        test_content = {
            "test_field": "test_value",
            "created_at_test": str(time.time())
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/test_section_{int(time.time())}",
            headers=super_admin_headers,
            json={"content": test_content}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should contain success message"
        assert "content" in data, "Response should contain content"
        assert data["content"]["test_field"] == "test_value"
        print(f"Super admin created section: {data.get('message')}")
    
    def test_upsert_section_update_header(self, super_admin_headers):
        """Super admin should be able to update header section"""
        test_content = {
            "site_name": "Plan4Growth Academy Test",
            "cta_text": "Apply Now Test",
            "test_update_timestamp": str(time.time())
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/header",
            headers=super_admin_headers,
            json={"content": test_content}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "content" in data
        assert data["content"]["site_name"] == "Plan4Growth Academy Test"
        print(f"Super admin updated header: {data.get('message')}")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/website-settings/header", headers=super_admin_headers)
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["content"]["site_name"] == "Plan4Growth Academy Test"
        print("Header update persisted correctly")
    
    def test_upsert_section_manager_forbidden(self, manager_headers):
        """Manager should get 403 when trying to update section"""
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/header",
            headers=manager_headers,
            json={"content": {"test": "should_fail"}}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Manager correctly blocked from updating section")
    
    def test_upsert_section_invalid_content(self, super_admin_headers):
        """Invalid content should return 400 error"""
        response = requests.put(
            f"{BASE_URL}/api/admin/website-settings/header",
            headers=super_admin_headers,
            json={"content": "not_an_object"}  # Should be object, not string
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Invalid content correctly rejected")


class TestPublicWebsiteSettings:
    """Test public endpoint GET /api/website-settings/:section - no auth required"""
    
    def test_public_endpoint_header(self):
        """Public endpoint should return header content without auth"""
        response = requests.get(f"{BASE_URL}/api/website-settings/header")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "section" in data, "Response should contain 'section' key"
        assert data["section"] == "header"
        assert "content" in data, "Response should contain 'content' key"
        print(f"Public endpoint returned header, has content: {data['content'] is not None}")
    
    def test_public_endpoint_hero(self):
        """Public endpoint should return hero content without auth"""
        response = requests.get(f"{BASE_URL}/api/website-settings/hero")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["section"] == "hero"
        print("Public endpoint returned hero section")
    
    def test_public_endpoint_nonexistent(self):
        """Public endpoint for non-existent section should return null content"""
        response = requests.get(f"{BASE_URL}/api/website-settings/nonexistent_section")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["content"] is None, "Non-existent section should return null content"
        print("Public endpoint correctly returns null for non-existent section")


class TestAll15Sections(TestWebsiteSettingsAuth):
    """Test all 15 sections can be created/updated"""
    
    SECTIONS = [
        'header', 'hero', 'stats', 'about', 'process', 
        'courses', 'features', 'mentors', 'reviews', 
        'academy', 'partners', 'faqs', 'contact', 'footer', 'seo'
    ]
    
    def test_all_sections_accessible(self, super_admin_headers):
        """All 15 sections should be accessible via admin endpoint"""
        for section in self.SECTIONS:
            response = requests.get(f"{BASE_URL}/api/admin/website-settings/{section}", headers=super_admin_headers)
            assert response.status_code == 200, f"Section {section} failed: {response.text}"
            data = response.json()
            assert data["section"] == section
        
        print(f"All {len(self.SECTIONS)} sections accessible")
    
    def test_all_sections_updatable(self, super_admin_headers):
        """All 15 sections should be updatable"""
        for section in self.SECTIONS:
            test_content = {
                "test_field": f"test_value_for_{section}",
                "timestamp": str(time.time())
            }
            response = requests.put(
                f"{BASE_URL}/api/admin/website-settings/{section}",
                headers=super_admin_headers,
                json={"content": test_content}
            )
            assert response.status_code == 200, f"Section {section} update failed: {response.text}"
        
        print(f"All {len(self.SECTIONS)} sections updatable")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
