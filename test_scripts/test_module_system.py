"""
Module System Tests
Tests for Admin Module CRUD and Student Courses APIs
- Admin: CRUD for modules within programmes, drag-drop reorder
- Student: View enrolled courses, track progress, complete modules
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@plan4growth.uk"
SUPER_ADMIN_PASSWORD = "password123"
ENROLLED_STUDENT_EMAIL = "enrolled@plan4growth.uk"
ENROLLED_STUDENT_PASSWORD = "password123"

# Programme ID for testing (level7-implantology has 3 test modules)
TEST_PROGRAMME_ID = "level7-implantology"

class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        """Get enrolled student token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ENROLLED_STUDENT_EMAIL,
            "password": ENROLLED_STUDENT_PASSWORD
        })
        assert response.status_code == 200, f"Student login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin authentication works"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("✓ Super Admin login successful")
    
    def test_student_login(self, student_token):
        """Verify student authentication works"""
        assert student_token is not None
        assert len(student_token) > 0
        print("✓ Enrolled Student login successful")


class TestAdminModuleCRUD:
    """Admin Module Management API Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers for admin"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    created_module_id = None
    
    def test_list_modules_for_programme(self, headers):
        """GET /api/admin/programmes/:programmeId/modules - List all modules"""
        response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "programme" in data
        assert "modules" in data
        assert "totalModules" in data
        assert "totalDuration" in data
        
        assert data["programme"]["id"] == TEST_PROGRAMME_ID
        assert isinstance(data["modules"], list)
        print(f"✓ Listed {data['totalModules']} modules for programme ({data['totalDuration']} mins total)")
    
    def test_list_modules_active_filter(self, headers):
        """GET /api/admin/programmes/:programmeId/modules?active=true"""
        response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules?active=true",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned modules should be active
        for module in data["modules"]:
            assert module["active"] == True
        print(f"✓ Active filter working - returned {len(data['modules'])} active modules")
    
    def test_list_modules_nonexistent_programme(self, headers):
        """GET /api/admin/programmes/:programmeId/modules - 404 for non-existent programme"""
        response = requests.get(
            f"{BASE_URL}/api/admin/programmes/non-existent-prog/modules",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent programme")
    
    def test_create_module(self, headers):
        """POST /api/admin/programmes/:programmeId/modules - Create new module"""
        payload = {
            "title": "TEST_Module - Automated Test",
            "description": "This is a test module created by automated tests",
            "content": "<h1>Test Content</h1><p>This is test content for the module.</p>",
            "duration_minutes": 30,
            "active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            json=payload,
            headers=headers
        )
        assert response.status_code == 201, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "id" in data
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["duration_minutes"] == payload["duration_minutes"]
        assert data["active"] == True
        assert "order" in data
        
        # Store module ID for later tests
        TestAdminModuleCRUD.created_module_id = data["id"]
        print(f"✓ Created module: {data['id']} with order {data['order']}")
    
    def test_create_module_validation_title_too_short(self, headers):
        """POST /api/admin/programmes/:programmeId/modules - Title validation"""
        payload = {
            "title": "A",  # Too short (< 2 chars)
            "description": "Test description"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "title" in data.get("detail", "").lower() or "title" in data.get("field", "")
        print("✓ Rejects title shorter than 2 characters")
    
    def test_create_module_auto_order(self, headers):
        """POST - Auto-calculates order if not provided"""
        payload = {
            "title": "TEST_Auto Order Module",
            "description": "Module with auto-generated order"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            json=payload,
            headers=headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["order"] > 0  # Order should be auto-assigned
        print(f"✓ Auto-assigned order: {data['order']}")
        
        # Cleanup - deactivate the test module
        requests.delete(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/{data['id']}",
            headers=headers
        )
    
    def test_update_module(self, headers):
        """PATCH /api/admin/programmes/:programmeId/modules/:moduleId - Update module"""
        if not TestAdminModuleCRUD.created_module_id:
            pytest.skip("No module created to update")
        
        module_id = TestAdminModuleCRUD.created_module_id
        payload = {
            "title": "TEST_Module - Updated Title",
            "description": "Updated description",
            "duration_minutes": 45
        }
        response = requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/{module_id}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["duration_minutes"] == payload["duration_minutes"]
        print(f"✓ Updated module {module_id}")
        
        # Verify persistence via GET
        get_response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        modules = get_response.json()["modules"]
        updated_module = next((m for m in modules if m["id"] == module_id), None)
        assert updated_module is not None
        assert updated_module["title"] == payload["title"]
        print("✓ Update persisted correctly")
    
    def test_update_module_partial(self, headers):
        """PATCH - Partial update only changes specified fields"""
        if not TestAdminModuleCRUD.created_module_id:
            pytest.skip("No module created to update")
        
        module_id = TestAdminModuleCRUD.created_module_id
        
        # Get current state
        get_response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        modules = get_response.json()["modules"]
        current = next((m for m in modules if m["id"] == module_id), None)
        
        # Update only duration
        payload = {"duration_minutes": 60}
        response = requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/{module_id}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["duration_minutes"] == 60
        assert data["title"] == current["title"]  # Title unchanged
        print("✓ Partial update works correctly")
    
    def test_update_module_not_found(self, headers):
        """PATCH - Returns 404 for non-existent module"""
        payload = {"title": "Should Not Work"}
        response = requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/non-existent-mod",
            json=payload,
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent module")
    
    def test_reorder_modules(self, headers):
        """PATCH /api/admin/programmes/:programmeId/modules/reorder - Bulk reorder"""
        # Get current modules
        get_response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        modules = get_response.json()["modules"]
        
        if len(modules) < 2:
            pytest.skip("Need at least 2 modules to test reorder")
        
        # Reverse the order
        reordered = [
            {"id": m["id"], "order": len(modules) - i}
            for i, m in enumerate(modules)
        ]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/reorder",
            json={"modules": reordered},
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print("✓ Bulk reorder successful")
        
        # Restore original order
        original = [{"id": m["id"], "order": m["order"]} for m in modules]
        requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/reorder",
            json={"modules": original},
            headers=headers
        )
    
    def test_reorder_modules_empty_array(self, headers):
        """PATCH /reorder - Rejects empty modules array"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/reorder",
            json={"modules": []},
            headers=headers
        )
        assert response.status_code == 400
        print("✓ Rejects empty modules array")
    
    def test_delete_module(self, headers):
        """DELETE /api/admin/programmes/:programmeId/modules/:moduleId - Soft delete"""
        if not TestAdminModuleCRUD.created_module_id:
            pytest.skip("No module created to delete")
        
        module_id = TestAdminModuleCRUD.created_module_id
        response = requests.delete(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/{module_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print(f"✓ Module {module_id} deactivated (soft delete)")
        
        # Verify module is now inactive
        get_response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        all_modules = get_response.json()["modules"]
        deleted_module = next((m for m in all_modules if m["id"] == module_id), None)
        if deleted_module:
            assert deleted_module["active"] == False
    
    def test_delete_module_not_found(self, headers):
        """DELETE - Returns 404 for non-existent module"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules/non-existent-mod",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent module")
    
    def test_auth_required(self):
        """All endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules"
        )
        assert response.status_code == 401
        print("✓ Returns 401 without authentication")


class TestStudentCoursesAPI:
    """Student Courses API Tests"""
    
    @pytest.fixture(scope="class")
    def student_token(self):
        """Get enrolled student token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ENROLLED_STUDENT_EMAIL,
            "password": ENROLLED_STUDENT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, student_token):
        """Auth headers for student"""
        return {"Authorization": f"Bearer {student_token}"}
    
    def test_list_enrolled_courses(self, headers):
        """GET /api/student/courses - List student's enrolled courses"""
        response = requests.get(
            f"{BASE_URL}/api/student/courses",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "courses" in data
        assert isinstance(data["courses"], list)
        
        if len(data["courses"]) > 0:
            course = data["courses"][0]
            # Validate course structure
            assert "id" in course
            assert "program_name" in course
            assert "totalModules" in course
            assert "completedModules" in course
            assert "progressPercent" in course
            assert "isComplete" in course
            print(f"✓ Listed {len(data['courses'])} enrolled course(s)")
            print(f"  Course: {course['program_name']}, Progress: {course['progressPercent']}%")
        else:
            print("✓ No courses returned (student may not be enrolled)")
    
    def test_get_course_detail(self, headers):
        """GET /api/student/courses/:programmeId - Get course with modules"""
        response = requests.get(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate course structure
        assert "course" in data
        assert "modules" in data
        
        course = data["course"]
        assert course["id"] == TEST_PROGRAMME_ID
        assert "program_name" in course
        assert "totalModules" in course
        assert "progressPercent" in course
        
        # Validate modules structure
        modules = data["modules"]
        assert isinstance(modules, list)
        
        if len(modules) > 0:
            module = modules[0]
            assert "id" in module
            assert "title" in module
            assert "order" in module
            assert "status" in module  # not_started, in_progress, completed
            assert module["status"] in ["not_started", "in_progress", "completed"]
        
        print(f"✓ Course detail loaded: {course['program_name']}")
        print(f"  Modules: {len(modules)}, Progress: {course['progressPercent']}%")
    
    def test_get_course_not_enrolled(self, headers):
        """GET /api/student/courses/:programmeId - 403 if not enrolled"""
        response = requests.get(
            f"{BASE_URL}/api/student/courses/some-other-course",
            headers=headers
        )
        # Should return 403 (not enrolled) or 404 (not found)
        assert response.status_code in [403, 404]
        print("✓ Access denied for non-enrolled course")
    
    def test_update_progress_start_module(self, headers):
        """PATCH /api/student/courses/:programmeId/modules/:moduleId/progress - Start module"""
        # Get course detail to find a module
        get_response = requests.get(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}",
            headers=headers
        )
        if get_response.status_code != 200:
            pytest.skip("Cannot access course")
        
        modules = get_response.json()["modules"]
        if not modules:
            pytest.skip("No modules in course")
        
        # Find a not_started or use first module
        target_module = next(
            (m for m in modules if m["status"] == "not_started"),
            modules[-1]  # Use last module as fallback
        )
        
        module_id = target_module["id"]
        response = requests.patch(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}/modules/{module_id}/progress",
            json={"status": "in_progress"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "module" in data
        assert "overallProgress" in data
        assert data["module"]["status"] == "in_progress"
        assert "started_at" in data["module"]
        print(f"✓ Module '{target_module['title']}' started")
    
    def test_update_progress_complete_module(self, headers):
        """PATCH progress - Mark module as completed"""
        get_response = requests.get(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}",
            headers=headers
        )
        if get_response.status_code != 200:
            pytest.skip("Cannot access course")
        
        modules = get_response.json()["modules"]
        
        # Find an in_progress module or use first module
        target_module = next(
            (m for m in modules if m["status"] == "in_progress"),
            modules[0]
        )
        
        module_id = target_module["id"]
        response = requests.patch(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}/modules/{module_id}/progress",
            json={"status": "completed"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["module"]["status"] == "completed"
        assert "completed_at" in data["module"]
        assert "overallProgress" in data
        assert "progressPercent" in data["overallProgress"]
        print(f"✓ Module completed - Overall progress: {data['overallProgress']['progressPercent']}%")
    
    def test_update_progress_invalid_status(self, headers):
        """PATCH progress - Rejects invalid status values"""
        get_response = requests.get(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}",
            headers=headers
        )
        if get_response.status_code != 200:
            pytest.skip("Cannot access course")
        
        modules = get_response.json()["modules"]
        if not modules:
            pytest.skip("No modules in course")
        
        module_id = modules[0]["id"]
        response = requests.patch(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}/modules/{module_id}/progress",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400
        print("✓ Rejects invalid status value")
    
    def test_update_progress_wrong_course(self, headers):
        """PATCH progress - 403 for module in non-enrolled course"""
        response = requests.patch(
            f"{BASE_URL}/api/student/courses/other-course/modules/some-mod/progress",
            json={"status": "in_progress"},
            headers=headers
        )
        assert response.status_code in [403, 404]
        print("✓ Cannot update progress for non-enrolled course")
    
    def test_progress_tracking_overall_calculation(self, headers):
        """Verify overall progress is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/student/courses/{TEST_PROGRAMME_ID}",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Cannot access course")
        
        data = response.json()
        course = data["course"]
        modules = data["modules"]
        
        # Count completed modules
        completed_count = sum(1 for m in modules if m["status"] == "completed")
        expected_percent = round((completed_count / len(modules)) * 100) if modules else 0
        
        assert course["completedModules"] == completed_count
        assert course["progressPercent"] == expected_percent
        print(f"✓ Progress calculation correct: {completed_count}/{len(modules)} = {expected_percent}%")
    
    def test_auth_required(self):
        """All endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/student/courses")
        assert response.status_code == 401
        print("✓ Returns 401 without authentication")


class TestAccessControl:
    """Cross-role access control tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ENROLLED_STUDENT_EMAIL,
            "password": ENROLLED_STUDENT_PASSWORD
        })
        return response.json()["token"]
    
    def test_student_cannot_access_admin_modules(self, student_token):
        """Student cannot access admin module endpoints"""
        headers = {"Authorization": f"Bearer {student_token}"}
        
        # Try to list admin modules
        response = requests.get(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            headers=headers
        )
        assert response.status_code == 403
        
        # Try to create module
        response = requests.post(
            f"{BASE_URL}/api/admin/programmes/{TEST_PROGRAMME_ID}/modules",
            json={"title": "Should Fail"},
            headers=headers
        )
        assert response.status_code == 403
        print("✓ Student cannot access admin module APIs")
    
    def test_admin_cannot_access_student_courses(self, admin_token):
        """Admin cannot access student course APIs (different role)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Admin trying to access student courses endpoint
        response = requests.get(
            f"{BASE_URL}/api/student/courses",
            headers=headers
        )
        # Should be 403 (not a student role)
        assert response.status_code == 403
        print("✓ Admin cannot access student course APIs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
