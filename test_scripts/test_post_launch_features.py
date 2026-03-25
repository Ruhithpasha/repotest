"""
Test Post-Launch Hardening Features:
1. Referral Attribution Click Tracking - POST /api/referrals/track, GET /api/referrals/analytics
2. Fraud Flags System - GET /api/fraud-alerts, /summary, /open-count, PATCH /:id
3. Payout Batch Items - GET /api/payouts/:payoutId/items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Helper to get auth tokens"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def rep_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rep@plan4growth.uk",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Rep login failed")
        return response.json().get("token")


class TestReferralTracking(TestAuth):
    """Test Referral Attribution Click Tracking endpoints"""
    
    def test_track_referral_click_success(self):
        """POST /api/referrals/track - should create attribution and return click_token"""
        response = requests.post(f"{BASE_URL}/api/referrals/track", json={
            "referral_code": "REP001"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "click_token" in data, "Response should contain click_token"
        assert "referrer_name" in data, "Response should contain referrer_name"
        assert "expires_at" in data, "Response should contain expires_at"
        assert "cookie_name" in data, "Response should contain cookie_name"
        assert data["cookie_name"] == "ref_token", "Cookie name should be ref_token"
        assert data["success"] is True
        assert len(data["click_token"]) == 64, "Click token should be 64 char hex"
    
    def test_track_referral_click_invalid_code(self):
        """POST /api/referrals/track - should return 404 for invalid code"""
        response = requests.post(f"{BASE_URL}/api/referrals/track", json={
            "referral_code": "INVALID999"
        })
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
    
    def test_track_referral_click_missing_code(self):
        """POST /api/referrals/track - should return 400 when code missing"""
        response = requests.post(f"{BASE_URL}/api/referrals/track", json={})
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_referral_analytics_success(self, super_admin_token):
        """GET /api/referrals/analytics - should return click stats"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_clicks" in data, "Response should contain total_clicks"
        assert "total_conversions" in data, "Response should contain total_conversions"
        assert "conversion_rate" in data, "Response should contain conversion_rate"
        assert "by_referral_code" in data, "Response should contain by_referral_code"
        assert "recent_clicks" in data, "Response should contain recent_clicks"
        assert isinstance(data["by_referral_code"], list)
        assert isinstance(data["recent_clicks"], list)
    
    def test_referral_analytics_by_code_filter(self, super_admin_token):
        """GET /api/referrals/analytics?referral_code=REP001 - should filter by code"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/analytics?referral_code=REP001",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # All items should be for REP001
        for item in data.get("by_referral_code", []):
            assert item["referral_code"] == "REP001"
    
    def test_referral_analytics_unauthorized(self, rep_token):
        """GET /api/referrals/analytics - should require admin access"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/analytics",
            headers={"Authorization": f"Bearer {rep_token}"}
        )
        assert response.status_code == 403


class TestFraudFlags(TestAuth):
    """Test Fraud Flags System endpoints"""
    
    def test_fraud_alerts_summary(self, super_admin_token):
        """GET /api/fraud-alerts/summary - should return stats by severity and type"""
        response = requests.get(
            f"{BASE_URL}/api/fraud-alerts/summary",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "open_count" in data
        assert "reviewing_count" in data
        assert "cleared_this_month" in data
        assert "total_count" in data
        assert "by_severity" in data
        assert "by_type" in data
        assert isinstance(data["by_severity"], dict)
        assert isinstance(data["by_type"], dict)
    
    def test_fraud_alerts_open_count(self, super_admin_token):
        """GET /api/fraud-alerts/open-count - should return count of open flags"""
        response = requests.get(
            f"{BASE_URL}/api/fraud-alerts/open-count",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
    
    def test_fraud_alerts_list(self, super_admin_token):
        """GET /api/fraud-alerts - should return list of alerts"""
        response = requests.get(
            f"{BASE_URL}/api/fraud-alerts",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data
        assert isinstance(data["alerts"], list)
    
    def test_fraud_alerts_create_and_update(self, super_admin_token):
        """POST /api/fraud-alerts + PATCH /:id - should create and update flag status"""
        # Create a test fraud alert
        create_response = requests.post(
            f"{BASE_URL}/api/fraud-alerts",
            headers={
                "Authorization": f"Bearer {super_admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "flag_type": "test_alert",
                "severity": "medium",
                "flag_reason": "Test alert for automated testing"
            }
        )
        assert create_response.status_code == 201, f"Expected 201, got {create_response.status_code}: {create_response.text}"
        
        created_alert = create_response.json()
        alert_id = created_alert["alert_id"]
        assert alert_id is not None
        assert created_alert["status"] == "open"
        
        # Update the alert status to reviewing
        update_response = requests.patch(
            f"{BASE_URL}/api/fraud-alerts/{alert_id}",
            headers={
                "Authorization": f"Bearer {super_admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "status": "reviewing",
                "review_note": "Under review for testing"
            }
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_alert = update_response.json()
        assert updated_alert["alert"]["status"] == "reviewing"
        
        # Clear the alert
        clear_response = requests.patch(
            f"{BASE_URL}/api/fraud-alerts/{alert_id}",
            headers={
                "Authorization": f"Bearer {super_admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "status": "cleared",
                "review_note": "Cleared - test complete"
            }
        )
        assert clear_response.status_code == 200
        cleared_alert = clear_response.json()
        assert cleared_alert["alert"]["status"] == "cleared"
    
    def test_fraud_alerts_filter_by_status(self, super_admin_token):
        """GET /api/fraud-alerts?status=open - should filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/fraud-alerts?status=open",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for alert in data.get("alerts", []):
            assert alert["status"] == "open"
    
    def test_fraud_alerts_unauthorized(self, rep_token):
        """GET /api/fraud-alerts - should require admin access"""
        response = requests.get(
            f"{BASE_URL}/api/fraud-alerts",
            headers={"Authorization": f"Bearer {rep_token}"}
        )
        assert response.status_code == 403


class TestPayoutBatchItems(TestAuth):
    """Test Payout Batch Items endpoints"""
    
    def test_payout_batch_items_invalid_payout(self, super_admin_token):
        """GET /api/payouts/:payoutId/items - should return 404 for invalid payout"""
        response = requests.get(
            f"{BASE_URL}/api/payouts/invalid_payout_id/items",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_payouts_list(self, super_admin_token):
        """GET /api/payouts - should return list of payouts"""
        response = requests.get(
            f"{BASE_URL}/api/payouts",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_payout_stats(self, super_admin_token):
        """GET /api/payouts/stats - should return payout statistics"""
        response = requests.get(
            f"{BASE_URL}/api/payouts/stats",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "by_status" in data


class TestModelEnhancements:
    """Test model enhancements for fraud flags and payout commissions"""
    
    def test_fraud_alert_model_fields(self, request):
        """Verify FraudAlert model has new fields: related_type, related_id, is_blocking"""
        super_admin_token = request.getfixturevalue("super_admin_token")
        
        # Create alert with new fields
        response = requests.post(
            f"{BASE_URL}/api/fraud-alerts",
            headers={
                "Authorization": f"Bearer {super_admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "flag_type": "commission_override_abuse",
                "severity": "high",
                "flag_reason": "Test with related record",
                "related_type": "commission",
                "related_id": "test_comm_123"
            }
        )
        assert response.status_code == 201
        
        data = response.json()
        # High severity should be blocking by default
        assert data.get("is_blocking") is True or data.get("is_blocking") == True
        assert data.get("related_type") == "commission"
        assert data.get("related_id") == "test_comm_123"
        
        # Clean up - clear the alert
        alert_id = data["alert_id"]
        requests.patch(
            f"{BASE_URL}/api/fraud-alerts/{alert_id}",
            headers={
                "Authorization": f"Bearer {super_admin_token}",
                "Content-Type": "application/json"
            },
            json={"status": "dismissed"}
        )


# Configure fixtures for the model test
@pytest.fixture(scope="session")
def super_admin_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@plan4growth.uk",
        "password": "password123"
    })
    if response.status_code != 200:
        pytest.skip("Super admin login failed")
    return response.json().get("token")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
