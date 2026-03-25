"""
Test Manager Student Registration Feature
Tests for managers to register and manage their own students.
Features: Register new students, view student list, get student details, submit for review
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestManagerStudentRegistration:
    """Manager Student Registration API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.manager_token = None
        self.admin_token = None
        self.test_student_id = None
        self.test_student_email = f"test_student_{uuid.uuid4().hex[:8]}@example.com"
        
    def get_manager_token(self):
        """Get manager authentication token"""
        if self.manager_token:
            return self.manager_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@plan4growth.uk",
            "password": "password123"
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        self.manager_token = response.json().get("token")
        return self.manager_token
    
    def get_admin_token(self):
        """Get admin token for verification"""
        if self.admin_token:
            return self.admin_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@plan4growth.uk",
            "password": "password123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
        return self.admin_token
    
    # ==========================================
    # TEST: POST /api/manager/students - Register New Student
    # ==========================================
    
    def test_01_register_student_success(self):
        """Test successful student registration by manager"""
        token = self.get_manager_token()
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Test Student {unique_id}",
                "email": f"teststudent_{unique_id}@example.com",
                "password": "password123",
                "whatsapp_number": "+44 7700 900000",
                "city": "London",
                "state": "England"
            }
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should contain 'message'"
        assert "student" in data, "Response should contain 'student'"
        assert "next_step" in data, "Response should contain 'next_step'"
        
        # Verify student data
        student = data["student"]
        assert "student_id" in student, "Student should have student_id"
        assert "user_id" in student, "Student should have user_id"
        assert student["status"] == "registered", "Initial status should be 'registered'"
        assert student["name"] == f"Test Student {unique_id}"
        
        # Store for later tests
        self.__class__.created_student_id = student["student_id"]
        print(f"Created student: {student['student_id']}")
    
    def test_02_register_student_missing_required_fields(self):
        """Test registration fails without required fields"""
        token = self.get_manager_token()
        
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "incomplete@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 400, "Should fail without name"
        
        # Missing email
        response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Test Student",
                "password": "password123"
            }
        )
        assert response.status_code == 400, "Should fail without email"
    
    def test_03_register_student_short_password(self):
        """Test registration fails with short password"""
        token = self.get_manager_token()
        
        response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Test Student",
                "email": f"short_pass_{uuid.uuid4().hex[:8]}@example.com",
                "password": "12345"  # Less than 6 characters
            }
        )
        
        assert response.status_code == 400, "Should fail with short password"
        data = response.json()
        assert "6 characters" in data.get("detail", "").lower() or "password" in data.get("detail", "").lower()
    
    def test_04_register_student_duplicate_email(self):
        """Test registration fails with duplicate email"""
        token = self.get_manager_token()
        unique_email = f"duplicate_test_{uuid.uuid4().hex[:8]}@example.com"
        
        # First registration should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "First Student",
                "email": unique_email,
                "password": "password123"
            }
        )
        assert response1.status_code == 201, "First registration should succeed"
        
        # Second registration with same email should fail
        response2 = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Duplicate Student",
                "email": unique_email,
                "password": "password123"
            }
        )
        assert response2.status_code == 400, "Duplicate email should fail"
        data = response2.json()
        assert "already exists" in data.get("detail", "").lower()
    
    def test_05_register_student_unauthorized(self):
        """Test registration fails without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/manager/students",
            json={
                "name": "Unauthorized Student",
                "email": "unauth@example.com",
                "password": "password123"
            }
        )
        assert response.status_code in [401, 403], "Should fail without auth"
    
    # ==========================================
    # TEST: GET /api/manager/students - List Manager's Students
    # ==========================================
    
    def test_06_get_students_list(self):
        """Test fetching list of manager's students"""
        token = self.get_manager_token()
        
        response = requests.get(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response is a list
        assert isinstance(data, list), "Response should be a list"
        
        # If there are students, verify structure
        if len(data) > 0:
            student = data[0]
            assert "student_id" in student, "Student should have student_id"
            assert "user" in student, "Student should have user info"
            assert "status" in student, "Student should have status"
            assert "documents_uploaded" in student, "Student should have documents_uploaded count"
            print(f"Found {len(data)} students")
    
    def test_07_get_students_with_status_filter(self):
        """Test filtering students by status"""
        token = self.get_manager_token()
        
        response = requests.get(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            params={"status": "registered"}
        )
        
        assert response.status_code == 200, f"Status filter failed: {response.text}"
        data = response.json()
        
        # All returned students should have the filtered status
        for student in data:
            assert student.get("status") == "registered", "Filter should only return registered students"
    
    def test_08_get_students_with_search(self):
        """Test searching students"""
        token = self.get_manager_token()
        
        response = requests.get(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            params={"search": "test"}
        )
        
        assert response.status_code == 200, f"Search failed: {response.text}"
    
    def test_09_get_students_unauthorized(self):
        """Test fetching students fails without auth"""
        response = requests.get(f"{BASE_URL}/api/manager/students")
        assert response.status_code in [401, 403], "Should fail without auth"
    
    # ==========================================
    # TEST: GET /api/manager/students/:studentId - Get Student Details
    # ==========================================
    
    def test_10_get_student_details(self):
        """Test getting individual student details"""
        token = self.get_manager_token()
        
        # First create a student
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Detail Test {unique_id}",
                "email": f"detail_test_{unique_id}@example.com",
                "password": "password123",
                "whatsapp_number": "+44 7700 900001"
            }
        )
        assert create_response.status_code == 201, f"Create failed: {create_response.text}"
        student_id = create_response.json()["student"]["student_id"]
        
        # Get student details
        response = requests.get(
            f"{BASE_URL}/api/manager/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "student_id" in data, "Should have student_id"
        assert "user" in data, "Should have user info"
        assert "documents" in data, "Should have documents array"
        assert data["student_id"] == student_id
        print(f"Student details fetched successfully: {student_id}")
    
    def test_11_get_student_not_found(self):
        """Test getting non-existent student returns 404"""
        token = self.get_manager_token()
        
        response = requests.get(
            f"{BASE_URL}/api/manager/students/nonexistent_student_id",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_12_get_student_unauthorized(self):
        """Test getting student details fails without auth"""
        response = requests.get(f"{BASE_URL}/api/manager/students/some_id")
        assert response.status_code in [401, 403], "Should fail without auth"
    
    # ==========================================
    # TEST: POST /api/manager/students/:studentId/submit-review - Submit for Review
    # ==========================================
    
    def test_13_submit_for_review_without_documents(self):
        """Test submit for review fails without required documents"""
        token = self.get_manager_token()
        
        # Create a fresh student without documents
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Review Test {unique_id}",
                "email": f"review_test_{unique_id}@example.com",
                "password": "password123",
                "whatsapp_number": "+44 7700 900002"
            }
        )
        assert create_response.status_code == 201
        student_id = create_response.json()["student"]["student_id"]
        
        # Try to submit for review without uploading documents
        response = requests.post(
            f"{BASE_URL}/api/manager/students/{student_id}/submit-review",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify error mentions missing documents
        assert "missing" in data.get("detail", "").lower() or "document" in data.get("detail", "").lower()
        
        # Should include list of missing documents
        if "missing_documents" in data:
            assert isinstance(data["missing_documents"], list)
            assert len(data["missing_documents"]) > 0
            print(f"Missing documents: {data['missing_documents']}")
    
    def test_14_submit_for_review_not_found(self):
        """Test submit for review fails for non-existent student"""
        token = self.get_manager_token()
        
        response = requests.post(
            f"{BASE_URL}/api/manager/students/nonexistent_id/submit-review",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
    
    def test_15_submit_for_review_unauthorized(self):
        """Test submit for review fails without auth"""
        response = requests.post(f"{BASE_URL}/api/manager/students/some_id/submit-review")
        assert response.status_code in [401, 403]
    
    # ==========================================
    # TEST: Role-based Access Control
    # ==========================================
    
    def test_16_non_manager_cannot_access(self):
        """Test that non-manager role cannot access manager student endpoints"""
        # Get sales user token
        sales_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sales@plan4growth.uk",
            "password": "password123"
        })
        
        if sales_response.status_code != 200:
            pytest.skip("Sales user not available for testing")
        
        sales_token = sales_response.json().get("token")
        
        # Try to access manager students endpoint
        response = requests.get(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        
        assert response.status_code == 403, "Non-manager should get 403"
    
    # ==========================================
    # TEST: Verify Data Persistence
    # ==========================================
    
    def test_17_verify_student_persistence(self):
        """Test that created student data persists correctly"""
        token = self.get_manager_token()
        unique_id = uuid.uuid4().hex[:8]
        
        # Create student with all fields
        create_payload = {
            "name": f"Persistence Test {unique_id}",
            "email": f"persist_test_{unique_id}@example.com",
            "password": "password123",
            "whatsapp_number": "+44 7700 900003",
            "dob": "1990-05-15",
            "city": "Manchester",
            "state": "England",
            "dental_reg_number": f"GDC-{unique_id}",
            "experience_years": "5"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json=create_payload
        )
        assert create_response.status_code == 201
        student_id = create_response.json()["student"]["student_id"]
        
        # Verify persistence via GET
        get_response = requests.get(
            f"{BASE_URL}/api/manager/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify all fields persisted
        assert data["city"] == "Manchester"
        assert data["state"] == "England"
        assert data["dental_reg_number"] == f"GDC-{unique_id}"
        assert data["experience_years"] == 5
        assert data["user"]["name"] == f"Persistence Test {unique_id}"
        print(f"All fields persisted correctly for student {student_id}")
    
    def test_18_student_appears_in_list(self):
        """Test that created student appears in the list"""
        token = self.get_manager_token()
        unique_id = uuid.uuid4().hex[:8]
        
        # Create student
        create_response = requests.post(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"List Test {unique_id}",
                "email": f"list_test_{unique_id}@example.com",
                "password": "password123",
                "whatsapp_number": "+44 7700 900004"
            }
        )
        assert create_response.status_code == 201
        student_id = create_response.json()["student"]["student_id"]
        
        # Verify student appears in list
        list_response = requests.get(
            f"{BASE_URL}/api/manager/students",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        students = list_response.json()
        
        student_ids = [s.get("student_id") for s in students]
        assert student_id in student_ids, "Created student should appear in list"
        print(f"Student {student_id} found in list of {len(students)} students")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
