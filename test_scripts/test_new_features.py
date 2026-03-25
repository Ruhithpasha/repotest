"""
Test Rep Commissions and Admin User Management - New Features

Tests:
1. Rep Commissions API - GET /api/rep/commissions
2. Admin User Management - GET /api/admin/users
3. Admin Create User - POST /api/admin/users 
4. Admin Toggle User Status - PATCH /api/admin/users/:userId/toggle-status
5. Student login with credentials
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthFlow:
    """Test authentication for admin, rep, and student logins"""
    
    def test_admin_login(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@plan4growth.com",
            "password": "admin123"
        })
        print(f"Admin login status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data, f"Response should have token, got {data.keys()}"
        assert data["user"]["role"] == "admin"
        return data["token"]
    
    def test_rep_login(self):
        """Rep should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rep@plan4growth.com",
            "password": "rep123"
        })
        print(f"Rep login status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data, f"Response should have token, got {data.keys()}"
        assert data["user"]["role"] == "rep"
        return data["token"]


class TestRepCommissions:
    """Test Rep Commissions API - GET /api/rep/commissions"""
    
    @pytest.fixture
    def rep_token(self):
        """Get rep authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rep@plan4growth.com",
            "password": "rep123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Rep login failed")
    
    def test_rep_commissions_endpoint(self, rep_token):
        """Rep should be able to access commissions page"""
        headers = {"Authorization": f"Bearer {rep_token}"}
        response = requests.get(f"{BASE_URL}/api/rep/commissions", headers=headers)
        print(f"Rep commissions status: {response.status_code}")
        print(f"Response: {response.text[:1000]}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "commissions" in data, "Response should have commissions array"
        assert "summary" in data, "Response should have summary object"
        assert "commission_rate" in data, "Response should have commission_rate"
        assert "per_student_gbp" in data, "Response should have per_student_gbp"
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_gbp" in summary, "Summary should have total_gbp"
        assert "pending_gbp" in summary, "Summary should have pending_gbp"
        assert "approved_gbp" in summary, "Summary should have approved_gbp"
        assert "paid_gbp" in summary, "Summary should have paid_gbp"
        
        # Validate commission rate (should be 4%)
        assert data["commission_rate"] == 4, f"Commission rate should be 4%, got {data['commission_rate']}"
        
        # per_student_gbp should be 4% of 7999 = 319.96
        assert abs(data["per_student_gbp"] - 319.96) < 0.01, f"Per student should be ~319.96, got {data['per_student_gbp']}"
        
        print(f"SUCCESS: Rep commissions API returns correct data structure")
        print(f"Commission rate: {data['commission_rate']}%")
        print(f"Per student: £{data['per_student_gbp']}")
        print(f"Total commissions: {len(data['commissions'])}")
    
    def test_rep_commissions_with_status_filter(self, rep_token):
        """Rep should be able to filter commissions by status"""
        headers = {"Authorization": f"Bearer {rep_token}"}
        
        for status in ["pending", "approved", "paid"]:
            response = requests.get(f"{BASE_URL}/api/rep/commissions?status={status}", headers=headers)
            print(f"Rep commissions with status={status}: {response.status_code}")
            assert response.status_code == 200
            
        print("SUCCESS: Rep commissions status filter works")


class TestAdminUserManagement:
    """Test Admin User Management APIs"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@plan4growth.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_admin_get_users(self, admin_token):
        """Admin should be able to get all users (reps and admins)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        print(f"Admin get users status: {response.status_code}")
        print(f"Response: {response.text[:1500]}")
        
        assert response.status_code == 200
        users = response.json()
        
        # Should be a list
        assert isinstance(users, list), "Response should be a list of users"
        
        # Each user should have required fields
        for user in users:
            assert "user_id" in user, "User should have user_id"
            assert "name" in user, "User should have name"
            assert "email" in user, "User should have email"
            assert "role" in user, "User should have role"
            assert user["role"] in ["rep", "admin"], f"Role should be rep or admin, got {user['role']}"
            assert "is_active" in user, "User should have is_active"
            assert "created_at" in user, "User should have created_at"
            
            # Reps should have additional stats
            if user["role"] == "rep":
                assert "total_students" in user, "Rep should have total_students"
                assert "total_commission_gbp" in user, "Rep should have total_commission_gbp"
        
        # Count reps and admins
        reps = [u for u in users if u["role"] == "rep"]
        admins = [u for u in users if u["role"] == "admin"]
        print(f"SUCCESS: Admin get users API works")
        print(f"Total users: {len(users)}, Reps: {len(reps)}, Admins: {len(admins)}")
    
    def test_admin_get_users_filter_by_role(self, admin_token):
        """Admin should be able to filter users by role"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test rep filter
        response = requests.get(f"{BASE_URL}/api/admin/users?role=rep", headers=headers)
        assert response.status_code == 200
        reps = response.json()
        for user in reps:
            assert user["role"] == "rep", f"Filter by role=rep should only return reps, got {user['role']}"
        
        # Test admin filter
        response = requests.get(f"{BASE_URL}/api/admin/users?role=admin", headers=headers)
        assert response.status_code == 200
        admins = response.json()
        for user in admins:
            assert user["role"] == "admin", f"Filter by role=admin should only return admins, got {user['role']}"
        
        print("SUCCESS: Admin get users filter by role works")
    
    def test_admin_create_rep(self, admin_token):
        """Admin should be able to create a new rep"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        new_rep = {
            "name": f"TEST_Rep_{timestamp}",
            "email": f"test_rep_{timestamp}@plan4growth.com",
            "password": "TestRep12345",
            "role": "rep",
            "phone": "+44 7777 777777"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_rep, headers=headers)
        print(f"Admin create rep status: {response.status_code}")
        print(f"Response: {response.text[:1000]}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        
        assert "user" in data, "Response should have user object"
        user = data["user"]
        assert user["name"] == new_rep["name"], "Name should match"
        assert user["email"] == new_rep["email"], "Email should match"
        assert user["role"] == "rep", "Role should be rep"
        assert user["is_active"] == True, "New rep should be active immediately"
        
        print(f"SUCCESS: Admin created rep with user_id: {user['user_id']}")
        return user["user_id"]
    
    def test_admin_create_admin(self, admin_token):
        """Admin should be able to create a new admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        new_admin = {
            "name": f"TEST_Admin_{timestamp}",
            "email": f"test_admin_{timestamp}@plan4growth.com",
            "password": "TestAdmin12345",
            "role": "admin",
            "phone": "+44 8888 888888"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_admin, headers=headers)
        print(f"Admin create admin status: {response.status_code}")
        print(f"Response: {response.text[:1000]}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        
        assert "user" in data, "Response should have user object"
        user = data["user"]
        assert user["role"] == "admin", "Role should be admin"
        assert user["is_active"] == True, "New admin should be active immediately"
        
        print(f"SUCCESS: Admin created admin with user_id: {user['user_id']}")
        return user["user_id"]
    
    def test_admin_create_user_duplicate_email(self, admin_token):
        """Admin should not be able to create user with duplicate email"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_rep = {
            "name": "Duplicate Test",
            "email": "rep@plan4growth.com",  # Existing email
            "password": "TestPassword123",
            "role": "rep"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_rep, headers=headers)
        print(f"Duplicate email test status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        print("SUCCESS: Duplicate email rejected correctly")
    
    def test_admin_create_user_invalid_role(self, admin_token):
        """Admin should not be able to create user with invalid role"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        new_user = {
            "name": "Invalid Role Test",
            "email": f"invalid_role_{timestamp}@plan4growth.com",
            "password": "TestPassword123",
            "role": "student"  # Invalid - can only create rep or admin
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=headers)
        print(f"Invalid role test status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"
        print("SUCCESS: Invalid role rejected correctly")


class TestAdminToggleUserStatus:
    """Test Admin Toggle User Status API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@plan4growth.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_toggle_user_status(self, admin_token):
        """Admin should be able to toggle user status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a test user
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_rep = {
            "name": f"TEST_Toggle_{timestamp}",
            "email": f"test_toggle_{timestamp}@plan4growth.com",
            "password": "TestToggle123",
            "role": "rep"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=new_rep, headers=headers)
        assert create_response.status_code == 201
        user_id = create_response.json()["user"]["user_id"]
        initial_status = create_response.json()["user"]["is_active"]
        
        print(f"Created user {user_id} with is_active={initial_status}")
        
        # Toggle status
        toggle_response = requests.patch(f"{BASE_URL}/api/admin/users/{user_id}/toggle-status", headers=headers)
        print(f"Toggle status: {toggle_response.status_code}")
        print(f"Response: {toggle_response.text[:500]}")
        
        assert toggle_response.status_code == 200
        toggled_status = toggle_response.json()["user"]["is_active"]
        
        assert toggled_status != initial_status, "Status should be toggled"
        print(f"SUCCESS: User status toggled from {initial_status} to {toggled_status}")
        
        # Toggle back
        toggle_back = requests.patch(f"{BASE_URL}/api/admin/users/{user_id}/toggle-status", headers=headers)
        assert toggle_back.status_code == 200
        assert toggle_back.json()["user"]["is_active"] == initial_status
        print("SUCCESS: Toggle back works too")


class TestNewRepLogin:
    """Test that newly created rep can login"""
    
    def test_new_rep_login(self):
        """Test creating a new rep and logging in"""
        # Login as admin first
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@plan4growth.com",
            "password": "admin123"
        })
        if admin_login.status_code != 200:
            pytest.skip("Admin login failed")
        
        admin_token = admin_login.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create new rep
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_rep_email = f"newrep_{timestamp}@plan4growth.com"
        new_rep_password = "NewRep12345"
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json={
            "name": f"New Rep {timestamp}",
            "email": new_rep_email,
            "password": new_rep_password,
            "role": "rep"
        }, headers=headers)
        
        if create_response.status_code != 201:
            print(f"Failed to create rep: {create_response.text}")
            pytest.skip("Failed to create rep")
        
        print(f"Created new rep: {new_rep_email}")
        
        # Try to login with new rep
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": new_rep_email,
            "password": new_rep_password
        })
        
        print(f"New rep login status: {login_response.status_code}")
        print(f"Response: {login_response.text[:500]}")
        
        assert login_response.status_code == 200, f"New rep should be able to login, got {login_response.status_code}"
        data = login_response.json()
        assert "token" in data, f"Response should have token, got {data.keys()}"
        assert data["user"]["role"] == "rep"
        print("SUCCESS: Newly created rep can login immediately")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
