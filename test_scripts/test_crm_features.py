"""
Test CRM Features - Teams, Leads, Programs APIs
Phase 1 Implementation Testing

Tests:
- Authentication with different roles (super_admin, manager, sales_user)
- Teams CRUD operations with role-based access control
- Leads CRUD operations with filtering and status updates
- Programs CRUD operations
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://referral-payouts-hub.preview.emergentagent.com')

# Test credentials from PRD
TEST_CREDENTIALS = {
    "super_admin": {"email": "superadmin@plan4growth.uk", "password": "password123"},
    "manager": {"email": "manager@plan4growth.uk", "password": "password123"},
    "sales_user": {"email": "sales@plan4growth.uk", "password": "password123"}
}

class TestAuthentication:
    """Test authentication for CRM roles"""
    
    def test_superadmin_login(self):
        """Super admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["super_admin"]["email"],
            "password": TEST_CREDENTIALS["super_admin"]["password"]
        })
        print(f"Super admin login status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "super_admin", f"Unexpected role: {data.get('user', {}).get('role')}"
    
    def test_manager_login(self):
        """Manager should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["manager"]["email"],
            "password": TEST_CREDENTIALS["manager"]["password"]
        })
        print(f"Manager login status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "manager", f"Unexpected role: {data.get('user', {}).get('role')}"

    def test_sales_user_login(self):
        """Sales user should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["sales_user"]["email"],
            "password": TEST_CREDENTIALS["sales_user"]["password"]
        })
        print(f"Sales user login status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Sales user login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "sales_user", f"Unexpected role: {data.get('user', {}).get('role')}"


class TestTeamsAPI:
    """Test Teams API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get tokens for different roles"""
        self.tokens = {}
        self.user_ids = {}
        
        for role, creds in TEST_CREDENTIALS.items():
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get("token")
                self.user_ids[role] = data.get("user", {}).get("user_id")
        
        print(f"Tokens obtained: {list(self.tokens.keys())}")
    
    def test_get_all_teams_as_super_admin(self):
        """Super admin can get all teams"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/teams status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get teams: {response.text}"
        teams = response.json()
        assert isinstance(teams, list), "Response should be a list"
        print(f"Found {len(teams)} teams")
        
        # Check structure of teams if any exist
        if teams:
            team = teams[0]
            assert "team_id" in team, "team_id missing"
            assert "name" in team, "name missing"
    
    def test_get_all_teams_as_manager_forbidden(self):
        """Manager cannot access all teams - should get 403"""
        if "manager" not in self.tokens:
            pytest.skip("Manager token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {self.tokens['manager']}"}
        )
        print(f"GET /api/teams as manager status: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    def test_get_my_teams_as_manager(self):
        """Manager can get their own teams"""
        if "manager" not in self.tokens:
            pytest.skip("Manager token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/teams/my-teams",
            headers={"Authorization": f"Bearer {self.tokens['manager']}"}
        )
        print(f"GET /api/teams/my-teams status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get my teams: {response.text}"
        teams = response.json()
        assert isinstance(teams, list), "Response should be a list"
    
    def test_create_team_as_super_admin(self):
        """Super admin can create a team"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        # Use super_admin's user_id as manager for the new team
        team_data = {
            "name": f"TEST_Team_{int(time.time())}",
            "description": "Test team created by pytest",
            "manager_id": self.user_ids.get("super_admin") or self.user_ids.get("manager")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/teams",
            json=team_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"POST /api/teams status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 201, f"Failed to create team: {response.text}"
        data = response.json()
        assert "team" in data, "No team in response"
        assert data["team"]["name"] == team_data["name"]
        
        # Store for cleanup
        self.created_team_id = data["team"]["team_id"]
    
    def test_create_team_as_manager_forbidden(self):
        """Manager cannot create teams - only super_admin"""
        if "manager" not in self.tokens:
            pytest.skip("Manager token not available")
        
        team_data = {
            "name": "TEST_Team_Manager_Create",
            "description": "Should fail",
            "manager_id": self.user_ids.get("manager")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/teams",
            json=team_data,
            headers={"Authorization": f"Bearer {self.tokens['manager']}"}
        )
        print(f"POST /api/teams as manager status: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"


class TestLeadsAPI:
    """Test Leads API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get tokens for different roles"""
        self.tokens = {}
        self.user_ids = {}
        
        for role, creds in TEST_CREDENTIALS.items():
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get("token")
                self.user_ids[role] = data.get("user", {}).get("user_id")
    
    def test_get_leads_as_super_admin(self):
        """Super admin can get all leads"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/leads status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        leads = response.json()
        assert isinstance(leads, list), "Response should be a list"
        print(f"Found {len(leads)} leads")
        
        # Check structure
        if leads:
            lead = leads[0]
            assert "lead_id" in lead, "lead_id missing"
            assert "name" in lead, "name missing"
            assert "email" in lead, "email missing"
            assert "status" in lead, "status missing"
    
    def test_get_leads_stats(self):
        """Get lead statistics"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/leads/stats",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/leads/stats status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get lead stats: {response.text}"
        stats = response.json()
        assert "by_status" in stats or "conversion" in stats, "Stats structure unexpected"
    
    def test_create_lead_as_super_admin(self):
        """Super admin can create a lead"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        lead_data = {
            "name": f"TEST_Lead_{int(time.time())}",
            "email": f"test_lead_{int(time.time())}@example.com",
            "phone": "+919876543210",
            "source": "website",
            "notes": "Created by pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"POST /api/leads status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 201, f"Failed to create lead: {response.text}"
        data = response.json()
        assert "lead" in data, "No lead in response"
        assert data["lead"]["name"] == lead_data["name"]
        assert data["lead"]["email"] == lead_data["email"]
        assert data["lead"]["status"] == "new", "Default status should be 'new'"
        
        # Store for subsequent tests
        self.created_lead_id = data["lead"]["lead_id"]
        return self.created_lead_id
    
    def test_update_lead_status(self):
        """Test updating lead status"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        # First create a lead
        lead_data = {
            "name": f"TEST_Status_Lead_{int(time.time())}",
            "email": f"test_status_{int(time.time())}@example.com",
            "source": "website"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        
        if create_response.status_code != 201:
            pytest.skip(f"Could not create lead for status test: {create_response.text}")
        
        lead_id = create_response.json()["lead"]["lead_id"]
        
        # Update status
        response = requests.patch(
            f"{BASE_URL}/api/leads/{lead_id}/status",
            json={"status": "contacted", "notes": "Updated by pytest"},
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"PATCH /api/leads/{lead_id}/status status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        data = response.json()
        assert data["lead"]["status"] == "contacted", f"Status not updated: {data['lead']['status']}"
    
    def test_get_lead_by_id(self):
        """Get a specific lead by ID"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        # First get list of leads to find one
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No leads available for testing")
        
        lead_id = response.json()[0]["lead_id"]
        
        # Get specific lead
        response = requests.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/leads/{lead_id} status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get lead: {response.text}"
        lead = response.json()
        assert lead["lead_id"] == lead_id, "Wrong lead returned"
    
    def test_duplicate_email_rejected(self):
        """Creating lead with duplicate email should fail"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        email = f"duplicate_test_{int(time.time())}@example.com"
        
        # Create first lead
        lead_data = {
            "name": "First Lead",
            "email": email,
            "source": "website"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        
        if response1.status_code != 201:
            pytest.skip(f"Could not create first lead: {response1.text}")
        
        # Try to create duplicate
        lead_data["name"] = "Duplicate Lead"
        response2 = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"POST duplicate lead status: {response2.status_code}")
        print(f"Response: {response2.text[:500]}")
        
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}"
        assert "already exists" in response2.text.lower(), "Expected 'already exists' error message"


class TestProgramsAPI:
    """Test Programs API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get tokens for different roles"""
        self.tokens = {}
        
        for role, creds in TEST_CREDENTIALS.items():
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get("token")
    
    def test_get_all_programs(self):
        """Get all active programs"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/programs",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/programs status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get programs: {response.text}"
        programs = response.json()
        assert isinstance(programs, list), "Response should be a list"
        print(f"Found {len(programs)} programs")
        
        # Check structure
        if programs:
            program = programs[0]
            assert "program_id" in program, "program_id missing"
            assert "name" in program, "name missing"
            assert "price_gbp" in program, "price_gbp missing"
    
    def test_get_programs_with_inactive(self):
        """Super admin can get inactive programs too"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/programs?include_inactive=true",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/programs?include_inactive=true status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get programs: {response.text}"
    
    def test_create_program_as_super_admin(self):
        """Super admin can create a program"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        program_data = {
            "name": f"TEST_Program_{int(time.time())}",
            "description": "Test program created by pytest",
            "price_gbp": 5999,
            "duration_months": 6,
            "commission_value": 0.05,
            "referral_commission_percent": 0.03
        }
        
        response = requests.post(
            f"{BASE_URL}/api/programs",
            json=program_data,
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"POST /api/programs status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 201, f"Failed to create program: {response.text}"
        data = response.json()
        assert "program" in data, "No program in response"
        assert data["program"]["name"] == program_data["name"]
        assert data["program"]["is_active"] == True, "New program should be active"
    
    def test_create_program_as_manager_forbidden(self):
        """Manager cannot create programs - only super_admin"""
        if "manager" not in self.tokens:
            pytest.skip("Manager token not available")
        
        program_data = {
            "name": "TEST_Program_Manager_Create",
            "price_gbp": 1000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/programs",
            json=program_data,
            headers={"Authorization": f"Bearer {self.tokens['manager']}"}
        )
        print(f"POST /api/programs as manager status: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    def test_get_program_by_id(self):
        """Get a specific program by ID"""
        if "super_admin" not in self.tokens:
            pytest.skip("Super admin token not available")
        
        # First get list of programs
        response = requests.get(
            f"{BASE_URL}/api/programs",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No programs available for testing")
        
        program_id = response.json()[0]["program_id"]
        
        # Get specific program
        response = requests.get(
            f"{BASE_URL}/api/programs/{program_id}",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        print(f"GET /api/programs/{program_id} status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get program: {response.text}"
        program = response.json()
        assert program["program_id"] == program_id, "Wrong program returned"


class TestRoleBasedAccess:
    """Test role-based access control for CRM features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get tokens for different roles"""
        self.tokens = {}
        
        for role, creds in TEST_CREDENTIALS.items():
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get("token")
    
    def test_sales_user_can_access_leads(self):
        """Sales user can access leads API"""
        if "sales_user" not in self.tokens:
            pytest.skip("Sales user token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {self.tokens['sales_user']}"}
        )
        print(f"GET /api/leads as sales_user status: {response.status_code}")
        
        assert response.status_code == 200, f"Sales user should be able to access leads: {response.text}"
    
    def test_sales_user_can_create_lead(self):
        """Sales user can create leads"""
        if "sales_user" not in self.tokens:
            pytest.skip("Sales user token not available")
        
        lead_data = {
            "name": f"TEST_Sales_Lead_{int(time.time())}",
            "email": f"test_sales_{int(time.time())}@example.com",
            "source": "phone_inquiry"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {self.tokens['sales_user']}"}
        )
        print(f"POST /api/leads as sales_user status: {response.status_code}")
        
        assert response.status_code == 201, f"Sales user should be able to create leads: {response.text}"
    
    def test_unauthenticated_request_rejected(self):
        """Unauthenticated requests should be rejected"""
        response = requests.get(f"{BASE_URL}/api/leads")
        print(f"GET /api/leads without auth status: {response.status_code}")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated request, got {response.status_code}"
    
    def test_invalid_token_rejected(self):
        """Invalid token should be rejected"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        print(f"GET /api/leads with invalid token status: {response.status_code}")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for invalid token, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
