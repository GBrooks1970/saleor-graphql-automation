@api
Feature: Authentication & Authorisation Lifecycle (FR-3)

  As a registered customer or administrator
  I want to authenticate via tokenCreate and refresh tokens via tokenRefresh
  So that I can securely interact with protected GraphQL operations

  Scenario: Customer logs in with valid credentials and obtains JWT
    Given a customer with credentials "customer@example.com" and "validPass123"
    When they authenticate with their credentials
    Then a valid JWT token should be returned
    And a refresh token should be present
    And the user profile email should be "customer@example.com"

  Scenario: Authenticated customer queries personal profile
    Given a customer authenticated with "customer@example.com" and "validPass123"
    When they query their current user profile
    Then the authenticated user email should be "customer@example.com"

  Scenario: Customer login fails with invalid credentials returning typed error
    Given a customer with credentials "customer@example.com" and "wrongPassword!"
    When they authenticate with their credentials
    Then the authentication should fail with error code "INVALID_CREDENTIALS"

  Scenario: Customer rotates session using refresh token
    Given a customer authenticated with "customer@example.com" and "validPass123"
    When they refresh their token using their refresh token
    Then a refreshed JWT token should be issued
