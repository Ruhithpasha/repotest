"""
Test Stripe Live Payment Integration
Tests payment config, student payment info, and payment intent creation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
FRESH_STUDENT_EMAIL = "freshstudent@plan4growth.uk"
TEST_STUDENT_EMAIL = "teststudent@plan4growth.uk"
PASSWORD = "password123"


class TestStripePaymentConfig:
    """Test GET /api/payments/config endpoint"""
    
    def test_get_payment_config_returns_correct_structure(self):
        """Test that payment config returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'courseFee' in data
        assert 'depositAmount' in data
        assert 'monthlyInstallment' in data
        assert 'totalInstallments' in data
        assert 'remainingAfterDeposit' in data
        assert 'isLive' in data
        assert 'publishableKey' in data
        assert 'currency' in data
        
        # Verify values
        assert data['courseFee'] == 7999
        assert data['depositAmount'] == 500
        assert data['monthlyInstallment'] == 1249.83
        assert data['totalInstallments'] == 6
        assert data['currency'] == 'gbp'
        assert data['publishableKey'].startswith('pk_')
        
        print(f"✓ Payment config returned successfully")
        print(f"  - Course fee: £{data['courseFee']}")
        print(f"  - Deposit: £{data['depositAmount']}")
        print(f"  - Monthly: £{data['monthlyInstallment']}")
        print(f"  - Stripe mode: {'LIVE' if data['isLive'] else 'TEST'}")


class TestStudentPaymentInfo:
    """Test GET /api/payments/my-info endpoint for students"""
    
    @pytest.fixture
    def fresh_student_token(self):
        """Login fresh student (qualified, no payments)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FRESH_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login fresh student: {response.text}")
        return response.json()['token']
    
    @pytest.fixture
    def test_student_token(self):
        """Login test student (payment_pending)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login test student: {response.text}")
        return response.json()['token']
    
    def test_fresh_student_can_get_payment_info(self, fresh_student_token):
        """Fresh student (qualified, no payments) gets correct payment info"""
        headers = {"Authorization": f"Bearer {fresh_student_token}"}
        response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert 'student_id' in data
        assert 'status' in data
        assert 'can_pay' in data
        assert 'course_fee_gbp' in data
        assert 'total_paid_gbp' in data
        assert 'remaining_gbp' in data
        assert 'is_fully_paid' in data
        assert 'payments' in data
        assert 'subscription' in data
        assert 'stripe_mode' in data
        assert 'publishable_key' in data
        
        # Verify qualified student values
        assert data['status'] == 'qualified'
        assert data['can_pay'] == True
        assert data['course_fee_gbp'] == 7999
        assert data['total_paid_gbp'] == 0
        assert data['remaining_gbp'] == 7999
        assert data['is_fully_paid'] == False
        assert len(data['payments']) == 0
        
        print(f"✓ Fresh student payment info correct")
        print(f"  - Status: {data['status']}")
        print(f"  - Can pay: {data['can_pay']}")
        print(f"  - Remaining: £{data['remaining_gbp']}")
    
    def test_test_student_can_get_payment_info(self, test_student_token):
        """Test student (payment_pending) gets correct payment info"""
        headers = {"Authorization": f"Bearer {test_student_token}"}
        response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['status'] == 'payment_pending'
        assert data['can_pay'] == True
        
        print(f"✓ Test student payment info correct")
        print(f"  - Status: {data['status']}")
        print(f"  - Can pay: {data['can_pay']}")
        print(f"  - Total paid: £{data['total_paid_gbp']}")
        print(f"  - Remaining: £{data['remaining_gbp']}")
        print(f"  - Payments count: {len(data['payments'])}")
        if data.get('subscription'):
            print(f"  - Has subscription: Yes (status: {data['subscription']['status']})")
    
    def test_unauthenticated_request_fails(self):
        """Unauthenticated request to payment info should fail"""
        response = requests.get(f"{BASE_URL}/api/payments/my-info")
        
        assert response.status_code in [401, 403]
        print(f"✓ Unauthenticated request correctly rejected (status: {response.status_code})")


class TestCreateFullPayment:
    """Test POST /api/payments/create-full-payment endpoint"""
    
    @pytest.fixture
    def fresh_student_token(self):
        """Login fresh student (qualified, no payments)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FRESH_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login fresh student: {response.text}")
        return response.json()['token']
    
    def test_create_full_payment_returns_client_secret(self, fresh_student_token):
        """Creating full payment returns Stripe client secret"""
        headers = {"Authorization": f"Bearer {fresh_student_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/payments/create-full-payment",
            headers=headers,
            json={"origin_url": "https://test.com"}
        )
        
        # This should succeed and return client_secret for Stripe
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'client_secret' in data
        assert 'payment_intent_id' in data
        assert 'payment_id' in data
        assert 'amount_gbp' in data
        assert 'publishable_key' in data
        
        # Verify values
        assert data['client_secret'].startswith('pi_') or '_secret_' in data['client_secret']
        assert data['payment_intent_id'].startswith('pi_')
        assert data['payment_id'].startswith('pay_')
        assert data['amount_gbp'] == 7999  # Full course fee
        assert data['publishable_key'].startswith('pk_')
        
        print(f"✓ Full payment created successfully")
        print(f"  - Payment Intent ID: {data['payment_intent_id']}")
        print(f"  - Payment ID: {data['payment_id']}")
        print(f"  - Amount: £{data['amount_gbp']}")
    
    def test_create_full_payment_unauthenticated_fails(self):
        """Unauthenticated request should fail"""
        response = requests.post(f"{BASE_URL}/api/payments/create-full-payment")
        
        assert response.status_code in [401, 403]
        print(f"✓ Unauthenticated request correctly rejected")


class TestCreateDepositPayment:
    """Test POST /api/payments/create-deposit-payment endpoint"""
    
    @pytest.fixture
    def fresh_student_token(self):
        """Login fresh student (qualified, no payments)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FRESH_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login fresh student: {response.text}")
        return response.json()['token']
    
    def test_create_deposit_payment_returns_client_secret(self, fresh_student_token):
        """Creating deposit payment returns Stripe client secret for installment plan"""
        headers = {"Authorization": f"Bearer {fresh_student_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/payments/create-deposit-payment",
            headers=headers,
            json={"origin_url": "https://test.com"}
        )
        
        # This should succeed and return client_secret for Stripe
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'client_secret' in data
        assert 'payment_intent_id' in data
        assert 'payment_id' in data
        assert 'subscription_id' in data
        assert 'amount_gbp' in data
        assert 'monthly_amount' in data
        assert 'total_installments' in data
        assert 'publishable_key' in data
        
        # Verify values
        assert data['client_secret'].startswith('pi_') or '_secret_' in data['client_secret']
        assert data['payment_intent_id'].startswith('pi_')
        assert data['payment_id'].startswith('pay_')
        assert data['subscription_id'].startswith('sub_')
        assert data['amount_gbp'] == 500  # Deposit amount
        assert data['monthly_amount'] == 1249.83
        assert data['total_installments'] == 6
        
        print(f"✓ Deposit payment created successfully")
        print(f"  - Payment Intent ID: {data['payment_intent_id']}")
        print(f"  - Payment ID: {data['payment_id']}")
        print(f"  - Subscription ID: {data['subscription_id']}")
        print(f"  - Deposit: £{data['amount_gbp']}")
        print(f"  - Monthly: £{data['monthly_amount']}")
        print(f"  - Installments: {data['total_installments']}")


class TestDuplicatePaymentPrevention:
    """Test server-side duplicate payment prevention"""
    
    @pytest.fixture
    def test_student_token(self):
        """Login test student (payment_pending, may have pending payments)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login test student: {response.text}")
        return response.json()['token']
    
    def test_check_existing_payments_before_create(self, test_student_token):
        """API should check for existing payments before creating new ones"""
        headers = {"Authorization": f"Bearer {test_student_token}"}
        
        # First check current state
        info_response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        assert info_response.status_code == 200
        info_data = info_response.json()
        
        # Log current state
        has_paid_full = any(
            p['payment_type'] == 'full' and p['status'] == 'paid' 
            for p in info_data.get('payments', [])
        )
        has_paid_deposit = any(
            p['payment_type'] == 'deposit' and p['status'] == 'paid' 
            for p in info_data.get('payments', [])
        )
        
        print(f"  - Has paid full payment: {has_paid_full}")
        print(f"  - Has paid deposit: {has_paid_deposit}")
        print(f"  - Total paid: £{info_data['total_paid_gbp']}")
        
        if info_data['is_fully_paid']:
            # If fully paid, trying to create payment should fail
            response = requests.post(
                f"{BASE_URL}/api/payments/create-full-payment",
                headers=headers,
                json={}
            )
            assert response.status_code == 400
            print(f"✓ Duplicate payment correctly prevented for fully paid student")
        else:
            print(f"✓ Student can still make payments (remaining: £{info_data['remaining_gbp']})")


class TestPaymentHistory:
    """Test GET /api/payments/history/:studentId endpoint"""
    
    @pytest.fixture
    def test_student_token(self):
        """Login test student"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_STUDENT_EMAIL,
            "password": PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login test student: {response.text}")
        return response.json()['token']
    
    def test_student_can_view_own_payment_history(self, test_student_token):
        """Student can view their own payment history"""
        headers = {"Authorization": f"Bearer {test_student_token}"}
        
        # First get student ID from my-info
        info_response = requests.get(f"{BASE_URL}/api/payments/my-info", headers=headers)
        assert info_response.status_code == 200
        student_id = info_response.json()['student_id']
        
        # Then get payment history
        response = requests.get(
            f"{BASE_URL}/api/payments/history/{student_id}", 
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'payments' in data
        assert 'subscription' in data
        
        print(f"✓ Payment history retrieved successfully")
        print(f"  - Payments count: {len(data['payments'])}")
        if data['subscription']:
            print(f"  - Has subscription: Yes")
            print(f"    - Status: {data['subscription']['status']}")
            print(f"    - Installments paid: {data['subscription']['installments_paid']}/{data['subscription']['total_installments']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
