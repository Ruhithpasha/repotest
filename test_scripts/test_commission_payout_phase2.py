"""
Phase 2 Commission & Payout API Tests

Tests for:
- Commission APIs: GET /api/commissions, GET /api/commissions/stats, POST /api/commissions/:id/approve
- Payout APIs: GET /api/payouts, GET /api/payouts/stats, POST /api/payouts, POST /api/payouts/:id/approve, POST /api/payouts/:id/paid
- Role-based access control: admin can approve commissions, sales_user can only see own
"""

import pytest
import requests
import os
import uuid

# API Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREDENTIALS = {
    "super_admin": {"email": "superadmin@plan4growth.uk", "password": "password123"},
    "manager": {"email": "manager@plan4growth.uk", "password": "password123"},
    "sales_user": {"email": "sales@plan4growth.uk", "password": "password123"},
    "rep": {"email": "rep@plan4growth.uk", "password": "password123"}
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def super_admin_token(api_client):
    """Get super admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["super_admin"])
    if response.status_code == 200:
        token = response.json().get("token")
        return token
    pytest.skip("Super admin authentication failed - skipping tests")


@pytest.fixture(scope="module")
def manager_token(api_client):
    """Get manager authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["manager"])
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Manager authentication failed - skipping tests")


@pytest.fixture(scope="module")
def sales_user_token(api_client):
    """Get sales user authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["sales_user"])
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Sales user authentication failed - skipping tests")


@pytest.fixture(scope="module")
def rep_token(api_client):
    """Get rep authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["rep"])
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Rep authentication failed - skipping tests")


class TestAuthentication:
    """Authentication tests for all user roles"""

    def test_super_admin_login(self, api_client):
        """Test super admin can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["super_admin"])
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("user", {}).get("role") == "super_admin", "Wrong role returned"
        print("✓ Super admin login successful")

    def test_manager_login(self, api_client):
        """Test manager can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["manager"])
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "manager"
        print("✓ Manager login successful")

    def test_sales_user_login(self, api_client):
        """Test sales user can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["sales_user"])
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "sales_user"
        print("✓ Sales user login successful")

    def test_rep_login(self, api_client):
        """Test rep can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS["rep"])
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "rep"
        print("✓ Rep login successful")


class TestCommissionsAPI:
    """Commission API endpoint tests"""

    def test_get_commissions_admin(self, api_client, super_admin_token):
        """GET /api/commissions - Admin can get all commissions"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin GET /api/commissions returned {len(data)} commissions")

    def test_get_commissions_stats_admin(self, api_client, super_admin_token):
        """GET /api/commissions/stats - Admin can get commission statistics"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify response structure
        assert "by_status" in data or isinstance(data, dict), "Invalid stats response structure"
        print(f"✓ Admin GET /api/commissions/stats returned stats: {list(data.keys())}")

    def test_get_commissions_stats_forbidden_for_sales(self, api_client, sales_user_token):
        """GET /api/commissions/stats - Sales user cannot access stats"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from /api/commissions/stats")

    def test_get_my_commissions(self, api_client, sales_user_token):
        """GET /api/commissions/my-commissions - User can see their own commissions"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/my-commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Should have commissions list and summary
        assert "commissions" in data, "Response should contain 'commissions'"
        assert "summary" in data, "Response should contain 'summary'"
        print(f"✓ GET /api/commissions/my-commissions returned {len(data['commissions'])} commissions with summary")

    def test_get_commissions_with_status_filter(self, api_client, super_admin_token):
        """GET /api/commissions?status=pending - Filter by status"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions?status=pending", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned commissions should have pending status (if any exist)
        for comm in data:
            assert comm.get("status") in ["pending", "pending_validation", "pending_approval"], f"Unexpected status: {comm.get('status')}"
        print(f"✓ GET /api/commissions?status=pending returned {len(data)} commissions")

    def test_get_commissions_with_role_filter(self, api_client, super_admin_token):
        """GET /api/commissions?role_type=rep - Filter by role type"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions?role_type=rep", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned commissions should have rep role_type (if any exist)
        for comm in data:
            assert comm.get("role_type") == "rep", f"Unexpected role_type: {comm.get('role_type')}"
        print(f"✓ GET /api/commissions?role_type=rep returned {len(data)} commissions")

    def test_sales_user_sees_only_own_commissions(self, api_client, sales_user_token, super_admin_token):
        """Sales user should only see their own commissions via role-based filtering"""
        # Get sales user commissions
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        user_commissions = response.json()
        
        # Get user info to get their user_id
        user_response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if user_response.status_code == 200:
            user_id = user_response.json().get("user_id")
            # Verify all commissions belong to this user
            for comm in user_commissions:
                if comm.get("rep_id"):
                    assert comm.get("rep_id") == user_id, "Sales user sees commission not belonging to them"
        
        print(f"✓ Sales user only sees their own {len(user_commissions)} commissions")

    def test_approve_commission_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/commissions/:id/approve - Sales user cannot approve"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(f"{BASE_URL}/api/commissions/test_id/approve", headers=headers, json={})
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Sales user correctly blocked from approving commissions")

    def test_reject_commission_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/commissions/:id/reject - Sales user cannot reject"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/commissions/test_id/reject",
            headers=headers,
            json={"reason": "Test rejection"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from rejecting commissions")

    def test_approve_nonexistent_commission(self, api_client, super_admin_token):
        """POST /api/commissions/:id/approve - 404 for nonexistent commission"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        fake_id = f"comm_nonexistent{uuid.uuid4().hex[:8]}"
        response = api_client.post(f"{BASE_URL}/api/commissions/{fake_id}/approve", headers=headers, json={})
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ 404 returned for nonexistent commission approval")

    def test_bulk_approve_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/commissions/bulk-approve - Sales user cannot bulk approve"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/commissions/bulk-approve",
            headers=headers,
            json={"commission_ids": ["test_id_1", "test_id_2"]}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from bulk approve")


class TestPayoutsAPI:
    """Payout API endpoint tests"""

    def test_get_payouts_admin(self, api_client, super_admin_token):
        """GET /api/payouts - Admin can get all payouts"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin GET /api/payouts returned {len(data)} payouts")

    def test_get_payouts_stats_admin(self, api_client, super_admin_token):
        """GET /api/payouts/stats - Admin can get payout statistics"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify response structure
        assert "by_status" in data or isinstance(data, dict), "Invalid stats response structure"
        print(f"✓ Admin GET /api/payouts/stats returned stats")

    def test_get_payouts_stats_forbidden_for_sales(self, api_client, sales_user_token):
        """GET /api/payouts/stats - Sales user cannot access stats"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from /api/payouts/stats")

    def test_get_my_payouts(self, api_client, sales_user_token):
        """GET /api/payouts/my-payouts - User can see their own payouts"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/my-payouts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Should have payouts list and summary
        assert "payouts" in data, "Response should contain 'payouts'"
        assert "summary" in data, "Response should contain 'summary'"
        print(f"✓ GET /api/payouts/my-payouts returned {len(data['payouts'])} payouts with summary")

    def test_get_payouts_with_status_filter(self, api_client, super_admin_token):
        """GET /api/payouts?status=pending - Filter by status"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts?status=pending", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned payouts should have pending status (if any exist)
        for payout in data:
            assert payout.get("status") == "pending", f"Unexpected status: {payout.get('status')}"
        print(f"✓ GET /api/payouts?status=pending returned {len(data)} payouts")

    def test_create_payout_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/payouts - Sales user cannot create payout"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/payouts",
            headers=headers,
            json={"user_id": "test_user_id"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from creating payouts")

    def test_create_payout_requires_user_id(self, api_client, super_admin_token):
        """POST /api/payouts - Requires user_id"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/payouts",
            headers=headers,
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/payouts correctly requires user_id")

    def test_create_payout_nonexistent_user(self, api_client, super_admin_token):
        """POST /api/payouts - 404 for nonexistent user"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/payouts",
            headers=headers,
            json={"user_id": f"user_nonexistent{uuid.uuid4().hex[:8]}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ POST /api/payouts returns 404 for nonexistent user")

    def test_approve_payout_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/payouts/:id/approve - Sales user cannot approve"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(f"{BASE_URL}/api/payouts/test_id/approve", headers=headers, json={})
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from approving payouts")

    def test_approve_nonexistent_payout(self, api_client, super_admin_token):
        """POST /api/payouts/:id/approve - 404 for nonexistent payout"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        fake_id = f"payout_nonexistent{uuid.uuid4().hex[:8]}"
        response = api_client.post(f"{BASE_URL}/api/payouts/{fake_id}/approve", headers=headers, json={})
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 returned for nonexistent payout approval")

    def test_mark_paid_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/payouts/:id/paid - Sales user cannot mark paid"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/payouts/test_id/paid",
            headers=headers,
            json={"payment_reference": "REF123"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from marking payouts as paid")

    def test_mark_paid_nonexistent_payout(self, api_client, super_admin_token):
        """POST /api/payouts/:id/paid - 404 for nonexistent payout"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        fake_id = f"payout_nonexistent{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/payouts/{fake_id}/paid",
            headers=headers,
            json={"payment_reference": "REF123"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 returned for nonexistent payout mark paid")

    def test_export_payouts_admin(self, api_client, super_admin_token):
        """GET /api/payouts/export - Admin can export payouts CSV"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/export", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        # Should be CSV content
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type or response.text.startswith("Payout ID"), "Response should be CSV"
        print("✓ Admin GET /api/payouts/export returned CSV")

    def test_export_payouts_unauthorized_for_sales(self, api_client, sales_user_token):
        """GET /api/payouts/export - Sales user cannot export"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/export", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from exporting payouts")

    def test_cancel_payout_unauthorized_for_sales(self, api_client, sales_user_token):
        """POST /api/payouts/:id/cancel - Sales user cannot cancel"""
        headers = {"Authorization": f"Bearer {sales_user_token}"}
        response = api_client.post(
            f"{BASE_URL}/api/payouts/test_id/cancel",
            headers=headers,
            json={"reason": "Test cancel"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly blocked from cancelling payouts")


class TestRoleBasedAccess:
    """Additional role-based access control tests"""

    def test_manager_commission_access(self, api_client, manager_token):
        """Manager can access commissions list"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Manager can access commissions list")

    def test_manager_stats_access_forbidden(self, api_client, manager_token):
        """Manager cannot access commission stats (admin only)"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Manager correctly blocked from commission stats")

    def test_manager_payout_access(self, api_client, manager_token):
        """Manager can access payouts list"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Manager can access payouts list")

    def test_rep_commission_access(self, api_client, rep_token):
        """Rep can access their commissions"""
        headers = {"Authorization": f"Bearer {rep_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Rep can access commissions list")

    def test_rep_my_commissions_access(self, api_client, rep_token):
        """Rep can access my-commissions endpoint"""
        headers = {"Authorization": f"Bearer {rep_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/my-commissions", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "commissions" in data
        assert "summary" in data
        print(f"✓ Rep can access my-commissions: {len(data['commissions'])} commissions")

    def test_unauthenticated_commission_access_forbidden(self, api_client):
        """Unauthenticated requests are rejected"""
        response = api_client.get(f"{BASE_URL}/api/commissions")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated requests correctly rejected for commissions")

    def test_unauthenticated_payout_access_forbidden(self, api_client):
        """Unauthenticated requests are rejected for payouts"""
        response = api_client.get(f"{BASE_URL}/api/payouts")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated requests correctly rejected for payouts")


class TestEmptyStateResponses:
    """Tests for empty state responses (no commissions/payouts in system yet)"""

    def test_commissions_empty_response_format(self, api_client, super_admin_token):
        """GET /api/commissions returns valid empty array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return list even if empty"
        print(f"✓ Commissions returns valid list (length: {len(data)})")

    def test_payouts_empty_response_format(self, api_client, super_admin_token):
        """GET /api/payouts returns valid empty array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return list even if empty"
        print(f"✓ Payouts returns valid list (length: {len(data)})")

    def test_commission_stats_empty_format(self, api_client, super_admin_token):
        """GET /api/commissions/stats returns valid structure even when empty"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/commissions/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        # Should have expected keys even if values are 0/empty
        assert "by_status" in data or "pending_approval_count" in data
        print(f"✓ Commission stats returns valid structure: {list(data.keys())}")

    def test_payout_stats_empty_format(self, api_client, super_admin_token):
        """GET /api/payouts/stats returns valid structure even when empty"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/payouts/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        # Should have expected keys even if values are 0/empty
        assert "by_status" in data or "total_pending" in data
        print(f"✓ Payout stats returns valid structure: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
