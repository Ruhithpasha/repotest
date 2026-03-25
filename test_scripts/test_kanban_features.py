"""
Test Kanban Board and CRM Features
Focused testing on:
- Login for super_admin and rep users
- Kanban board lead status updates (PATCH /api/leads/:id/status)
- Rep user CRM portal access
- StudentManagement page accessibility
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://referral-payouts-hub.preview.emergentagent.com')

# Test credentials
TEST_CREDENTIALS = {
    "super_admin": {"email": "superadmin@plan4growth.uk", "password": "password123"},
    "manager": {"email": "manager@plan4growth.uk", "password": "password123"},
    "rep": {"email": "rep@plan4growth.uk", "password": "password123"}
}

class TestLoginVerification:
    """Verify all user roles can login"""
    
    def test_super_admin_login_returns_correct_role(self):
        """Super admin login should return user with super_admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["super_admin"]["email"],
            "password": TEST_CREDENTIALS["super_admin"]["password"]
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        print(f"Super admin login: OK - role={data['user']['role']}")
    
    def test_rep_user_login_returns_correct_role(self):
        """Rep user login should return user with rep role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["rep"]["email"],
            "password": TEST_CREDENTIALS["rep"]["password"]
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "rep", f"Expected rep role, got {data['user']['role']}"
        print(f"Rep login: OK - role={data['user']['role']}")


class TestKanbanStatusUpdate:
    """Test Kanban board status update functionality (PATCH /api/leads/:id/status)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and find a lead to test"""
        # Login as super_admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["super_admin"]["email"],
            "password": TEST_CREDENTIALS["super_admin"]["password"]
        })
        assert response.status_code == 200, "Failed to login"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get leads to find one for testing
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        self.leads = leads_response.json() if leads_response.status_code == 200 else []
        print(f"Found {len(self.leads)} leads for testing")
    
    def test_update_lead_status_to_contacted(self):
        """Test updating lead status to 'contacted' (Kanban column move)"""
        if not self.leads:
            pytest.skip("No leads available for testing")
        
        # Find a lead with 'new' status
        test_lead = None
        for lead in self.leads:
            if lead.get("status") == "new":
                test_lead = lead
                break
        
        if not test_lead:
            test_lead = self.leads[0]  # Use any lead
        
        lead_id = test_lead["lead_id"]
        print(f"Testing status update for lead: {lead_id} (current status: {test_lead.get('status')})")
        
        response = requests.patch(
            f"{BASE_URL}/api/leads/{lead_id}/status",
            json={"status": "contacted"},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert "lead" in data, "No lead in response"
        assert data["lead"]["status"] == "contacted", f"Status not updated: {data['lead']['status']}"
        print(f"Status updated successfully: {test_lead.get('status')} -> contacted")
    
    def test_update_lead_status_to_interested(self):
        """Test updating lead status to 'interested'"""
        if not self.leads:
            pytest.skip("No leads available for testing")
        
        lead_id = self.leads[0]["lead_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/leads/{lead_id}/status",
            json={"status": "interested"},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        assert response.json()["lead"]["status"] == "interested"
        print(f"Lead {lead_id} status updated to 'interested'")
    
    def test_update_status_with_invalid_lead_returns_404(self):
        """Test that updating non-existent lead returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/nonexistent_lead_id/status",
            json={"status": "contacted"},
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent lead returns 404: OK")
    
    def test_update_status_without_status_returns_400(self):
        """Test that status update without status field returns 400"""
        if not self.leads:
            pytest.skip("No leads available for testing")
        
        lead_id = self.leads[0]["lead_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/leads/{lead_id}/status",
            json={},  # Missing status field
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Missing status field returns 400: OK")


class TestKanbanLeadColumns:
    """Test Kanban board columns and lead distribution"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["super_admin"]["email"],
            "password": TEST_CREDENTIALS["super_admin"]["password"]
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_leads_have_valid_kanban_status(self):
        """Test that all leads have valid Kanban status values"""
        VALID_STATUSES = ["new", "contacted", "interested", "application_started", "enrolled", "paid_in_full"]
        
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        
        leads = response.json()
        print(f"Checking {len(leads)} leads for valid Kanban statuses")
        
        for lead in leads:
            status = lead.get("status")
            assert status in VALID_STATUSES, f"Invalid status '{status}' for lead {lead['lead_id']}"
            print(f"  Lead {lead['lead_id']}: status='{status}' (valid)")
        
        # Count by status
        status_counts = {}
        for lead in leads:
            status = lead.get("status")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Status distribution: {status_counts}")
    
    def test_leads_stats_returns_by_status(self):
        """Test that lead stats API returns status counts for Kanban columns"""
        response = requests.get(f"{BASE_URL}/api/leads/stats", headers=self.headers)
        assert response.status_code == 200
        
        stats = response.json()
        assert "by_status" in stats, "Missing by_status in stats"
        print(f"Lead stats by status: {stats.get('by_status')}")


class TestRepUserCRMAccess:
    """Test rep user access to CRM portal features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as rep user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CREDENTIALS["rep"]["email"],
            "password": TEST_CREDENTIALS["rep"]["password"]
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_rep_can_access_leads(self):
        """Rep user can access leads API"""
        if not self.token:
            pytest.skip("Rep user token not available")
        
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200, f"Rep cannot access leads: {response.text}"
        print(f"Rep can access leads: {len(response.json())} leads visible")
    
    def test_rep_can_access_students_api(self):
        """Rep user can access their students via /api/rep/students"""
        if not self.token:
            pytest.skip("Rep user token not available")
        
        response = requests.get(f"{BASE_URL}/api/rep/students", headers=self.headers)
        assert response.status_code == 200, f"Rep cannot access students: {response.text}"
        students = response.json()
        print(f"Rep students endpoint accessible: {len(students)} students")
    
    def test_rep_can_access_commissions(self):
        """Rep user can access commissions"""
        if not self.token:
            pytest.skip("Rep user token not available")
        
        response = requests.get(f"{BASE_URL}/api/commissions/my-commissions", headers=self.headers)
        assert response.status_code == 200, f"Rep cannot access commissions: {response.text}"
        print("Rep commissions access: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
