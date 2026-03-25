"""
Programme/Course Management API Tests
Tests for Super Admin CRUD operations on programmes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@plan4growth.uk"
SUPER_ADMIN_PASSWORD = "password123"


class TestProgrammeManagementAPI:
    """Tests for /api/admin/programmes endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        
        yield
        
        # Cleanup: Delete any test-created programmes
        try:
            response = self.session.get(f"{BASE_URL}/api/admin/programmes")
            if response.status_code == 200:
                for prog in response.json():
                    if prog.get("program_name", "").startswith("TEST_"):
                        # Only delete if no enrollments
                        if prog.get("enrollmentCount", 0) == 0:
                            self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog['id']}")
        except Exception:
            pass

    # ==================== GET /api/admin/programmes ====================
    def test_list_programmes_success(self):
        """GET /api/admin/programmes - List all programmes"""
        response = self.session.get(f"{BASE_URL}/api/admin/programmes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify at least 2 programmes exist (Level 7 and Advanced Implant)
        assert len(data) >= 2, f"Expected at least 2 programmes, got {len(data)}"
        
        # Check response structure
        if len(data) > 0:
            prog = data[0]
            assert "id" in prog, "Programme should have 'id'"
            assert "program_name" in prog, "Programme should have 'program_name'"
            assert "currency" in prog, "Programme should have 'currency'"
            assert "list_price" in prog, "Programme should have 'list_price'"
            assert "active" in prog, "Programme should have 'active'"
            assert "enrollmentCount" in prog, "Programme should have 'enrollmentCount'"
        
        print(f"✓ Listed {len(data)} programmes successfully")

    def test_list_programmes_with_active_filter(self):
        """GET /api/admin/programmes?active=true - Filter active programmes"""
        response = self.session.get(f"{BASE_URL}/api/admin/programmes?active=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned should be active
        for prog in data:
            assert prog["active"] is True, f"Programme {prog['program_name']} should be active"
        
        print(f"✓ Filtered {len(data)} active programmes")

    def test_list_programmes_with_search(self):
        """GET /api/admin/programmes?search=Level - Search programmes by name"""
        response = self.session.get(f"{BASE_URL}/api/admin/programmes?search=Level")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that returned programmes contain 'Level' in name
        for prog in data:
            assert "level" in prog["program_name"].lower(), f"Programme should contain 'Level'"
        
        print(f"✓ Search returned {len(data)} programmes matching 'Level'")

    # ==================== GET /api/admin/programmes/stats ====================
    def test_get_programme_stats(self):
        """GET /api/admin/programmes/stats - Get programme statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/programmes/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "totalProgrammes" in data, "Stats should have 'totalProgrammes'"
        assert "activeProgrammes" in data, "Stats should have 'activeProgrammes'"
        assert "totalEnrolments" in data, "Stats should have 'totalEnrolments'"
        assert "totalRevenue" in data, "Stats should have 'totalRevenue'"
        
        # Verify values are numbers
        assert isinstance(data["totalProgrammes"], int), "totalProgrammes should be int"
        assert isinstance(data["activeProgrammes"], int), "activeProgrammes should be int"
        assert isinstance(data["totalEnrolments"], int), "totalEnrolments should be int"
        assert isinstance(data["totalRevenue"], (int, float)), "totalRevenue should be numeric"
        
        print(f"✓ Stats: {data['totalProgrammes']} total, {data['activeProgrammes']} active, {data['totalEnrolments']} enrolments")

    # ==================== POST /api/admin/programmes ====================
    def test_create_programme_success(self):
        """POST /api/admin/programmes - Create new programme successfully"""
        payload = {
            "program_name": "TEST_New Programme Course",
            "currency": "USD",
            "list_price": 5000,
            "active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["program_name"] == payload["program_name"]
        assert data["currency"] == payload["currency"]
        assert data["list_price"] == payload["list_price"]
        assert data["active"] == payload["active"]
        assert "id" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{data['id']}")
        
        print(f"✓ Created programme: {data['program_name']}")

    def test_create_programme_with_different_currencies(self):
        """POST /api/admin/programmes - Create programmes with all valid currencies"""
        currencies = ["INR", "GBP", "USD", "EUR"]
        
        for currency in currencies:
            payload = {
                "program_name": f"TEST_{currency}_Programme",
                "currency": currency,
                "list_price": 1000,
                "active": True
            }
            
            response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
            
            assert response.status_code == 201, f"Failed for {currency}: {response.text}"
            data = response.json()
            assert data["currency"] == currency
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/admin/programmes/{data['id']}")
        
        print(f"✓ Created programmes with all currencies: {currencies}")

    def test_create_programme_validation_name_too_short(self):
        """POST /api/admin/programmes - Validation: name too short"""
        payload = {
            "program_name": "A",
            "currency": "INR",
            "list_price": 5000,
            "active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "name" in data.get("detail", "").lower() or data.get("field") == "program_name"
        
        print("✓ Validation: name too short correctly rejected")

    def test_create_programme_validation_price_zero(self):
        """POST /api/admin/programmes - Validation: price must be > 0"""
        payload = {
            "program_name": "TEST_Zero Price Programme",
            "currency": "INR",
            "list_price": 0,
            "active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "price" in data.get("detail", "").lower() or data.get("field") == "list_price"
        
        print("✓ Validation: zero price correctly rejected")

    def test_create_programme_validation_negative_price(self):
        """POST /api/admin/programmes - Validation: negative price rejected"""
        payload = {
            "program_name": "TEST_Negative Price Programme",
            "currency": "INR",
            "list_price": -100,
            "active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response.status_code == 400
        
        print("✓ Validation: negative price correctly rejected")

    def test_create_programme_duplicate_name(self):
        """POST /api/admin/programmes - Validation: duplicate name rejected"""
        # First create a programme
        payload = {
            "program_name": "TEST_Duplicate Check Programme",
            "currency": "INR",
            "list_price": 5000,
            "active": True
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        assert response1.status_code == 201
        prog_id = response1.json()["id"]
        
        # Try to create another with same name
        response2 = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog_id}")
        
        print("✓ Validation: duplicate name correctly rejected")

    def test_create_programme_invalid_currency(self):
        """POST /api/admin/programmes - Validation: invalid currency rejected"""
        payload = {
            "program_name": "TEST_Invalid Currency Programme",
            "currency": "XYZ",
            "list_price": 5000,
            "active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=payload)
        
        assert response.status_code == 400
        assert "currency" in response.json().get("detail", "").lower() or response.json().get("field") == "currency"
        
        print("✓ Validation: invalid currency correctly rejected")

    # ==================== PATCH /api/admin/programmes/:id ====================
    def test_update_programme_success(self):
        """PATCH /api/admin/programmes/:id - Update programme successfully"""
        # First create a programme
        create_payload = {
            "program_name": "TEST_Update Target Programme",
            "currency": "INR",
            "list_price": 5000,
            "active": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json=create_payload)
        assert create_response.status_code == 201
        prog_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "program_name": "TEST_Updated Programme Name",
            "currency": "GBP",
            "list_price": 7500,
            "active": False
        }
        
        update_response = self.session.patch(f"{BASE_URL}/api/admin/programmes/{prog_id}", json=update_payload)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        assert data["program_name"] == update_payload["program_name"]
        assert data["currency"] == update_payload["currency"]
        assert data["list_price"] == update_payload["list_price"]
        assert data["active"] == update_payload["active"]
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/admin/programmes")
        programmes = [p for p in get_response.json() if p["id"] == prog_id]
        assert len(programmes) == 1
        assert programmes[0]["program_name"] == update_payload["program_name"]
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog_id}")
        
        print("✓ Updated programme successfully")

    def test_update_programme_partial(self):
        """PATCH /api/admin/programmes/:id - Partial update works"""
        # Create a programme
        create_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "TEST_Partial Update Programme",
            "currency": "INR",
            "list_price": 5000,
            "active": True
        })
        prog_id = create_response.json()["id"]
        
        # Update only price
        update_response = self.session.patch(f"{BASE_URL}/api/admin/programmes/{prog_id}", json={
            "list_price": 6000
        })
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["list_price"] == 6000
        assert data["program_name"] == "TEST_Partial Update Programme"  # Unchanged
        assert data["currency"] == "INR"  # Unchanged
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog_id}")
        
        print("✓ Partial update works correctly")

    def test_update_programme_not_found(self):
        """PATCH /api/admin/programmes/:id - Returns 404 for non-existent ID"""
        response = self.session.patch(f"{BASE_URL}/api/admin/programmes/prog_nonexistent123", json={
            "program_name": "Test"
        })
        
        assert response.status_code == 404
        
        print("✓ Returns 404 for non-existent programme")

    def test_update_programme_duplicate_name(self):
        """PATCH /api/admin/programmes/:id - Duplicate name on update rejected"""
        # Create two programmes
        prog1_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "TEST_Programme One",
            "currency": "INR",
            "list_price": 5000
        })
        prog1_id = prog1_response.json()["id"]
        
        prog2_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "TEST_Programme Two",
            "currency": "INR",
            "list_price": 5000
        })
        prog2_id = prog2_response.json()["id"]
        
        # Try to rename prog2 to prog1's name
        update_response = self.session.patch(f"{BASE_URL}/api/admin/programmes/{prog2_id}", json={
            "program_name": "TEST_Programme One"
        })
        
        assert update_response.status_code == 400
        assert "already exists" in update_response.json().get("detail", "").lower()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog1_id}")
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog2_id}")
        
        print("✓ Duplicate name on update correctly rejected")

    # ==================== DELETE /api/admin/programmes/:id ====================
    def test_deactivate_programme_success(self):
        """DELETE /api/admin/programmes/:id - Soft delete (deactivate) programme"""
        # Create a programme
        create_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "TEST_Deactivate Programme",
            "currency": "INR",
            "list_price": 5000,
            "active": True
        })
        prog_id = create_response.json()["id"]
        
        # Deactivate it
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        assert delete_response.json().get("success") is True
        
        # Verify it's inactive
        get_response = self.session.get(f"{BASE_URL}/api/admin/programmes")
        programmes = [p for p in get_response.json() if p["id"] == prog_id]
        assert len(programmes) == 1
        assert programmes[0]["active"] is False
        
        print("✓ Deactivated programme successfully")

    def test_deactivate_programme_with_enrollments_fails(self):
        """DELETE /api/admin/programmes/:id - Fails for programme with active enrollments"""
        # Get the Level 7 programme which has enrollments
        get_response = self.session.get(f"{BASE_URL}/api/admin/programmes?search=Level%207")
        programmes = get_response.json()
        
        level7_prog = None
        for prog in programmes:
            if "Level 7" in prog.get("program_name", "") and prog.get("enrollmentCount", 0) > 0:
                level7_prog = prog
                break
        
        if not level7_prog:
            pytest.skip("No programme with enrollments found for testing")
        
        # Try to deactivate
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/programmes/{level7_prog['id']}")
        
        assert delete_response.status_code == 409, f"Expected 409, got {delete_response.status_code}: {delete_response.text}"
        assert "active enrolments" in delete_response.json().get("detail", "").lower()
        
        print(f"✓ Deactivation blocked for programme with {level7_prog['enrollmentCount']} enrollments")

    def test_deactivate_programme_not_found(self):
        """DELETE /api/admin/programmes/:id - Returns 404 for non-existent ID"""
        response = self.session.delete(f"{BASE_URL}/api/admin/programmes/prog_nonexistent123")
        
        assert response.status_code == 404
        
        print("✓ Returns 404 for non-existent programme")

    # ==================== PATCH /api/admin/programmes/:id/activate ====================
    def test_activate_programme_success(self):
        """PATCH /api/admin/programmes/:id/activate - Reactivate deactivated programme"""
        # Create and deactivate a programme
        create_response = self.session.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "TEST_Reactivate Programme",
            "currency": "INR",
            "list_price": 5000,
            "active": False
        })
        prog_id = create_response.json()["id"]
        
        # Activate it
        activate_response = self.session.patch(f"{BASE_URL}/api/admin/programmes/{prog_id}/activate")
        
        assert activate_response.status_code == 200, f"Expected 200, got {activate_response.status_code}: {activate_response.text}"
        assert activate_response.json().get("active") is True
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/admin/programmes")
        programmes = [p for p in get_response.json() if p["id"] == prog_id]
        assert programmes[0]["active"] is True
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/programmes/{prog_id}")
        
        print("✓ Reactivated programme successfully")

    def test_activate_programme_not_found(self):
        """PATCH /api/admin/programmes/:id/activate - Returns 404 for non-existent ID"""
        response = self.session.patch(f"{BASE_URL}/api/admin/programmes/prog_nonexistent123/activate")
        
        assert response.status_code == 404
        
        print("✓ Returns 404 for non-existent programme")


class TestProgrammeManagementAuth:
    """Tests for authentication/authorization on programme endpoints"""
    
    def test_list_programmes_no_auth(self):
        """GET /api/admin/programmes - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/programmes")
        
        assert response.status_code == 401
        
        print("✓ Returns 401 without authentication")
    
    def test_create_programme_no_auth(self):
        """POST /api/admin/programmes - Returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/admin/programmes", json={
            "program_name": "Test",
            "currency": "INR",
            "list_price": 1000
        })
        
        assert response.status_code == 401
        
        print("✓ Create returns 401 without authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
