"""
Test Student Referral Claim Feature and Stripe Integration for Admin Payouts
Tests new endpoints for referral bonus claims, payout requests, and Stripe integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@plan4growth.uk"
ADMIN_PASSWORD = "password123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestStripePayoutEndpoints:
    """Tests for Stripe Connect payout-related endpoints"""
    
    def test_stripe_status_endpoint_admin_access(self, admin_token):
        """GET /api/payouts/stripe/status - Admin should get Stripe availability and balance"""
        response = requests.get(
            f"{BASE_URL}/api/payouts/stripe/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "available" in data, "Response should contain 'available' field"
        
        # If Stripe is available, should have balance info
        if data.get("available"):
            assert "platform_balance" in data, "When Stripe available, should have platform_balance"
            balance = data["platform_balance"]
            assert "available" in balance, "Balance should have 'available' field"
            print(f"Stripe Status: Available={data['available']}, Balance=£{balance.get('available', 0)}")
        else:
            print(f"Stripe Status: Not available - {data.get('message', 'No message')}")
    
    def test_stripe_status_no_auth(self):
        """GET /api/payouts/stripe/status - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payouts/stripe/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestReferralPayoutRequestsEndpoint:
    """Tests for GET /api/referrals/payout-requests endpoint"""
    
    def test_payout_requests_admin_access(self, admin_token):
        """GET /api/referrals/payout-requests - Admin should get array of payout requests"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/payout-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"Payout Requests count: {len(data)}")
        
        # If there are payout requests, verify structure
        if data:
            payout = data[0]
            expected_fields = ['payout_id', 'total_amount', 'status']
            for field in expected_fields:
                assert field in payout, f"Payout should contain '{field}' field"
            print(f"First payout: ID={payout.get('payout_id')}, Amount=£{payout.get('total_amount')}, Status={payout.get('status')}")
    
    def test_payout_requests_no_auth(self):
        """GET /api/referrals/payout-requests - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/referrals/payout-requests")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_payout_requests_with_status_filter(self, admin_token):
        """GET /api/referrals/payout-requests?status=pending - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/payout-requests?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"Pending payout requests: {len(data)}")


class TestClaimBonusEndpoint:
    """Tests for POST /api/referrals/claim-bonus endpoint"""
    
    def test_claim_bonus_admin_forbidden(self, admin_token):
        """POST /api/referrals/claim-bonus - Admin (non-student) should get 403"""
        response = requests.post(
            f"{BASE_URL}/api/referrals/claim-bonus",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={}
        )
        # Admin is not a student, so should be forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "error" in data or "detail" in data, "Should have error message"
        print(f"Claim bonus response (admin): {data}")
    
    def test_claim_bonus_no_auth(self):
        """POST /api/referrals/claim-bonus - Should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/referrals/claim-bonus",
            json={}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestMyStatsEndpoint:
    """Tests for GET /api/referrals/my-stats endpoint"""
    
    def test_my_stats_admin_forbidden(self, admin_token):
        """GET /api/referrals/my-stats - Admin (non-student) should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin is not an enrolled student, should be forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "error" in data or "message" in data, "Should have error/message"
        print(f"My stats response (admin): {data}")
    
    def test_my_stats_no_auth(self):
        """GET /api/referrals/my-stats - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestExistingPayoutsEndpoints:
    """Test existing payouts endpoints still work correctly"""
    
    def test_payouts_list(self, admin_token):
        """GET /api/payouts - Admin can list all payouts"""
        response = requests.get(
            f"{BASE_URL}/api/payouts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Could be array or object with payouts key
        payouts = data if isinstance(data, list) else data.get('payouts', [])
        print(f"Total payouts: {len(payouts)}")
    
    def test_payouts_stats(self, admin_token):
        """GET /api/payouts/stats - Admin can get payout statistics"""
        response = requests.get(
            f"{BASE_URL}/api/payouts/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Stats may have different format - check for key fields
        assert isinstance(data, dict), "Stats should be a dictionary"
        # Check for either format: 'total' or 'by_status'
        has_valid_format = 'total' in data or 'by_status' in data or 'total_pending' in data
        assert has_valid_format, f"Stats should contain valid payout statistics fields. Got: {list(data.keys())}"
        print(f"Payout stats: {data}")


class TestReferralAnalytics:
    """Test referral analytics endpoints"""
    
    def test_referral_analytics(self, admin_token):
        """GET /api/referrals/analytics - Admin can get referral analytics"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = ['total_clicks', 'total_conversions', 'conversion_rate', 'by_referral_code']
        for field in expected_fields:
            assert field in data, f"Analytics should contain '{field}'"
        print(f"Referral Analytics: Clicks={data.get('total_clicks')}, Conversions={data.get('total_conversions')}, Rate={data.get('conversion_rate')}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
