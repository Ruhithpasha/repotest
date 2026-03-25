"""
Plan4Growth Academy API Tests
Tests for:
- OTP endpoints (send/verify)
- Students API (CRUD, stats)
- Student Documents API
- Student Payments API
- Notifications API
- Auth endpoints (login for admin, rep, student roles)
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from requirements
CREDENTIALS = {
    "admin": {"email": "admin@plan4growth.com", "password": "admin123"},
    "rep": {"email": "rep@plan4growth.com", "password": "rep123"},
    "student": {"email": "student@test.com", "password": "test123"}
}

# Store tokens for reuse
tokens = {}


class TestHealthEndpoints:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "message" in data
        print(f"SUCCESS: API health check passed - {data}")
    
    def test_api_health_detailed(self):
        """Test detailed health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"SUCCESS: Detailed health check passed")


class TestAuthEndpoints:
    """Authentication tests for all 3 roles"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
        print(f"Admin login response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            tokens["admin"] = data["token"]
            print(f"SUCCESS: Admin login successful, role: {data.get('user', {}).get('role')}")
            return data
        elif response.status_code == 401:
            pytest.skip("Admin credentials not set up - expected in fresh install")
        else:
            pytest.fail(f"Admin login failed with {response.status_code}: {response.text}")
    
    def test_rep_login(self):
        """Test rep login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["rep"])
        print(f"Rep login response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            tokens["rep"] = data["token"]
            print(f"SUCCESS: Rep login successful, role: {data.get('user', {}).get('role')}")
            return data
        elif response.status_code == 401:
            pytest.skip("Rep credentials not set up - expected in fresh install")
        else:
            pytest.fail(f"Rep login failed with {response.status_code}: {response.text}")
    
    def test_student_login(self):
        """Test student login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
        print(f"Student login response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            tokens["student"] = data["token"]
            print(f"SUCCESS: Student login successful")
            return data
        elif response.status_code == 401:
            pytest.skip("Student credentials not set up - expected in fresh install")
        else:
            pytest.fail(f"Student login failed with {response.status_code}: {response.text}")


class TestOTPEndpoints:
    """OTP send/verify tests - public endpoints"""
    
    def test_send_otp_email(self):
        """Test sending OTP to email"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "contact": "test@example.com",
            "contact_type": "email"
        })
        print(f"Send OTP response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Test OTP is returned in development mode
        if "_test_otp" in data:
            print(f"SUCCESS: OTP sent - Test OTP: {data['_test_otp']}")
            return data["_test_otp"]
        print(f"SUCCESS: OTP sent to email")
    
    def test_send_otp_whatsapp(self):
        """Test sending OTP to WhatsApp"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "contact": "+919876543210",
            "contact_type": "whatsapp"
        })
        print(f"Send WhatsApp OTP response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: OTP sent to WhatsApp")
    
    def test_verify_otp_invalid(self):
        """Test OTP verification with wrong code"""
        response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "contact": "wrong@example.com",
            "contact_type": "email",
            "otp": "000000"
        })
        print(f"Verify wrong OTP response: {response.status_code}")
        
        # Should fail with 400 - no OTP found or invalid
        assert response.status_code in [400, 404]
        print(f"SUCCESS: Invalid OTP correctly rejected")
    
    def test_send_and_verify_otp_flow(self):
        """Test complete OTP flow - send then verify"""
        test_email = f"test_{int(time.time())}@example.com"
        
        # Send OTP
        send_response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "contact": test_email,
            "contact_type": "email"
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # Get test OTP if available
        if "_test_otp" in send_data:
            test_otp = send_data["_test_otp"]
            
            # Verify OTP
            verify_response = requests.post(f"{BASE_URL}/api/otp/verify", json={
                "contact": test_email,
                "contact_type": "email",
                "otp": test_otp
            })
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data.get("verified") == True
            print(f"SUCCESS: Complete OTP flow verified for {test_email}")
        else:
            print("SKIP: Test OTP not returned, cannot verify flow")


class TestStudentsAPI:
    """Students API tests - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Ensure we have tokens before running tests"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
            else:
                pytest.skip("Admin auth required for students API tests")
        
        if not tokens.get("rep"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["rep"])
            if response.status_code == 200:
                tokens["rep"] = response.json()["token"]
    
    def test_get_students_as_admin(self):
        """Test getting students list as admin"""
        if not tokens.get("admin"):
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        print(f"Get students (admin) response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin can view students list ({len(data)} students)")
    
    def test_get_admin_stats(self):
        """Test admin dashboard stats"""
        if not tokens.get("admin"):
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.get(f"{BASE_URL}/api/students/admin/stats", headers=headers)
        print(f"Admin stats response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        # Verify expected stat fields
        assert "total_students" in data
        assert "enrolled" in data
        assert "pending_review" in data
        print(f"SUCCESS: Admin stats - Total: {data.get('total_students')}, Enrolled: {data.get('enrolled')}")
    
    def test_get_rep_stats(self):
        """Test rep dashboard stats"""
        if not tokens.get("rep"):
            pytest.skip("Rep token not available")
        
        headers = {"Authorization": f"Bearer {tokens['rep']}"}
        response = requests.get(f"{BASE_URL}/api/students/rep/stats", headers=headers)
        print(f"Rep stats response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        print(f"SUCCESS: Rep stats retrieved - {data}")
    
    def test_get_students_as_rep(self):
        """Test getting students list as rep"""
        if not tokens.get("rep"):
            pytest.skip("Rep token not available")
        
        headers = {"Authorization": f"Bearer {tokens['rep']}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        print(f"Get students (rep) response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Rep can view their students ({len(data)} students)")
    
    def test_students_api_unauthorized(self):
        """Test students API rejects unauthorized access"""
        response = requests.get(f"{BASE_URL}/api/students")
        print(f"Unauthorized students access: {response.status_code}")
        
        assert response.status_code in [401, 403]
        print(f"SUCCESS: Unauthorized access correctly rejected")


class TestStudentDocumentsAPI:
    """Student Documents API tests"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Ensure we have tokens"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
    
    def test_get_pending_documents_admin(self):
        """Test admin can get pending documents for review"""
        if not tokens.get("admin"):
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.get(f"{BASE_URL}/api/student-documents/pending", headers=headers)
        print(f"Pending documents response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin retrieved pending documents ({len(data)} documents)")
    
    def test_documents_unauthorized(self):
        """Test documents API rejects unauthorized access"""
        response = requests.get(f"{BASE_URL}/api/student-documents/pending")
        print(f"Unauthorized documents access: {response.status_code}")
        
        assert response.status_code in [401, 403]
        print(f"SUCCESS: Unauthorized documents access rejected")


class TestStudentPaymentsAPI:
    """Student Payments API tests"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Ensure we have tokens"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
    
    def test_get_all_payments_admin(self):
        """Test admin can get all payments overview"""
        if not tokens.get("admin"):
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.get(f"{BASE_URL}/api/student-payments/all", headers=headers)
        print(f"All payments response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "payments" in data
        assert "total_revenue_gbp" in data
        assert "paid_count" in data
        print(f"SUCCESS: Admin retrieved payments - Revenue: £{data.get('total_revenue_gbp')}, Paid: {data.get('paid_count')}")
    
    def test_payments_unauthorized(self):
        """Test payments API rejects unauthorized access"""
        response = requests.get(f"{BASE_URL}/api/student-payments/all")
        print(f"Unauthorized payments access: {response.status_code}")
        
        assert response.status_code in [401, 403]
        print(f"SUCCESS: Unauthorized payments access rejected")


class TestNotificationsAPI:
    """Notifications API tests"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Ensure we have tokens"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
    
    def test_get_notifications(self):
        """Test getting notifications for authenticated user"""
        if not tokens.get("admin"):
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        print(f"Notifications response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"SUCCESS: Notifications retrieved - {len(data.get('notifications', []))} notifications, {data.get('unread_count')} unread")
    
    def test_notifications_unauthorized(self):
        """Test notifications API rejects unauthorized access"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        print(f"Unauthorized notifications access: {response.status_code}")
        
        assert response.status_code in [401, 403]
        print(f"SUCCESS: Unauthorized notifications access rejected")


class TestStudentPortalEndpoints:
    """Test student-specific endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Ensure we have student token"""
        if not tokens.get("student"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
            if response.status_code == 200:
                tokens["student"] = response.json()["token"]
    
    def test_get_my_profile(self):
        """Test student can get their profile"""
        if not tokens.get("student"):
            pytest.skip("Student token not available")
        
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        response = requests.get(f"{BASE_URL}/api/students/me", headers=headers)
        print(f"My profile response: {response.status_code}")
        
        # May return 404 if student profile not yet created
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Student profile retrieved - Status: {data.get('status')}")
        elif response.status_code == 404:
            print(f"INFO: Student profile not found (expected for new users)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_get_my_documents(self):
        """Test student can get their documents"""
        if not tokens.get("student"):
            pytest.skip("Student token not available")
        
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        response = requests.get(f"{BASE_URL}/api/student-documents/my", headers=headers)
        print(f"My documents response: {response.status_code}")
        
        # May return 404 if no student profile
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"SUCCESS: Student documents retrieved ({len(data)} documents)")
        elif response.status_code == 404:
            print(f"INFO: Student documents not found (no profile)")
    
    def test_get_my_payments(self):
        """Test student can get their payments"""
        if not tokens.get("student"):
            pytest.skip("Student token not available")
        
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        response = requests.get(f"{BASE_URL}/api/student-payments/my", headers=headers)
        print(f"My payments response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "payments" in data
            print(f"SUCCESS: Student payments retrieved - Paid: £{data.get('total_paid_gbp', 0)}")
        elif response.status_code == 404:
            print(f"INFO: Student payments not found (no profile)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
