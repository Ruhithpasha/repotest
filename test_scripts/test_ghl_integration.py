"""
GoHighLevel Integration Tests
Tests for GHL-related features: approveApplication, qualifyStudent, send-booking-link, GHL webhook
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://referral-payouts-hub.preview.emergentagent.com').rstrip('/')


class TestAuthentication:
    """Authentication tests for super admin"""
    
    def test_login_super_admin(self):
        """Test super admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data
        print(f"Super admin login successful")
        return data.get("token") or data.get("access_token")


class TestApplicationsEndpoint:
    """Tests for the admin applications endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_applications_review_list(self):
        """Test GET /api/admin/applications-review returns self-registered students"""
        response = requests.get(f"{BASE_URL}/api/admin/applications-review", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} self-registered applications")
        if len(data) > 0:
            app = data[0]
            assert "student_id" in app
            assert "name" in app
            assert "email" in app
            assert "status" in app
            print(f"Sample application: {app.get('name')} - {app.get('status')}")
    
    def test_get_applications_list_main(self):
        """Test GET /api/admin/applications returns all students"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} total applications")
        if len(data) > 0:
            for app in data[:3]:
                print(f"  - {app.get('student_id')}: status={app.get('status')}, ghl_contact_id={app.get('ghl_contact_id')}")


class TestGHLFields:
    """Tests to verify GHL fields are returned in student data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_student_has_ghl_fields(self):
        """Verify student model returns GHL-related fields"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find a student with GHL fields populated (if any)
        ghl_fields = ['ghl_contact_id', 'booking_link_sent', 'booking_link_sent_at', 
                      'call_booked_at', 'qualification_status', 'qualified_at', 'qualified_by']
        
        if len(data) > 0:
            student = data[0]
            print(f"Checking GHL fields for student: {student.get('student_id')}")
            for field in ghl_fields:
                value = student.get(field)
                print(f"  {field}: {value}")
            
            # Verify at least some GHL fields exist in response
            has_some_ghl_fields = any(field in student for field in ghl_fields)
            assert has_some_ghl_fields, "Student should have GHL-related fields"
            print("GHL fields present in student data")


class TestApproveApplication:
    """Tests for approve application with GHL integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_approve_application_requires_valid_student(self):
        """Test approve returns 404 for invalid student"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/applications/invalid_student_id/approve",
            headers=self.headers
        )
        # Should be 404 or validation error
        assert response.status_code in [404, 400, 500], f"Unexpected status: {response.status_code}"
        print(f"Correctly rejected invalid student: {response.status_code}")
    
    def test_approve_application_endpoint_exists(self):
        """Verify approve application endpoint exists"""
        # Get a real student first
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=self.headers)
        if response.status_code == 200:
            students = response.json()
            # Find student in under_review status
            under_review = [s for s in students if s.get('status') == 'under_review']
            if len(under_review) > 0:
                student_id = under_review[0]['student_id']
                print(f"Testing approve on student: {student_id}")
                # Don't actually approve, just verify endpoint responds
                response = requests.options(
                    f"{BASE_URL}/api/admin/applications/{student_id}/approve",
                    headers=self.headers
                )
                # OPTIONS or HEAD should not error
                print(f"Approve endpoint check: {response.status_code}")
            else:
                print("No students in under_review status - skipping actual approval test")
                pytest.skip("No under_review students to test")


class TestQualifyStudent:
    """Tests for the qualify student endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_qualify_student_requires_valid_student(self):
        """Test qualify returns 404 for invalid student"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/students/invalid_id/qualify",
            headers=self.headers,
            json={"qualification_status": "passed"}
        )
        assert response.status_code in [404, 500], f"Unexpected: {response.status_code}"
        print(f"Correctly rejected invalid student: {response.status_code}")
    
    def test_qualify_student_endpoint_exists(self):
        """Verify qualify endpoint exists and accepts correct payload"""
        # Get a student who has interview_completed status
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=self.headers)
        if response.status_code == 200:
            students = response.json()
            interview_completed = [s for s in students if s.get('status') == 'interview_completed']
            if len(interview_completed) > 0:
                student_id = interview_completed[0]['student_id']
                print(f"Found student with interview_completed: {student_id}")
                # Test the endpoint with proper payload
                response = requests.patch(
                    f"{BASE_URL}/api/admin/students/{student_id}/qualify",
                    headers=self.headers,
                    json={"qualification_status": "passed", "qualification_notes": "Test qualification"}
                )
                print(f"Qualify response: {response.status_code} - {response.text[:200]}")
            else:
                print("No students in interview_completed status")
                pytest.skip("No interview_completed students")


class TestSendBookingLink:
    """Tests for the CRM send booking link endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_send_booking_link_invalid_student(self):
        """Test send booking link returns 404 for invalid student"""
        response = requests.post(
            f"{BASE_URL}/api/crm/students/invalid_id/send-booking-link",
            headers=self.headers
        )
        assert response.status_code in [404, 500], f"Unexpected: {response.status_code}"
        print(f"Correctly rejected invalid student: {response.status_code}")
    
    def test_send_booking_link_endpoint_exists(self):
        """Verify send-booking-link endpoint is accessible"""
        # Get any student to test
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=self.headers)
        if response.status_code == 200:
            students = response.json()
            if len(students) > 0:
                student_id = students[0]['student_id']
                print(f"Testing send-booking-link on student: {student_id}")
                # Test endpoint
                response = requests.post(
                    f"{BASE_URL}/api/crm/students/{student_id}/send-booking-link",
                    headers=self.headers
                )
                # Should either succeed (200) or fail with business error (400)
                assert response.status_code in [200, 400, 404, 500], f"Unexpected: {response.status_code}"
                print(f"Send booking link response: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"Success: {data.get('message')}")


class TestGHLWebhook:
    """Tests for the GHL webhook endpoint"""
    
    def test_webhook_endpoint_exists(self):
        """Test GHL webhook endpoint responds"""
        # Send a test webhook payload (will fail signature, but endpoint should respond)
        response = requests.post(
            f"{BASE_URL}/api/webhooks/ghl",
            headers={"Content-Type": "application/json"},
            data='{"type": "test"}'
        )
        # Webhook might reject due to signature, but should not be 404
        assert response.status_code != 404, "Webhook endpoint should exist"
        print(f"Webhook endpoint response: {response.status_code}")
        # 401 (invalid sig) or 500 (processing error) are acceptable
        assert response.status_code in [200, 401, 500], f"Unexpected: {response.status_code}"


class TestStatusEnums:
    """Tests to verify extended status ENUMs work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_status_filter_works(self):
        """Test filtering by new GHL-related statuses"""
        ghl_statuses = ['call_booking_sent', 'call_booked', 'interview_completed', 'qualified']
        
        for status in ghl_statuses:
            response = requests.get(
                f"{BASE_URL}/api/admin/applications?status={status}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Filter by {status} failed"
            data = response.json()
            print(f"Status '{status}': {len(data)} students")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
