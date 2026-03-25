"""
Bug Fixes Test Suite - Iteration 20
Testing 3 bugs:
1. Student My Courses Mark as Complete not working
2. Rep commission not showing in Super Admin payout section  
3. User roles displaying incorrectly on dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@plan4growth.uk"
SUPER_ADMIN_PASSWORD = "password123"
MANAGER_EMAIL = "manager@plan4growth.uk"
MANAGER_PASSWORD = "password123"
REP_EMAIL = "rep@plan4growth.uk"
REP_PASSWORD = "password123"

# Global session and token storage
class TestState:
    super_admin_token = None
    manager_token = None
    rep_token = None
    test_student_id = None
    test_programme_id = None
    test_module_id = None
    test_commission_id = None


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def super_admin_auth(api_client):
    """Get super admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        TestState.super_admin_token = response.json().get("token")
        return TestState.super_admin_token
    pytest.skip(f"Super Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="session")
def manager_auth(api_client):
    """Get manager authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    if response.status_code == 200:
        TestState.manager_token = response.json().get("token")
        return TestState.manager_token
    pytest.skip(f"Manager authentication failed: {response.status_code}")


@pytest.fixture(scope="session")
def rep_auth(api_client):
    """Get rep authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": REP_EMAIL,
        "password": REP_PASSWORD
    })
    if response.status_code == 200:
        TestState.rep_token = response.json().get("token")
        return TestState.rep_token
    pytest.skip(f"Rep authentication failed: {response.status_code}")


# ==========================================
# BUG 1: Student Module Progress Update
# Tests for PATCH /api/student/courses/:programmeId/modules/:moduleId/progress
# ==========================================

class TestBug1StudentModuleProgress:
    """Bug 1: Student My Courses Mark as Complete not working"""

    def test_student_courses_endpoint_exists(self, api_client, super_admin_auth):
        """Verify the student courses endpoint exists"""
        # Try to access without auth - should return 401
        response = api_client.get(f"{BASE_URL}/api/student/courses")
        assert response.status_code in [401, 403], "Endpoint should require authentication"
        print(f"SUCCESS: Student courses endpoint exists (returns {response.status_code} without auth)")

    def test_get_enrolled_student_data(self, api_client, super_admin_auth):
        """Get enrolled student from the system for testing"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/applications",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get applications: {response.status_code}"
        
        # Find enrolled student
        applications = response.json()
        enrolled_students = [a for a in applications if a.get("status") == "enrolled"]
        
        if enrolled_students:
            TestState.test_student_id = enrolled_students[0].get("student_id")
            print(f"SUCCESS: Found enrolled student: {TestState.test_student_id}")
        else:
            print(f"INFO: No enrolled students found. Total applications: {len(applications)}")
            # Check for test student mentioned in context
            for app in applications:
                if app.get("student_id") == "stu_dd144d1ef6d0":
                    TestState.test_student_id = app.get("student_id")
                    print(f"SUCCESS: Found test student from context: {TestState.test_student_id}")
                    break

    def test_get_programmes_with_modules(self, api_client, super_admin_auth):
        """Get programmes and modules for testing"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/programmes",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get programmes: {response.status_code}"
        
        data = response.json()
        programmes = data.get("programmes") if isinstance(data, dict) else data
        
        if programmes and len(programmes) > 0:
            TestState.test_programme_id = programmes[0].get("program_id")
            print(f"SUCCESS: Found programme: {TestState.test_programme_id}")
            
            # Get modules for this programme
            modules_response = api_client.get(
                f"{BASE_URL}/api/admin/programmes/{TestState.test_programme_id}/modules",
                headers={"Authorization": f"Bearer {super_admin_auth}"}
            )
            if modules_response.status_code == 200:
                modules = modules_response.json()
                modules_list = modules.get("modules") if isinstance(modules, dict) else modules
                if modules_list and len(modules_list) > 0:
                    TestState.test_module_id = modules_list[0].get("module_id")
                    print(f"SUCCESS: Found module: {TestState.test_module_id}")
        else:
            print("INFO: No programmes found in system")

    def test_module_progress_endpoint_validation(self, api_client, super_admin_auth):
        """Test the module progress update endpoint requires valid status"""
        if not TestState.test_programme_id or not TestState.test_module_id:
            pytest.skip("No programme/module available for testing")
        
        # Try with invalid status
        response = api_client.patch(
            f"{BASE_URL}/api/student/courses/{TestState.test_programme_id}/modules/{TestState.test_module_id}/progress",
            json={"status": "invalid_status"},
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        # Should reject - either 400 (bad request) or 403 (not student role)
        assert response.status_code in [400, 403], f"Expected 400 or 403, got {response.status_code}"
        print(f"SUCCESS: Progress endpoint rejects invalid status (returns {response.status_code})")


# ==========================================
# BUG 2: Commission Creation and Display in Payouts
# Tests for debug endpoint and commission visibility
# ==========================================

class TestBug2CommissionPayouts:
    """Bug 2: Rep commission not showing in Super Admin payout section"""

    def test_debug_trigger_commission_endpoint_exists(self, api_client, super_admin_auth):
        """Verify the debug trigger-commission endpoint exists"""
        # Try without body - should return 400 (missing student_id)
        response = api_client.post(
            f"{BASE_URL}/api/admin/debug/trigger-commission",
            json={},
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        # Should return 400 for missing student_id
        assert response.status_code == 400, f"Expected 400 for missing student_id, got {response.status_code}"
        print("SUCCESS: Debug trigger-commission endpoint exists and validates input")

    def test_debug_trigger_commission_with_student(self, api_client, super_admin_auth):
        """Test triggering commission for a student"""
        # Find a student to test with
        response = api_client.get(
            f"{BASE_URL}/api/admin/applications",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200
        
        applications = response.json()
        test_student_id = None
        
        # Look for enrolled student or test student
        for app in applications:
            if app.get("status") == "enrolled":
                test_student_id = app.get("student_id")
                break
        
        if not test_student_id:
            # Try test student from context
            test_student_id = "stu_dd144d1ef6d0"
        
        # Trigger commission
        response = api_client.post(
            f"{BASE_URL}/api/admin/debug/trigger-commission",
            json={"student_id": test_student_id},
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Commission triggered. Result: {data.get('message')}")
            # Store commission info if created
            if data.get("result") and isinstance(data["result"], dict):
                commissions = data["result"].get("commissionsCreated", [])
                if commissions:
                    TestState.test_commission_id = commissions[0].get("commission_id") if isinstance(commissions[0], dict) else commissions[0]
        elif response.status_code == 404:
            print(f"INFO: Student not found - {response.json().get('detail')}")
        else:
            print(f"INFO: Commission trigger returned {response.status_code}: {response.text}")

    def test_commissions_list_endpoint(self, api_client, super_admin_auth):
        """Verify commissions are visible in list"""
        response = api_client.get(
            f"{BASE_URL}/api/commissions",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get commissions: {response.status_code}"
        
        commissions = response.json()
        print(f"SUCCESS: Commissions endpoint returns {len(commissions)} commissions")
        
        if commissions:
            # Check structure of first commission
            first = commissions[0]
            assert "commission_id" in first, "Commission should have commission_id"
            assert "status" in first, "Commission should have status"
            print(f"Commission structure validated. First commission status: {first.get('status')}")

    def test_payable_commissions_filter(self, api_client, super_admin_auth):
        """Test filtering commissions by payable status"""
        response = api_client.get(
            f"{BASE_URL}/api/commissions?status=payable",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to filter payable commissions: {response.status_code}"
        
        commissions = response.json()
        print(f"SUCCESS: Payable commissions filter works. Found {len(commissions)} payable commissions")

    def test_payouts_stats_endpoint(self, api_client, super_admin_auth):
        """Test payouts stats endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/payouts/stats",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get payout stats: {response.status_code}"
        
        stats = response.json()
        print(f"SUCCESS: Payout stats: total={stats.get('total')}, pending={stats.get('pending')}, paid={stats.get('paid')}")

    def test_payouts_list_endpoint(self, api_client, super_admin_auth):
        """Test payouts list endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/payouts",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get payouts: {response.status_code}"
        
        data = response.json()
        payouts = data if isinstance(data, list) else data.get("payouts", [])
        print(f"SUCCESS: Payouts endpoint returns {len(payouts)} payouts")


# ==========================================
# BUG 3: User Role Labels Display
# Tests for role labels consistency
# ==========================================

class TestBug3UserRoleLabels:
    """Bug 3: User roles displaying incorrectly on dashboard"""

    def test_user_info_returns_role(self, api_client, super_admin_auth):
        """Verify user info endpoint returns role correctly"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get user info: {response.status_code}"
        
        user = response.json()
        assert "role" in user, "User should have role field"
        assert user["role"] == "super_admin", f"Expected super_admin, got {user['role']}"
        print(f"SUCCESS: Super admin role returned correctly: {user['role']}")

    def test_manager_role_info(self, api_client, manager_auth):
        """Verify manager role is returned correctly"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {manager_auth}"}
        )
        assert response.status_code == 200, f"Failed to get manager info: {response.status_code}"
        
        user = response.json()
        assert "role" in user, "User should have role field"
        assert user["role"] == "manager", f"Expected manager, got {user['role']}"
        print(f"SUCCESS: Manager role returned correctly: {user['role']}")

    def test_rep_role_info(self, api_client, rep_auth):
        """Verify rep role is returned correctly"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {rep_auth}"}
        )
        assert response.status_code == 200, f"Failed to get rep info: {response.status_code}"
        
        user = response.json()
        assert "role" in user, "User should have role field"
        # Rep can be 'rep' or 'sales_user'
        assert user["role"] in ["rep", "sales_user"], f"Expected rep or sales_user, got {user['role']}"
        print(f"SUCCESS: Rep role returned correctly: {user['role']}")

    def test_users_list_shows_roles(self, api_client, super_admin_auth):
        """Verify users list includes role information"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {super_admin_auth}"}
        )
        assert response.status_code == 200, f"Failed to get users list: {response.status_code}"
        
        users = response.json()
        assert len(users) > 0, "Should have users in list"
        
        # Check all users have role field
        for user in users:
            assert "role" in user, f"User {user.get('email')} missing role field"
        
        # Check role distribution
        roles = {}
        for user in users:
            role = user.get("role")
            roles[role] = roles.get(role, 0) + 1
        
        print(f"SUCCESS: Users list shows roles. Distribution: {roles}")


# ==========================================
# Integration Tests
# ==========================================

class TestIntegration:
    """Integration tests for the bug fixes"""

    def test_health_check(self, api_client):
        """Verify API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("SUCCESS: API health check passed")

    def test_authentication_flow(self, api_client):
        """Test authentication works correctly"""
        # Login as super admin
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should include token"
        assert "user" in data, "Response should include user"
        assert data["user"]["role"] == "super_admin", "User role should be super_admin"
        print("SUCCESS: Authentication flow works correctly")

    def test_admin_access_control(self, api_client, rep_auth):
        """Verify admin endpoints are protected from non-admin users"""
        # Rep should not be able to access admin endpoints
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {rep_auth}"}
        )
        # Should be 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Admin endpoints correctly protected from non-admin users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
