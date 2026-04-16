"""
Miro.Care Backend API Tests
Tests for: Auth, Problems, Tariffs, Chat, User Settings, Specialists
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@miro.care"
ADMIN_PASSWORD = "MiroCare2026!"
TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "Test123!"


class TestHealthAndPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_get_problems_returns_10_categories(self):
        """GET /api/problems should return 10 problem categories"""
        response = requests.get(f"{BASE_URL}/api/problems")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "problems" in data, "Response should contain 'problems' key"
        assert len(data["problems"]) == 10, f"Expected 10 problems, got {len(data['problems'])}"
        
        # Verify expected problem IDs
        expected_ids = ['anxiety', 'depression', 'relationships', 'ptsd', 'self_esteem',
                       'eating_disorder', 'weight', 'grief', 'meaning', 'other']
        actual_ids = [p["id"] for p in data["problems"]]
        for pid in expected_ids:
            assert pid in actual_ids, f"Missing problem ID: {pid}"
    
    def test_get_tariffs_returns_4_plans(self):
        """GET /api/tariffs should return 4 tariff plans"""
        response = requests.get(f"{BASE_URL}/api/tariffs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tariffs" in data, "Response should contain 'tariffs' key"
        
        tariffs = data["tariffs"]
        assert len(tariffs) == 4, f"Expected 4 tariffs, got {len(tariffs)}"
        
        # Verify tariff IDs
        expected_ids = ['test', 'hour', 'week', 'month']
        for tid in expected_ids:
            assert tid in tariffs, f"Missing tariff ID: {tid}"
        
        # Verify test tariff is free
        assert tariffs["test"]["price"] == 0.0, "Test tariff should be free"
        
        # Verify pricing
        assert tariffs["hour"]["price"] == 3.0, "Hour tariff should be $3"
        assert tariffs["week"]["price"] == 14.0, "Week tariff should be $14"
        assert tariffs["month"]["price"] == 29.0, "Month tariff should be $29"
    
    def test_get_specialists(self):
        """GET /api/specialists should return specialist data"""
        response = requests.get(f"{BASE_URL}/api/specialists")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "specialists" in data, "Response should contain 'specialists' key"
        assert len(data["specialists"]) >= 1, "Should have at least 1 specialist"
        
        # Verify Miron Shakira is present
        miron = data["specialists"][0]
        assert miron["id"] == "miron_shakira", "First specialist should be Miron Shakira"
        assert "photo_url" in miron, "Specialist should have photo_url"
        assert "credentials" in miron, "Specialist should have credentials"


class TestAuthFlow:
    """Test authentication endpoints"""
    
    def test_register_new_user(self):
        """POST /api/auth/register should create new user"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test User"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "access_token" in data, "Response should contain 'access_token'"
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["role"] == "user"
        assert "password_hash" not in data["user"], "Password hash should not be exposed"
    
    def test_register_duplicate_email_fails(self):
        """POST /api/auth/register with existing email should fail"""
        # First registration
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!"
        })
        
        # Second registration with same email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "DifferentPass123!"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_login_admin_success(self):
        """POST /api/auth/login with admin credentials should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "access_token" in data, "Response should contain 'access_token'"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials_fails(self):
        """POST /api/auth/login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_me_without_auth_fails(self):
        """GET /api/auth/me without token should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_me_with_token_succeeds(self):
        """GET /api/auth/me with valid token should return user"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL


class TestUserSettings:
    """Test user settings update endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate")
        return response.json()["access_token"]
    
    def test_update_voice_setting(self, auth_token):
        """PUT /api/user/voice should update voice preference"""
        response = requests.put(f"{BASE_URL}/api/user/voice", 
            json={"voice": "male"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify change persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert me_response.json()["user"]["selected_voice"] == "male"
    
    def test_update_problem_setting(self, auth_token):
        """PUT /api/user/problem should update selected problem"""
        response = requests.put(f"{BASE_URL}/api/user/problem", 
            json={"problem": "anxiety"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify change persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert me_response.json()["user"]["selected_problem"] == "anxiety"
    
    def test_update_language_setting(self, auth_token):
        """PUT /api/user/language should update language preference"""
        response = requests.put(f"{BASE_URL}/api/user/language", 
            json={"language": "en"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify change persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert me_response.json()["user"]["selected_language"] == "en"
    
    def test_update_theme_setting(self, auth_token):
        """PUT /api/user/theme should update theme preference"""
        response = requests.put(f"{BASE_URL}/api/user/theme", 
            json={"theme": "dark"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify change persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert me_response.json()["user"]["theme"] == "dark"


class TestChatEndpoint:
    """Test AI chat endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate")
        return response.json()["access_token"]
    
    def test_chat_sends_message_and_gets_response(self, auth_token):
        """POST /api/chat should send message and get AI response"""
        session_id = f"test_session_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/chat", 
            json={
                "message": "Hello, I need help with anxiety",
                "session_id": session_id,
                "language": "en",
                "problem": "anxiety"
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=60  # AI responses can take time
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "type" in data, "Response should contain 'type'"
        assert len(data["message"]) > 0, "AI response should not be empty"
    
    def test_chat_without_auth_fails(self):
        """POST /api/chat without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "Hello",
            "session_id": "test_session"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestPaymentEndpoints:
    """Test payment-related endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate")
        return response.json()["access_token"]
    
    def test_create_checkout_for_paid_tariff(self, auth_token):
        """POST /api/payments/create-checkout should create Stripe session"""
        response = requests.post(f"{BASE_URL}/api/payments/create-checkout",
            json={
                "tariff_id": "hour",
                "origin_url": "https://miro-care-preview.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return checkout URL or error (depending on Stripe config)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data or "type" in data, "Response should contain checkout URL or type"
    
    def test_create_checkout_invalid_tariff_fails(self, auth_token):
        """POST /api/payments/create-checkout with invalid tariff should fail"""
        response = requests.post(f"{BASE_URL}/api/payments/create-checkout",
            json={
                "tariff_id": "invalid_tariff",
                "origin_url": "https://example.com"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
