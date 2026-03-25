"""
Test file for Teams - Rep to Manager Assignment APIs
Tests the new team management functionality for commission chain setup.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://referral-payouts-hub.preview.emergentagent.com').rstrip('/')


class TestTeamsAPIs:
    """Tests for Teams Management APIs - Rep to Manager Assignment"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get Super Admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Auth headers for admin requests"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ===== GET /api/admin/users/team-stats =====
    def test_get_team_stats_returns_200(self, auth_headers):
        """Test team stats endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/admin/users/team-stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_team_stats_has_required_fields(self, auth_headers):
        """Test team stats response contains required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/users/team-stats", headers=auth_headers)
        data = response.json()
        
        assert "totalManagers" in data, "Missing totalManagers field"
        assert "totalReps" in data, "Missing totalReps field"
        assert "unassignedReps" in data, "Missing unassignedReps field"
        
        # All should be integers
        assert isinstance(data["totalManagers"], int), "totalManagers should be integer"
        assert isinstance(data["totalReps"], int), "totalReps should be integer"
        assert isinstance(data["unassignedReps"], int), "unassignedReps should be integer"
    
    def test_get_team_stats_values_non_negative(self, auth_headers):
        """Test team stats values are non-negative"""
        response = requests.get(f"{BASE_URL}/api/admin/users/team-stats", headers=auth_headers)
        data = response.json()
        
        assert data["totalManagers"] >= 0, "totalManagers should be non-negative"
        assert data["totalReps"] >= 0, "totalReps should be non-negative"
        assert data["unassignedReps"] >= 0, "unassignedReps should be non-negative"
        assert data["unassignedReps"] <= data["totalReps"], "unassignedReps should not exceed totalReps"
    
    # ===== GET /api/admin/users/managers =====
    def test_get_managers_returns_200(self, auth_headers):
        """Test managers endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_managers_returns_array(self, auth_headers):
        """Test managers endpoint returns array"""
        response = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        data = response.json()
        
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_get_managers_has_rep_count(self, auth_headers):
        """Test each manager has rep_count field"""
        response = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        managers = response.json()
        
        for manager in managers:
            assert "user_id" in manager, "Missing user_id"
            assert "name" in manager, "Missing name"
            assert "email" in manager, "Missing email"
            assert "rep_count" in manager, "Missing rep_count"
            assert isinstance(manager["rep_count"], int), "rep_count should be integer"
    
    # ===== GET /api/admin/users/reps =====
    def test_get_reps_returns_200(self, auth_headers):
        """Test reps endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_reps_returns_array(self, auth_headers):
        """Test reps endpoint returns array"""
        response = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        data = response.json()
        
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_get_reps_has_manager_name(self, auth_headers):
        """Test each rep has manager_name field (can be null)"""
        response = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        reps = response.json()
        
        for rep in reps:
            assert "user_id" in rep, "Missing user_id"
            assert "name" in rep, "Missing name"
            assert "email" in rep, "Missing email"
            assert "manager_name" in rep, "Missing manager_name field (should be null or string)"
            assert "manager_id" in rep, "Missing manager_id field"
    
    def test_get_reps_filter_by_manager_id(self, auth_headers):
        """Test filtering reps by manager_id"""
        # Get a manager first
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        managers = managers_res.json()
        
        if managers:
            manager_id = managers[0]["user_id"]
            response = requests.get(
                f"{BASE_URL}/api/admin/users/reps?manager_id={manager_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            reps = response.json()
            # All returned reps should belong to this manager
            for rep in reps:
                assert rep["manager_id"] == manager_id, f"Rep {rep['name']} has wrong manager_id"
    
    def test_get_reps_filter_unassigned(self, auth_headers):
        """Test filtering unassigned reps"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/reps?unassigned=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        reps = response.json()
        
        # All returned reps should have no manager
        for rep in reps:
            assert rep["manager_id"] is None, f"Rep {rep['name']} should be unassigned"
    
    # ===== PATCH /api/admin/users/:repId/assign-manager =====
    def test_assign_manager_to_rep(self, auth_headers):
        """Test assigning a manager to a rep"""
        # Get managers and reps
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        managers = managers_res.json()
        reps = reps_res.json()
        
        if not managers or not reps:
            pytest.skip("No managers or reps to test with")
        
        manager_id = managers[0]["user_id"]
        manager_name = managers[0]["name"]
        rep_id = reps[0]["user_id"]
        
        # Assign manager
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{rep_id}/assign-manager",
            headers=auth_headers,
            json={"manager_id": manager_id}
        )
        
        assert response.status_code == 200, f"Assign failed: {response.text}"
        data = response.json()
        
        assert data["manager_id"] == manager_id, "manager_id not updated"
        assert data["manager_name"] == manager_name, "manager_name not returned"
    
    def test_unassign_manager_from_rep(self, auth_headers):
        """Test unassigning a manager from a rep"""
        # Get reps
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        reps = reps_res.json()
        
        if not reps:
            pytest.skip("No reps to test with")
        
        rep_id = reps[0]["user_id"]
        
        # Unassign (set manager_id to null)
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{rep_id}/assign-manager",
            headers=auth_headers,
            json={"manager_id": None}
        )
        
        assert response.status_code == 200, f"Unassign failed: {response.text}"
        data = response.json()
        
        assert data["manager_id"] is None, "manager_id should be null after unassign"
    
    def test_assign_manager_invalid_rep(self, auth_headers):
        """Test assigning to non-existent rep returns 404"""
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        managers = managers_res.json()
        
        if not managers:
            pytest.skip("No managers to test with")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/invalid_rep_id/assign-manager",
            headers=auth_headers,
            json={"manager_id": managers[0]["user_id"]}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_assign_invalid_manager(self, auth_headers):
        """Test assigning non-existent manager returns 404"""
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        reps = reps_res.json()
        
        if not reps:
            pytest.skip("No reps to test with")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{reps[0]['user_id']}/assign-manager",
            headers=auth_headers,
            json={"manager_id": "invalid_manager_id"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ===== PATCH /api/admin/users/bulk-assign-manager =====
    def test_bulk_assign_manager(self, auth_headers):
        """Test bulk assigning manager to multiple reps"""
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        managers = managers_res.json()
        reps = reps_res.json()
        
        if not managers or len(reps) < 1:
            pytest.skip("Not enough managers or reps to test")
        
        manager_id = managers[0]["user_id"]
        rep_ids = [r["user_id"] for r in reps[:2]]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/bulk-assign-manager",
            headers=auth_headers,
            json={"rep_ids": rep_ids, "manager_id": manager_id}
        )
        
        assert response.status_code == 200, f"Bulk assign failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Bulk assign should return success=true"
        assert "updated_count" in data, "Missing updated_count"
        assert data["updated_count"] > 0, "Should have updated at least one rep"
    
    def test_bulk_assign_empty_array_fails(self, auth_headers):
        """Test bulk assign with empty rep_ids fails"""
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        managers = managers_res.json()
        
        if not managers:
            pytest.skip("No managers to test with")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/bulk-assign-manager",
            headers=auth_headers,
            json={"rep_ids": [], "manager_id": managers[0]["user_id"]}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_bulk_unassign_manager(self, auth_headers):
        """Test bulk unassigning managers from reps"""
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        reps = reps_res.json()
        
        if len(reps) < 1:
            pytest.skip("Not enough reps to test")
        
        rep_ids = [r["user_id"] for r in reps[:2]]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/bulk-assign-manager",
            headers=auth_headers,
            json={"rep_ids": rep_ids, "manager_id": None}
        )
        
        assert response.status_code == 200, f"Bulk unassign failed: {response.text}"
    
    # ===== Authorization Tests =====
    def test_team_stats_requires_auth(self):
        """Test team-stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users/team-stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_managers_requires_auth(self):
        """Test managers endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users/managers")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_reps_requires_auth(self):
        """Test reps endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users/reps")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_assign_manager_requires_auth(self):
        """Test assign-manager requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/test_rep_id/assign-manager",
            json={"manager_id": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    # ===== Non-Admin Access Tests =====
    def test_team_stats_forbidden_for_manager_role(self):
        """Test team-stats is forbidden for manager role"""
        # Login as manager
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@plan4growth.uk",
            "password": "password123"
        })
        if login_res.status_code != 200:
            pytest.skip("Manager login failed")
        
        manager_token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/users/team-stats", headers=headers)
        assert response.status_code == 403, f"Expected 403 forbidden, got {response.status_code}"


class TestTeamsIntegration:
    """Integration tests verifying teams data consistency"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_stats_match_actual_data(self, auth_headers):
        """Test that stats match actual managers and reps counts"""
        stats_res = requests.get(f"{BASE_URL}/api/admin/users/team-stats", headers=auth_headers)
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        reps_res = requests.get(f"{BASE_URL}/api/admin/users/reps", headers=auth_headers)
        
        stats = stats_res.json()
        managers = managers_res.json()
        reps = reps_res.json()
        
        assert stats["totalManagers"] == len(managers), "totalManagers mismatch"
        assert stats["totalReps"] == len(reps), "totalReps mismatch"
        
        unassigned_count = sum(1 for r in reps if r["manager_id"] is None)
        assert stats["unassignedReps"] == unassigned_count, "unassignedReps mismatch"
    
    def test_manager_rep_count_accuracy(self, auth_headers):
        """Test that manager rep_count matches actual assigned reps"""
        managers_res = requests.get(f"{BASE_URL}/api/admin/users/managers", headers=auth_headers)
        managers = managers_res.json()
        
        for manager in managers:
            # Get reps for this manager
            reps_res = requests.get(
                f"{BASE_URL}/api/admin/users/reps?manager_id={manager['user_id']}",
                headers=auth_headers
            )
            actual_rep_count = len(reps_res.json())
            
            assert manager["rep_count"] == actual_rep_count, \
                f"Manager {manager['name']} rep_count {manager['rep_count']} != actual {actual_rep_count}"
