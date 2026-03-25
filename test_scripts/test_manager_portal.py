"""
Manager Portal API Tests
Testing all /api/manager/* endpoints for manager role

Endpoints tested:
- GET /api/manager/stats
- GET /api/manager/top-reps
- GET /api/manager/commission-summary
- GET /api/manager/team-performance
- GET /api/manager/reps
- GET /api/manager/pipeline
- GET /api/manager/commissions
- GET /api/manager/payable-commissions
- GET /api/manager/reports/lead-funnel
- GET /api/manager/reports/enrollments
- GET /api/manager/reports/commissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MANAGER_EMAIL = "manager@plan4growth.uk"
MANAGER_PASSWORD = "password123"
REP_EMAIL = "rep@plan4growth.uk"
REP_PASSWORD = "password123"


class TestManagerPortalAuth:
    """Test manager login and redirect"""
    
    def test_manager_login_success(self):
        """Test manager can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert "user" in data, "User missing in response"
        assert data["user"]["role"] == "manager", f"Expected manager role, got {data['user']['role']}"
        assert data["user"]["email"] == MANAGER_EMAIL
        print(f"✓ Manager login successful - user: {data['user']['name']}, role: {data['user']['role']}")
    
    def test_rep_login_success(self):
        """Test rep can login successfully (for comparison)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REP_EMAIL,
            "password": REP_PASSWORD
        })
        assert response.status_code == 200, f"Rep login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] in ["rep", "sales_user"], f"Expected rep/sales_user role, got {data['user']['role']}"
        print(f"✓ Rep login successful - user: {data['user']['name']}, role: {data['user']['role']}")


class TestManagerDashboard:
    """Test Manager Dashboard APIs"""
    
    @pytest.fixture
    def manager_token(self):
        """Get manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Manager authentication failed")
    
    @pytest.fixture
    def rep_token(self):
        """Get rep auth token for testing access control"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REP_EMAIL,
            "password": REP_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Rep authentication failed")
    
    def test_manager_stats_endpoint(self, manager_token):
        """Test GET /api/manager/stats returns correct stat cards data"""
        response = requests.get(
            f"{BASE_URL}/api/manager/stats",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Verify all 4 stat card fields are present
        assert "totalTeamLeads" in data, "Missing totalTeamLeads"
        assert "enrolledThisMonth" in data, "Missing enrolledThisMonth"
        assert "myCommissionEarned" in data, "Missing myCommissionEarned"
        assert "activeRepsCount" in data, "Missing activeRepsCount"
        
        # Validate data types
        assert isinstance(data["totalTeamLeads"], int), "totalTeamLeads should be int"
        assert isinstance(data["enrolledThisMonth"], int), "enrolledThisMonth should be int"
        assert isinstance(data["activeRepsCount"], int), "activeRepsCount should be int"
        
        print(f"✓ Manager stats: totalTeamLeads={data['totalTeamLeads']}, enrolled={data['enrolledThisMonth']}, commission=£{data['myCommissionEarned']}, reps={data['activeRepsCount']}")
    
    def test_manager_stats_forbidden_for_rep(self, rep_token):
        """Test rep cannot access manager stats (should be 403)"""
        response = requests.get(
            f"{BASE_URL}/api/manager/stats",
            headers={"Authorization": f"Bearer {rep_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Rep correctly denied access to manager stats")
    
    def test_top_reps_endpoint(self, manager_token):
        """Test GET /api/manager/top-reps returns rep data"""
        response = requests.get(
            f"{BASE_URL}/api/manager/top-reps",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Top reps failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        # If there are reps, check structure
        if len(data) > 0:
            rep = data[0]
            assert "repId" in rep, "Missing repId"
            assert "name" in rep, "Missing name"
            assert "enrollments" in rep, "Missing enrollments"
            assert "commissionEarned" in rep, "Missing commissionEarned"
            print(f"✓ Top reps returned {len(data)} rep(s): {[r['name'] for r in data]}")
        else:
            print("✓ Top reps returned empty list (manager may have no reps)")
    
    def test_commission_summary_endpoint(self, manager_token):
        """Test GET /api/manager/commission-summary returns breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/manager/commission-summary",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Commission summary failed: {response.text}"
        data = response.json()
        
        # Verify all status breakdowns present
        assert "pendingValidation" in data, "Missing pendingValidation"
        assert "pendingApproval" in data, "Missing pendingApproval"
        assert "approved" in data, "Missing approved"
        assert "payable" in data, "Missing payable"
        assert "paid" in data, "Missing paid"
        
        print(f"✓ Commission summary: pending_validation=£{data['pendingValidation']}, pending_approval=£{data['pendingApproval']}, approved=£{data['approved']}, payable=£{data['payable']}, paid=£{data['paid']}")


class TestManagerTeam:
    """Test My Team page APIs"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Manager authentication failed")
    
    def test_team_performance_endpoint(self, manager_token):
        """Test GET /api/manager/team-performance returns rep performance data"""
        response = requests.get(
            f"{BASE_URL}/api/manager/team-performance",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Team performance failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        if len(data) > 0:
            rep = data[0]
            # Verify all performance table columns
            assert "repId" in rep, "Missing repId"
            assert "name" in rep, "Missing name"
            assert "email" in rep, "Missing email"
            assert "leads" in rep, "Missing leads"
            assert "enrolled" in rep, "Missing enrolled"
            assert "conversionRate" in rep, "Missing conversionRate"
            assert "commissionEarned" in rep, "Missing commissionEarned"
            assert "trend" in rep, "Missing trend"
            
            print(f"✓ Team performance: {len(data)} rep(s)")
            for r in data:
                print(f"  - {r['name']}: {r['leads']} leads, {r['enrolled']} enrolled, {r['conversionRate']}% conversion, £{r['commissionEarned']} commission, trend={r['trend']}%")
        else:
            print("✓ Team performance returned empty (no reps assigned)")
    
    def test_get_reps_for_dropdown(self, manager_token):
        """Test GET /api/manager/reps returns rep list for dropdowns"""
        response = requests.get(
            f"{BASE_URL}/api/manager/reps",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Get reps failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        if len(data) > 0:
            rep = data[0]
            assert "user_id" in rep, "Missing user_id"
            assert "name" in rep, "Missing name"
            print(f"✓ Got {len(data)} reps for dropdown: {[r['name'] for r in data]}")
        else:
            print("✓ No reps assigned to manager")


class TestManagerPipeline:
    """Test Lead Pipeline page APIs"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Manager authentication failed")
    
    def test_pipeline_endpoint(self, manager_token):
        """Test GET /api/manager/pipeline returns team leads"""
        response = requests.get(
            f"{BASE_URL}/api/manager/pipeline",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Pipeline failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        if len(data) > 0:
            lead = data[0]
            assert "lead_id" in lead, "Missing lead_id"
            assert "name" in lead, "Missing name"
            assert "status" in lead, "Missing status"
            print(f"✓ Pipeline returned {len(data)} leads")
            
            # Count by status
            status_counts = {}
            for l in data:
                status = l.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            print(f"  Status breakdown: {status_counts}")
        else:
            print("✓ Pipeline returned empty (no leads)")
    
    def test_pipeline_with_rep_filter(self, manager_token):
        """Test pipeline with rep filter"""
        # First get reps
        reps_response = requests.get(
            f"{BASE_URL}/api/manager/reps",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        if reps_response.status_code == 200 and len(reps_response.json()) > 0:
            rep_id = reps_response.json()[0]['user_id']
            
            response = requests.get(
                f"{BASE_URL}/api/manager/pipeline",
                params={"repId": rep_id},
                headers={"Authorization": f"Bearer {manager_token}"}
            )
            assert response.status_code == 200, f"Pipeline filter failed: {response.text}"
            print(f"✓ Pipeline with rep filter returned {len(response.json())} leads")
        else:
            pytest.skip("No reps available for filter test")
    
    def test_pipeline_with_search(self, manager_token):
        """Test pipeline with search parameter"""
        response = requests.get(
            f"{BASE_URL}/api/manager/pipeline",
            params={"search": "test"},
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Pipeline search failed: {response.text}"
        print(f"✓ Pipeline search returned {len(response.json())} leads")


class TestManagerCommissions:
    """Test Commissions page APIs"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Manager authentication failed")
    
    def test_manager_commissions_endpoint(self, manager_token):
        """Test GET /api/manager/commissions returns manager's own commissions"""
        response = requests.get(
            f"{BASE_URL}/api/manager/commissions",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Commissions failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        if len(data) > 0:
            comm = data[0]
            assert "commission_id" in comm, "Missing commission_id"
            assert "status" in comm, "Missing status"
            print(f"✓ Manager commissions: {len(data)} commission(s)")
        else:
            print("✓ Manager has no commissions yet")
    
    def test_commissions_with_status_filter(self, manager_token):
        """Test commissions with status filter"""
        for status in ['pending_validation', 'pending_approval', 'approved', 'paid']:
            response = requests.get(
                f"{BASE_URL}/api/manager/commissions",
                params={"status": status},
                headers={"Authorization": f"Bearer {manager_token}"}
            )
            assert response.status_code == 200, f"Commissions filter {status} failed: {response.text}"
        print("✓ Commission status filters working")
    
    def test_payable_commissions_endpoint(self, manager_token):
        """Test GET /api/manager/payable-commissions for payout request"""
        response = requests.get(
            f"{BASE_URL}/api/manager/payable-commissions",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Payable commissions failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be array"
        
        if len(data) > 0:
            item = data[0]
            assert "commission_id" in item, "Missing commission_id"
            assert "amount" in item, "Missing amount"
            print(f"✓ Payable commissions: {len(data)} item(s), total £{sum(float(c['amount']) for c in data)}")
        else:
            print("✓ No payable commissions available")


class TestManagerReports:
    """Test Reports page APIs - 3 tabs"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Manager authentication failed")
    
    def test_lead_funnel_report(self, manager_token):
        """Test GET /api/manager/reports/lead-funnel"""
        response = requests.get(
            f"{BASE_URL}/api/manager/reports/lead-funnel",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Lead funnel report failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Missing summary"
        assert "chartData" in data, "Missing chartData"
        assert "tableData" in data, "Missing tableData"
        
        summary = data["summary"]
        assert "totalLeads" in summary, "Missing totalLeads in summary"
        assert "convertedToEnrolled" in summary, "Missing convertedToEnrolled in summary"
        assert "conversionRate" in summary, "Missing conversionRate in summary"
        
        print(f"✓ Lead Funnel: {summary['totalLeads']} total, {summary['convertedToEnrolled']} enrolled, {summary['conversionRate']}% conversion")
        if len(data.get("tableData", [])) > 0:
            print(f"  Funnel stages: {[s['stage'] for s in data['tableData']]}")
    
    def test_enrollments_report(self, manager_token):
        """Test GET /api/manager/reports/enrollments"""
        response = requests.get(
            f"{BASE_URL}/api/manager/reports/enrollments",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Enrollments report failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Missing summary"
        assert "chartData" in data, "Missing chartData"
        assert "tableData" in data, "Missing tableData"
        
        summary = data["summary"]
        assert "totalEnrolled" in summary, "Missing totalEnrolled"
        assert "thisPeriod" in summary, "Missing thisPeriod"
        assert "bestPerformingRep" in summary, "Missing bestPerformingRep"
        
        print(f"✓ Enrollments Report: {summary['totalEnrolled']} total, {summary['thisPeriod']} this period, best rep: {summary['bestPerformingRep']}")
    
    def test_enrollments_report_groupby(self, manager_token):
        """Test enrollments report with groupBy parameter"""
        for group in ['week', 'month']:
            response = requests.get(
                f"{BASE_URL}/api/manager/reports/enrollments",
                params={"groupBy": group},
                headers={"Authorization": f"Bearer {manager_token}"}
            )
            assert response.status_code == 200, f"Enrollments groupBy {group} failed: {response.text}"
        print("✓ Enrollments report groupBy week/month working")
    
    def test_commissions_report(self, manager_token):
        """Test GET /api/manager/reports/commissions"""
        response = requests.get(
            f"{BASE_URL}/api/manager/reports/commissions",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Commissions report failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Missing summary"
        assert "chartData" in data, "Missing chartData"
        assert "tableData" in data, "Missing tableData"
        
        summary = data["summary"]
        assert "totalGenerated" in summary, "Missing totalGenerated"
        assert "totalApproved" in summary, "Missing totalApproved"
        assert "totalPaid" in summary, "Missing totalPaid"
        
        print(f"✓ Commissions Report: £{summary['totalGenerated']} generated, £{summary['totalApproved']} approved, £{summary['totalPaid']} paid")
    
    def test_reports_with_date_range(self, manager_token):
        """Test reports with date range parameters"""
        from datetime import datetime, timedelta
        
        to_date = datetime.now().strftime('%Y-%m-%d')
        from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        for report in ['lead-funnel', 'enrollments', 'commissions']:
            response = requests.get(
                f"{BASE_URL}/api/manager/reports/{report}",
                params={"from": from_date, "to": to_date},
                headers={"Authorization": f"Bearer {manager_token}"}
            )
            assert response.status_code == 200, f"Report {report} with dates failed: {response.text}"
        print("✓ All reports work with date range filters")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
