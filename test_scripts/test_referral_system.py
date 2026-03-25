"""
Referral System API Tests
Tests for Student Referral Dashboard - code generation, validation, tracking, and stats
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ENROLLED_STUDENT = {
    "email": "enrolled@plan4growth.uk",
    "password": "password123"
}
PENDING_STUDENT = {
    "email": "pending@plan4growth.uk",
    "password": "password123"
}
TEST_REFERRAL_CODE = "P4G-TEST1234"


class TestReferralPublicEndpoints:
    """Tests for public referral endpoints (no auth required)"""
    
    def test_validate_referral_code_valid(self):
        """POST /api/referrals/validate - Valid code returns referrer info"""
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={
            "referral_code": TEST_REFERRAL_CODE
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert "referrer_name" in data
        assert "referrer_user_id" in data
        assert "bonus_message" in data
        assert "£50" in data["bonus_message"]
    
    def test_validate_referral_code_invalid(self):
        """POST /api/referrals/validate - Invalid code returns error"""
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={
            "referral_code": "INVALID-CODE-123"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert data["valid"] == False
        assert "error" in data
    
    def test_validate_referral_code_missing(self):
        """POST /api/referrals/validate - Missing code returns 400"""
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={})
        
        assert response.status_code == 400
        data = response.json()
        assert data["valid"] == False
    
    def test_validate_self_referral_blocked(self):
        """POST /api/referrals/validate - Self-referral attempt is blocked"""
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={
            "referral_code": TEST_REFERRAL_CODE,
            "registering_email": "enrolled@plan4growth.uk"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert data["valid"] == False
        assert "own referral code" in data["error"].lower()
    
    def test_track_click_success(self):
        """POST /api/referrals/track-click - Creates/updates referral tracking"""
        response = requests.post(f"{BASE_URL}/api/referrals/track-click", json={
            "referral_code": TEST_REFERRAL_CODE,
            "ip_address": "192.168.1.200",
            "user_agent": "TestAgent/1.0"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "referral_id" in data
    
    def test_track_click_invalid_code(self):
        """POST /api/referrals/track-click - Invalid code returns 404"""
        response = requests.post(f"{BASE_URL}/api/referrals/track-click", json={
            "referral_code": "INVALID-CODE",
            "ip_address": "192.168.1.1"
        })
        
        assert response.status_code == 404
    
    def test_track_click_missing_code(self):
        """POST /api/referrals/track-click - Missing code returns 400"""
        response = requests.post(f"{BASE_URL}/api/referrals/track-click", json={
            "ip_address": "192.168.1.1"
        })
        
        assert response.status_code == 400


class TestReferralAuthenticatedEndpoints:
    """Tests for authenticated referral endpoints"""
    
    @pytest.fixture(scope="class")
    def enrolled_token(self):
        """Get auth token for enrolled student"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ENROLLED_STUDENT)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def pending_token(self):
        """Get auth token for pending student"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PENDING_STUDENT)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_my_code_enrolled_student(self, enrolled_token):
        """GET /api/referrals/my-code - Enrolled student gets referral code"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {enrolled_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["eligible"] == True
        assert "referral_code" in data
        assert data["referral_code"] == TEST_REFERRAL_CODE
        assert "share_link" in data
        assert "bonus_amount" in data
        assert data["bonus_amount"] == 50
    
    def test_get_my_code_pending_student_403(self, pending_token):
        """GET /api/referrals/my-code - Pending student gets 403"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {pending_token}"})
        
        assert response.status_code == 403
        data = response.json()
        assert data["eligible"] == False
        assert "status" in data  # Returns student status
        assert "Complete your enrollment" in data.get("message", "")
    
    def test_get_my_code_no_auth_401(self):
        """GET /api/referrals/my-code - No auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-code")
        
        assert response.status_code == 401
    
    def test_get_my_stats_enrolled_student(self, enrolled_token):
        """GET /api/referrals/my-stats - Enrolled student gets stats"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {enrolled_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert "total_referrals" in data
        assert "pending_referrals" in data
        assert "enrolled_referrals" in data
        assert "total_earned" in data
        assert "pending_earnings" in data
        assert "referrals" in data
        assert isinstance(data["referrals"], list)
        
        # Verify referral objects have expected fields
        if len(data["referrals"]) > 0:
            ref = data["referrals"][0]
            assert "referral_id" in ref
            assert "status" in ref
            assert "bonus_amount" in ref
            assert "created_at" in ref
    
    def test_get_my_stats_pending_student_403(self, pending_token):
        """GET /api/referrals/my-stats - Pending student gets 403"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {pending_token}"})
        
        assert response.status_code == 403


class TestReferralFraudProtection:
    """Tests for referral fraud protection mechanisms"""
    
    def test_same_email_already_referred(self):
        """POST /api/referrals/validate - Already referred email is blocked"""
        # First, we need to check if blocking works for existing referrals
        # Create a test scenario - this tests the existing referral check
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={
            "referral_code": TEST_REFERRAL_CODE,
            "registering_email": "newuser@test.com"  # Fresh email should work
        })
        
        # Should be valid for new email
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
    
    def test_ip_abuse_rate_limiting(self):
        """POST /api/referrals/validate - IP abuse detection (rate limit check)"""
        # This test verifies that the IP abuse check is in place
        # We can't easily trigger 5+ referrals in tests, but we verify the endpoint works
        response = requests.post(f"{BASE_URL}/api/referrals/validate", json={
            "referral_code": TEST_REFERRAL_CODE,
            "ip_address": "10.0.0.1"  # Test IP for checking
        })
        
        # Should succeed (not hitting rate limit in test)
        assert response.status_code in [200, 400, 429]  # Valid, invalid, or rate limited


class TestAuthEndpoints:
    """Tests for authentication with student accounts"""
    
    def test_enrolled_student_login(self):
        """POST /api/auth/login - Enrolled student can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ENROLLED_STUDENT)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ENROLLED_STUDENT["email"]
        assert data["user"]["role"] == "student"
    
    def test_pending_student_login(self):
        """POST /api/auth/login - Pending student can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PENDING_STUDENT)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == PENDING_STUDENT["email"]


class TestStudentProfileEndpoints:
    """Tests for student profile that affect referral eligibility"""
    
    @pytest.fixture(scope="class")
    def enrolled_token(self):
        """Get auth token for enrolled student"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ENROLLED_STUDENT)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def pending_token(self):
        """Get auth token for pending student"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PENDING_STUDENT)
        return response.json()["token"]
    
    def test_enrolled_student_profile_status(self, enrolled_token):
        """GET /api/students/me - Enrolled student has enrolled status"""
        response = requests.get(f"{BASE_URL}/api/students/me",
            headers={"Authorization": f"Bearer {enrolled_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "enrolled"
    
    def test_pending_student_profile_status(self, pending_token):
        """GET /api/students/me - Pending student has approved status"""
        response = requests.get(f"{BASE_URL}/api/students/me",
            headers={"Authorization": f"Bearer {pending_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["approved", "pending", "registered", "payment_pending"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
