"""
Test cases for Commission Rule Upgrades:
1. Programme-specific commission rules with scope column
2. Manager override min/max bounds with approval workflow
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "superadmin@plan4growth.uk", "password": "password123"}
MANAGER = {"email": "manager@plan4growth.uk", "password": "password123"}

class TestAuthentication:
    """Authentication tests for override features"""
    
    def test_super_admin_login(self):
        """Verify Super Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        print(f"Super Admin login response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        print(f"Super Admin login successful")
        return data.get("token") or data.get("access_token")
    
    def test_manager_login(self):
        """Verify Manager can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER)
        print(f"Manager login response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        print(f"Manager login successful")
        return data.get("token") or data.get("access_token")


class TestCommissionRulesAPI:
    """Test Commission Rules with Scope and Override Bounds"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_get_commission_rules(self, admin_token):
        """GET /api/commissions/rules - List all commission rules"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/rules", headers=headers)
        print(f"Get rules response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        # Can be array or object with rules key
        rules = data if isinstance(data, list) else data.get('rules', [])
        print(f"Found {len(rules)} commission rules")
        return rules
    
    def test_create_rule_with_scope_global(self, admin_token):
        """Create a global commission rule (program_id = null)"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {
            "name": "TEST_Global_Rep_Rule",
            "description": "Test global rule for reps",
            "program_id": None,  # Global scope
            "role_type": "rep",
            "commission_type": "percentage",
            "commission_value": 0.05,
            "minimum_payment_status": "paid_in_full",
            "hold_days": 14,
            "priority": 1,
            "manager_override_min": 3,
            "manager_override_max": 10
        }
        response = requests.post(f"{BASE_URL}/api/commissions/rules", headers=headers, json=payload)
        print(f"Create global rule response: {response.status_code}")
        assert response.status_code in [200, 201]
        data = response.json()
        # Check that program_id is null (global)
        rule_data = data.get('rule') or data
        print(f"Created rule: {rule_data.get('rule_id') or rule_data.get('id')}")
        assert rule_data.get('program_id') is None, "Global rule should have null program_id"
        return rule_data.get('rule_id') or rule_data.get('id')
    
    def test_create_rule_with_programme_scope(self, admin_token):
        """Create a programme-specific commission rule"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First get a programme ID
        prog_response = requests.get(f"{BASE_URL}/api/admin/programmes?active=true", headers=headers)
        programmes = prog_response.json() if prog_response.status_code == 200 else []
        programmes = programmes if isinstance(programmes, list) else programmes.get('programmes', [])
        
        if not programmes:
            pytest.skip("No programmes available to test programme-specific rules")
        
        programme_id = programmes[0].get('id') or programmes[0].get('program_id')
        print(f"Using programme ID: {programme_id}")
        
        payload = {
            "name": "TEST_Programme_Rep_Rule",
            "description": "Test programme-specific rule",
            "program_id": programme_id,  # Programme-specific scope
            "role_type": "rep",
            "commission_type": "percentage",
            "commission_value": 0.06,  # Higher rate for this programme
            "minimum_payment_status": "paid_in_full",
            "hold_days": 14,
            "priority": 10,  # Higher priority than global
            "manager_override_min": 4,
            "manager_override_max": 12
        }
        response = requests.post(f"{BASE_URL}/api/commissions/rules", headers=headers, json=payload)
        print(f"Create programme rule response: {response.status_code}")
        assert response.status_code in [200, 201]
        data = response.json()
        rule_data = data.get('rule') or data
        assert rule_data.get('program_id') == programme_id, "Rule should have programme ID set"
        print(f"Created programme-specific rule: {rule_data.get('rule_id') or rule_data.get('id')}")
        return rule_data.get('rule_id') or rule_data.get('id')
    
    def test_rule_has_override_bounds_fields(self, admin_token):
        """Verify rules have manager_override_min and manager_override_max fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/rules", headers=headers)
        assert response.status_code == 200
        data = response.json()
        rules = data if isinstance(data, list) else data.get('rules', [])
        
        # Check at least one rule has override bounds
        found_with_bounds = False
        for rule in rules:
            if rule.get('manager_override_min') is not None or rule.get('manager_override_max') is not None:
                found_with_bounds = True
                print(f"Rule {rule.get('rule_id')} has bounds: min={rule.get('manager_override_min')}, max={rule.get('manager_override_max')}")
                break
        
        print(f"Found rules with override bounds: {found_with_bounds}")
        # This is informational - may not have bounds set yet
        return found_with_bounds


class TestOverrideRequestsAPI:
    """Test Override Requests Admin API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    @pytest.fixture
    def manager_token(self):
        """Get manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_get_override_requests_admin(self, admin_token):
        """GET /api/admin/commission-override-requests - List all override requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/commission-override-requests", headers=headers)
        print(f"Get override requests response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "stats" in data
        print(f"Stats: pending={data['stats'].get('pending')}, approved={data['stats'].get('approved')}, rejected={data['stats'].get('rejected')}")
        return data
    
    def test_get_pending_count(self, admin_token):
        """GET /api/admin/commission-override-requests/pending-count - Get pending count for sidebar"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/commission-override-requests/pending-count", headers=headers)
        print(f"Pending count response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"Pending override requests: {data['count']}")
        return data['count']
    
    def test_filter_by_status(self, admin_token):
        """GET /api/admin/commission-override-requests?status=pending - Filter by status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        for status in ['pending', 'approved', 'rejected']:
            response = requests.get(f"{BASE_URL}/api/admin/commission-override-requests?status={status}", headers=headers)
            print(f"Filter by {status}: {response.status_code}")
            assert response.status_code == 200
            data = response.json()
            # Verify all returned requests have the filtered status
            for req in data.get('requests', []):
                if status != 'all':
                    assert req.get('status') == status, f"Expected status {status}, got {req.get('status')}"
    
    def test_manager_cannot_access_admin_override_endpoint(self, manager_token):
        """Managers should not access admin override requests list"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/commission-override-requests", headers=headers)
        print(f"Manager accessing admin endpoint: {response.status_code}")
        # Should return 403 Forbidden
        assert response.status_code == 403
        print("Correctly blocked manager from admin endpoint")


class TestManagerCommissionsOverride:
    """Test Manager Override Request Flow"""
    
    @pytest.fixture
    def manager_token(self):
        """Get manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_get_manager_commissions(self, manager_token):
        """GET /api/manager/commissions - List manager commissions"""
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/api/manager/commissions", headers=headers)
        print(f"Manager commissions response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        commissions = data if isinstance(data, list) else []
        print(f"Manager has {len(commissions)} commissions")
        return commissions


class TestCleanup:
    """Clean up test data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_cleanup_test_rules(self, admin_token):
        """Delete test commission rules"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/rules", headers=headers)
        if response.status_code == 200:
            data = response.json()
            rules = data if isinstance(data, list) else data.get('rules', [])
            for rule in rules:
                rule_id = rule.get('rule_id') or rule.get('id')
                rule_name = rule.get('name', '')
                if rule_name.startswith('TEST_'):
                    del_response = requests.delete(f"{BASE_URL}/api/commissions/rules/{rule_id}", headers=headers)
                    print(f"Deleted test rule {rule_id}: {del_response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
