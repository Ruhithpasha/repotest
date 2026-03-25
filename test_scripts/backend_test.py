import requests
import sys
import json
from datetime import datetime

class Plan4GrowthAPITester:
    def __init__(self, base_url="https://referral-payouts-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(name)
            print(f"✅ {name} - PASSED {details}")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method, endpoint, data=None, expect_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expect_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:200]}
            
            return success, response.status_code, response_data
            
        except requests.exceptions.RequestException as e:
            return False, 0, {"error": str(e)}

    def test_health_endpoints(self):
        """Test basic health and root endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, status, data = self.make_request("GET", "", expect_status=200)
        self.log_test("Root endpoint (/api/)", success, f"Status: {status}")
        
        # Test health endpoint
        success, status, data = self.make_request("GET", "health", expect_status=200)
        self.log_test("Health endpoint", success, f"Status: {status}")

    def test_auth_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPass123!",
            "phone": "+91 9876543210"
        }
        
        success, status, data = self.make_request("POST", "auth/register", test_user, expect_status=200)
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_id = data['user']['user_id']
            self.log_test("User Registration", True, f"User ID: {self.user_id}")
            return True
        else:
            self.log_test("User Registration", False, f"Status: {status}, Data: {data}")
            return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        
        if not self.token:
            print("⚠️  No registration token available, skipping login test")
            return False
        
        # Try to get current user first to verify token works
        success, status, data = self.make_request("GET", "auth/me", expect_status=200)
        self.log_test("Get current user (/auth/me)", success, f"Status: {status}")
        
        return success

    def test_courses_endpoints(self):
        """Test course-related endpoints"""
        print("\n🔍 Testing Course Endpoints...")
        
        # Get all courses
        success, status, data = self.make_request("GET", "courses", expect_status=200)
        course_available = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get all courses", success, f"Status: {status}, Courses: {len(data) if isinstance(data, list) else 0}")
        
        # Get specific course
        if course_available:
            course_id = data[0].get('course_id', 'course_implantology_l7')
            success, status, course_data = self.make_request("GET", f"courses/{course_id}", expect_status=200)
            self.log_test("Get specific course", success, f"Status: {status}")

    def test_contact_endpoint(self):
        """Test contact form submission"""
        print("\n🔍 Testing Contact Form...")
        
        contact_data = {
            "name": "Test Contact User",
            "email": "testcontact@example.com",
            "whatsapp": "+91 9876543210",
            "message": "This is a test contact message from automated testing."
        }
        
        success, status, data = self.make_request("POST", "contact", contact_data, expect_status=200)
        self.log_test("Contact form submission", success, f"Status: {status}")

    def test_application_endpoints(self):
        """Test application submission and retrieval"""
        print("\n🔍 Testing Application Endpoints...")
        
        # Submit application (public endpoint)
        app_data = {
            "name": "Dr. Test Applicant",
            "email": f"testapplicant{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "+91 9876543210",
            "qualification": "BDS",
            "experience_years": 3,
            "dental_registration": "DRN123456",
            "message": "Test application from automated testing"
        }
        
        success, status, data = self.make_request("POST", "applications", app_data, expect_status=200)
        self.log_test("Application submission", success, f"Status: {status}")
        
        # Get applications (requires auth)
        if self.token:
            success, status, data = self.make_request("GET", "applications", expect_status=200)
            self.log_test("Get user applications", success, f"Status: {status}")

    def test_dashboard_endpoints(self):
        """Test dashboard-related endpoints (requires auth)"""
        if not self.token:
            print("⚠️  No auth token available, skipping dashboard tests")
            return
        
        print("\n🔍 Testing Dashboard Endpoints...")
        
        # Dashboard stats
        success, status, data = self.make_request("GET", "dashboard/stats", expect_status=200)
        self.log_test("Dashboard stats", success, f"Status: {status}")
        
        # Enrollments
        success, status, data = self.make_request("GET", "enrollments", expect_status=200)
        self.log_test("Get enrollments", success, f"Status: {status}")
        
        # Documents
        success, status, data = self.make_request("GET", "documents", expect_status=200)
        self.log_test("Get documents", success, f"Status: {status}")
        
        # Payments
        success, status, data = self.make_request("GET", "payments", expect_status=200)
        self.log_test("Get payments", success, f"Status: {status}")

    def test_mocked_endpoints(self):
        """Test mocked payment and document endpoints"""
        if not self.token:
            print("⚠️  No auth token available, skipping mocked endpoint tests")
            return
        
        print("\n🔍 Testing Mocked Endpoints...")
        
        # Document upload URL (mocked S3)
        success, status, data = self.make_request("POST", "documents/upload-url", expect_status=200)
        self.log_test("Get document upload URL (mocked S3)", success, f"Status: {status}")
        
        # Create payment intent (mocked Stripe)
        payment_data = {
            "course_id": "course_implantology_l7",
            "amount": 8500.00,
            "currency": "GBP",
            "payment_type": "full"
        }
        success, status, data = self.make_request("POST", "payments/create-intent", payment_data, expect_status=200)
        payment_id = data.get('payment_id') if success else None
        self.log_test("Create payment intent (mocked Stripe)", success, f"Status: {status}")
        
        # Confirm payment (mocked)
        if payment_id:
            success, status, data = self.make_request("POST", f"payments/confirm/{payment_id}", expect_status=200)
            self.log_test("Confirm payment (mocked)", success, f"Status: {status}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Plan4Growth Academy API Testing...")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_health_endpoints()
        
        # Auth tests (registration creates user for other tests)
        registration_success = self.test_auth_registration()
        if registration_success:
            self.test_auth_login()
        
        # Public endpoints
        self.test_courses_endpoints()
        self.test_contact_endpoint()
        self.test_application_endpoints()
        
        # Protected endpoints
        self.test_dashboard_endpoints()
        self.test_mocked_endpoints()
        
        # Print summary
        return self.print_summary()

    def print_summary(self):
        """Print test execution summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        print("\n✅ PASSED TESTS:")
        for test in self.passed_tests:
            print(f"  • {test}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": round(self.tests_passed/self.tests_run*100, 1) if self.tests_run > 0 else 0,
            "failed_details": self.failed_tests,
            "passed_details": self.passed_tests
        }

def main():
    """Main test execution function"""
    tester = Plan4GrowthAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())