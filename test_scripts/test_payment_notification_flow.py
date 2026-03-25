"""
Plan4Growth Academy - Payment Flow and Notification Tests
Tests for:
- Payment config endpoint (mock mode)
- Payment info endpoint
- Checkout session creation (mock mode)
- Payment status endpoint
- Notification config endpoint
- Admin test notification endpoint
- Login for admin, rep, and student accounts
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials for testing
CREDENTIALS = {
    "admin": {"email": "admin@plan4growth.uk", "password": "password123"},
    "rep": {"email": "rep@plan4growth.uk", "password": "password123"},
    "student": {"email": "student@test.com", "password": "student123"}
}

# Store tokens for reuse
tokens = {}


class TestLoginEndpoints:
    """Test login for all three user roles"""
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
        print(f"Admin login response: {response.status_code}")
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user info in response"
        assert data["user"]["role"] == "admin", f"Role mismatch: expected admin, got {data['user']['role']}"
        tokens["admin"] = data["token"]
        print(f"SUCCESS: Admin login - user: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_rep_login(self):
        """Test rep login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["rep"])
        print(f"Rep login response: {response.status_code}")
        
        assert response.status_code == 200, f"Rep login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "rep", f"Role mismatch: expected rep, got {data['user']['role']}"
        tokens["rep"] = data["token"]
        print(f"SUCCESS: Rep login - user: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_student_login(self):
        """Test student login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
        print(f"Student login response: {response.status_code}")
        
        assert response.status_code == 200, f"Student login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "student", f"Role mismatch: expected student, got {data['user']['role']}"
        tokens["student"] = data["token"]
        print(f"SUCCESS: Student login - user: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials is rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        print(f"Invalid login response: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid credentials correctly rejected")


class TestPaymentConfigEndpoint:
    """Test payment configuration endpoint"""
    
    def test_payment_config_returns_mock_mode(self):
        """Test /api/payments/config returns mock mode status"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        print(f"Payment config response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify mock mode fields
        assert "mode" in data, "Missing 'mode' field"
        assert data["mode"] == "mock", f"Expected mock mode, got {data['mode']}"
        assert "course_fee_gbp" in data, "Missing 'course_fee_gbp' field"
        assert data["course_fee_gbp"] == 7999, f"Course fee should be 7999, got {data['course_fee_gbp']}"
        assert "message" in data, "Missing 'message' field"
        assert "MOCK" in data["message"], "Message should mention MOCK mode"
        
        print(f"SUCCESS: Payment config - mode={data['mode']}, fee=£{data['course_fee_gbp']}, commission={data.get('commission_rate')}%")


class TestNotificationConfigEndpoint:
    """Test notification configuration endpoint"""
    
    def test_notification_config_returns_mock_mode(self):
        """Test /api/notifications/config returns mock mode status"""
        response = requests.get(f"{BASE_URL}/api/notifications/config")
        print(f"Notification config response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify mock mode fields
        assert "mode" in data, "Missing 'mode' field"
        assert data["mode"] == "mock", f"Expected mock mode, got {data['mode']}"
        assert "provider" in data, "Missing 'provider' field"
        assert data["provider"] == "GoHighLevel", f"Provider should be GoHighLevel, got {data['provider']}"
        assert "configured" in data, "Missing 'configured' field"
        assert data["configured"] == False, "In mock mode, configured should be false"
        
        print(f"SUCCESS: Notification config - mode={data['mode']}, provider={data['provider']}")


class TestAdminNotificationEndpoint:
    """Test admin test notification endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_admin_token(self):
        """Get admin token before tests"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
            else:
                pytest.skip("Admin auth required for notification tests")
    
    def test_admin_test_email_notification(self):
        """Test admin can send test email notification"""
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/test/email",
            headers=headers,
            json={"email": "test@example.com", "type": "ACCOUNT_ACTIVATION"}
        )
        print(f"Test email response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200, f"Test email failed: {response.text}"
        data = response.json()
        
        # Verify mock email response
        assert data.get("success") == True, "Email should succeed"
        assert data.get("mock") == True, "Should be mock mode"
        assert "messageId" in data, "Should have messageId"
        assert data.get("template") == "ACCOUNT_ACTIVATION", "Template should match"
        
        print(f"SUCCESS: Admin test email - mock={data['mock']}, messageId={data['messageId']}")
    
    def test_admin_test_sms_notification(self):
        """Test admin can send test SMS notification"""
        headers = {"Authorization": f"Bearer {tokens['admin']}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/test/sms",
            headers=headers,
            json={"phone": "+447777777777", "type": "ACCOUNT_ACTIVATION"}
        )
        print(f"Test SMS response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200, f"Test SMS failed: {response.text}"
        data = response.json()
        
        # Verify mock SMS response
        assert data.get("success") == True, "SMS should succeed"
        assert data.get("mock") == True, "Should be mock mode"
        
        print(f"SUCCESS: Admin test SMS - mock={data['mock']}")
    
    def test_non_admin_cannot_send_test_notification(self):
        """Test non-admin users cannot send test notifications"""
        # Get student token
        if not tokens.get("student"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
            if response.status_code == 200:
                tokens["student"] = response.json()["token"]
            else:
                pytest.skip("Student token needed")
        
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/test/email",
            headers=headers,
            json={"email": "test@example.com"}
        )
        print(f"Student test email response: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("SUCCESS: Non-admin correctly rejected from test notification endpoint")


class TestStudentPaymentInfo:
    """Test student payment info endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_student_token(self):
        """Get student token before tests"""
        if not tokens.get("student"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
            if response.status_code == 200:
                tokens["student"] = response.json()["token"]
            else:
                pytest.skip("Student auth required for payment tests")
    
    def test_student_payment_info(self):
        """Test /api/payments/my-info returns correct payment status"""
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        print(f"Payment info response: {response.status_code} - {response.text[:400]}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify payment info structure
        assert "student_id" in data, "Missing student_id"
        assert "status" in data, "Missing status"
        assert "course_fee_gbp" in data, "Missing course_fee_gbp"
        assert data["course_fee_gbp"] == 7999, f"Course fee should be 7999, got {data['course_fee_gbp']}"
        assert "stripe_mode" in data, "Missing stripe_mode"
        assert data["stripe_mode"] == "mock", f"Should be mock mode, got {data['stripe_mode']}"
        assert "payments" in data, "Missing payments array"
        
        print(f"SUCCESS: Payment info - status={data['status']}, paid=£{data.get('total_paid_gbp', 0)}, remaining=£{data.get('remaining_gbp', 0)}")
        
        # Verify student is enrolled (already paid in earlier test)
        if data["status"] == "enrolled":
            assert data["is_fully_paid"] == True, "Enrolled student should be fully paid"
            assert data["has_paid"] == True, "Enrolled student should have paid"
            print(f"SUCCESS: Student is enrolled with payment confirmed")


class TestCheckoutStatusEndpoint:
    """Test checkout status endpoint (for mock sessions)"""
    
    @pytest.fixture(autouse=True)
    def setup_student_token(self):
        """Get student token before tests"""
        if not tokens.get("student"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
            if response.status_code == 200:
                tokens["student"] = response.json()["token"]
            else:
                pytest.skip("Student auth required")
    
    def test_checkout_status_mock_session(self):
        """Test /api/payments/checkout/status/:sessionId returns paid for mock sessions"""
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        
        # Test with a mock session ID format
        mock_session_id = "cs_mock_test123456789012345678901234"
        response = requests.get(
            f"{BASE_URL}/api/payments/checkout/status/{mock_session_id}",
            headers=headers
        )
        print(f"Checkout status response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify mock session returns paid status
        assert "payment_status" in data, "Missing payment_status"
        assert data["payment_status"] == "paid", f"Mock session should be paid, got {data['payment_status']}"
        assert data.get("is_mock") == True, "Should indicate mock mode"
        
        print(f"SUCCESS: Mock checkout status - payment_status={data['payment_status']}, is_mock={data.get('is_mock')}")


class TestPaymentFlowForApprovedStudent:
    """Test payment flow for a student who needs to pay"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get tokens"""
        if not tokens.get("admin"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
            if response.status_code == 200:
                tokens["admin"] = response.json()["token"]
        if not tokens.get("rep"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["rep"])
            if response.status_code == 200:
                tokens["rep"] = response.json()["token"]
    
    def test_checkout_session_for_enrolled_student_rejected(self):
        """Test that enrolled student cannot create checkout session (already paid)"""
        if not tokens.get("student"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["student"])
            if response.status_code == 200:
                tokens["student"] = response.json()["token"]
        
        # Get student info first
        headers = {"Authorization": f"Bearer {tokens['student']}"}
        info_response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        
        if info_response.status_code == 200:
            data = info_response.json()
            if data.get("status") == "enrolled" or data.get("is_fully_paid"):
                # Try to create checkout - should fail since already enrolled
                checkout_response = requests.post(
                    f"{BASE_URL}/api/payments/checkout/session",
                    headers=headers,
                    json={
                        "student_id": data["student_id"],
                        "origin_url": "https://test.example.com"
                    }
                )
                print(f"Checkout session for enrolled student: {checkout_response.status_code} - {checkout_response.text[:200]}")
                
                # Should fail because student is enrolled or no payment due
                assert checkout_response.status_code in [400, 403], f"Expected 400/403 for enrolled student, got {checkout_response.status_code}"
                print("SUCCESS: Enrolled student correctly cannot create new checkout session")
            else:
                pytest.skip(f"Student status is {data.get('status')}, not enrolled")
        else:
            pytest.skip("Could not get student payment info")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
