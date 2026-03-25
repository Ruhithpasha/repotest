"""
Backend API Tests for Iteration 19 - New Features:
1. Admin Enrolments API (GET /api/admin/enrolments, GET /api/admin/enrolments/:id/timeline)
2. Lead Conversion API (POST /api/leads/:leadId/convert)
3. Commission mark-payable API (POST /api/commissions/:id/mark-payable)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def rep_token(self):
        """Get rep auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rep@plan4growth.uk", 
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Rep user not available for testing")
        return response.json()["token"]
    
    def test_super_admin_login(self):
        """Test super admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"


class TestAdminEnrolments:
    """Tests for admin enrolments API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_enrolments_list(self):
        """GET /api/admin/enrolments returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/enrolments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} enrolments")
        
    def test_get_enrolments_with_filters(self):
        """GET /api/admin/enrolments supports filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/enrolments?status=enrolled&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_enrolments_requires_auth(self):
        """GET /api/admin/enrolments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/enrolments")
        assert response.status_code == 401
        
    def test_get_enrolment_timeline_requires_auth(self):
        """GET /api/admin/enrolments/:id/timeline requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/enrolments/test_id/timeline")
        assert response.status_code == 401
        
    def test_get_enrolment_timeline_not_found(self):
        """GET /api/admin/enrolments/:id/timeline returns 404 for invalid ID"""
        response = requests.get(
            f"{BASE_URL}/api/admin/enrolments/invalid_id_12345/timeline",
            headers=self.headers
        )
        assert response.status_code == 404


class TestLeadConversion:
    """Tests for lead conversion API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_convert_lead_requires_programme_id(self):
        """POST /api/leads/:leadId/convert requires program_id"""
        # First get a lead to test with
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        leads = leads_response.json()
        if not leads:
            pytest.skip("No leads available for testing")
        
        # Find an unconverted lead
        unconverted_lead = None
        for lead in leads:
            if not lead.get('converted_to_student_id'):
                unconverted_lead = lead
                break
        
        if not unconverted_lead:
            pytest.skip("No unconverted leads available for testing")
        
        # Try to convert without program_id
        response = requests.post(
            f"{BASE_URL}/api/leads/{unconverted_lead['lead_id']}/convert",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 400
        assert "required" in response.json().get('detail', '').lower()
    
    def test_convert_lead_not_found(self):
        """POST /api/leads/:leadId/convert returns 404 for invalid lead"""
        response = requests.post(
            f"{BASE_URL}/api/leads/invalid_lead_id_12345/convert",
            headers=self.headers,
            json={"program_id": "test_program"}
        )
        assert response.status_code == 404
    
    def test_convert_lead_invalid_programme(self):
        """POST /api/leads/:leadId/convert returns 404 for invalid programme"""
        # First get a lead
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        leads = leads_response.json()
        unconverted_lead = None
        for lead in leads:
            if not lead.get('converted_to_student_id'):
                unconverted_lead = lead
                break
        
        if not unconverted_lead:
            pytest.skip("No unconverted leads available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/leads/{unconverted_lead['lead_id']}/convert",
            headers=self.headers,
            json={"program_id": "invalid_programme_id_12345"}
        )
        assert response.status_code == 404
        assert "programme" in response.json().get('detail', '').lower() or "not found" in response.json().get('detail', '').lower()
    
    def test_convert_lead_full_flow(self):
        """POST /api/leads/:leadId/convert full conversion flow"""
        # Get leads
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        leads = leads_response.json()
        unconverted_lead = None
        for lead in leads:
            if not lead.get('converted_to_student_id'):
                unconverted_lead = lead
                break
        
        if not unconverted_lead:
            pytest.skip("No unconverted leads available - may have been converted in previous test")
        
        # Get programmes
        programmes_response = requests.get(
            f"{BASE_URL}/api/admin/programmes?active=true",
            headers=self.headers
        )
        if programmes_response.status_code != 200:
            pytest.skip("Could not fetch programmes")
        
        programmes_data = programmes_response.json()
        programmes = programmes_data.get('programmes', programmes_data) if isinstance(programmes_data, dict) else programmes_data
        
        if not programmes:
            pytest.skip("No programmes available for testing")
        
        programme = programmes[0]
        program_id = programme.get('program_id') or programme.get('id')
        
        # Convert lead
        response = requests.post(
            f"{BASE_URL}/api/leads/{unconverted_lead['lead_id']}/convert",
            headers=self.headers,
            json={"program_id": program_id}
        )
        
        # Accept either 200 (success) or 400 (already converted)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, body: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert 'student' in data
            assert 'enrollment_number' in data['student']
            print(f"Lead converted successfully. Enrollment #: {data['student']['enrollment_number']}")


class TestCommissionMarkPayable:
    """Tests for commission mark-payable API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_mark_payable_requires_auth(self):
        """POST /api/commissions/:id/mark-payable requires authentication"""
        response = requests.post(f"{BASE_URL}/api/commissions/test_id/mark-payable")
        assert response.status_code == 401
    
    def test_mark_payable_not_found(self):
        """POST /api/commissions/:id/mark-payable returns 404 for invalid ID"""
        response = requests.post(
            f"{BASE_URL}/api/commissions/invalid_commission_id_12345/mark-payable",
            headers=self.headers
        )
        assert response.status_code == 404
    
    def test_mark_payable_requires_approved_status(self):
        """POST /api/commissions/:id/mark-payable requires approved status"""
        # Get commissions
        commissions_response = requests.get(
            f"{BASE_URL}/api/commissions",
            headers=self.headers
        )
        if commissions_response.status_code != 200:
            pytest.skip("Could not fetch commissions")
        
        commissions = commissions_response.json()
        if not commissions:
            pytest.skip("No commissions available for testing")
        
        # Find a non-approved commission
        non_approved = None
        for comm in commissions:
            if comm.get('status') not in ['approved']:
                non_approved = comm
                break
        
        if not non_approved:
            pytest.skip("No non-approved commissions available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/{non_approved['commission_id']}/mark-payable",
            headers=self.headers
        )
        
        if non_approved.get('status') != 'approved':
            assert response.status_code == 400
            assert "approved" in response.json().get('detail', '').lower()
    
    def test_mark_payable_success_for_approved(self):
        """POST /api/commissions/:id/mark-payable works for approved commissions"""
        # Get commissions
        commissions_response = requests.get(
            f"{BASE_URL}/api/commissions?status=approved",
            headers=self.headers
        )
        if commissions_response.status_code != 200:
            pytest.skip("Could not fetch commissions")
        
        commissions = commissions_response.json()
        
        # Find an approved commission
        approved_commission = None
        for comm in commissions:
            if comm.get('status') == 'approved':
                approved_commission = comm
                break
        
        if not approved_commission:
            pytest.skip("No approved commissions available for testing - this is expected if no commissions exist yet")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/{approved_commission['commission_id']}/mark-payable",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('commission', {}).get('status') == 'payable'
        print(f"Commission {approved_commission['commission_id']} marked as payable")


class TestCommissionReviewAPIs:
    """Tests for commission review related APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_commissions_list(self):
        """GET /api/commissions returns list"""
        response = requests.get(f"{BASE_URL}/api/commissions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} commissions")
    
    def test_get_commissions_with_status_filter(self):
        """GET /api/commissions supports status filter"""
        response = requests.get(
            f"{BASE_URL}/api/commissions?status=pending_approval",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_commission_approve_endpoint_exists(self):
        """POST /api/commissions/:id/approve endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/commissions/invalid_id/approve",
            headers=self.headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 400]
    
    def test_commission_reject_endpoint_exists(self):
        """POST /api/commissions/:id/reject endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/commissions/invalid_id/reject",
            headers=self.headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 400]


class TestProgrammesAPI:
    """Tests for programmes API used by conversion modal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_programmes_list(self):
        """GET /api/admin/programmes returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/programmes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Can be either array or object with programmes key
        programmes = data.get('programmes', data) if isinstance(data, dict) else data
        assert isinstance(programmes, list)
        print(f"Found {len(programmes)} programmes")
        if programmes:
            print(f"First programme: {programmes[0].get('name', programmes[0].get('program_name', 'Unknown'))}")


class TestLeadsAPI:
    """Tests for leads API used by kanban board"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_leads_list(self):
        """GET /api/leads returns list"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} leads")
        
        # Count unconverted leads
        unconverted = [l for l in data if not l.get('converted_to_student_id')]
        print(f"Unconverted leads: {len(unconverted)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
