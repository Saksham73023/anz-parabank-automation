Feature: Accounts & Balances

  Background:
    Given user is logged into Parabank

  @Accounts
  Scenario: Verify user can open a new Checking Account
    When user opens a new "CHECKING" account
    Then a new account should be created successfully
    And new account ID should be displayed
    And account should appear in Accounts Overview

  @Accounts
  Scenario: Verify user can open a new Savings Account
    When user opens a new "SAVINGS" account
    Then a new account should be created successfully
    And account should appear in Accounts Overview

  @Accounts
  Scenario: Verify new account ID is generated
    When user creates a new account
    Then generated account ID should not be empty

  @Accounts
  Scenario: Verify newly created account appears in Accounts Overview
    When user creates a new account
    And user navigates to Accounts Overview
    Then newly created account should be visible

  @Accounts
  Scenario: Verify source account balance is updated
    Given user captures source account balance
    When user opens a new account
    Then source account balance should be updated

  @Accounts
  Scenario:  Verify user can create multiple accounts
    When user creates 5 accounts sequentially
    Then all created accounts should be displayed

  @Accounts
  Scenario:  Verify total balance equals sum of all account balances
    When user navigates to Accounts Overview
    Then total balance should match sum of all individual balances

  @Accounts
  Scenario: Verify account details page
    When user clicks an account number
    Then Account Details page should be displayed
    And correct account number should be shown

  @Accounts
  Scenario: Verify default account remains available
    When user creates multiple accounts
    Then default account should still be available

  @Accounts
  Scenario:  Verify newly created account has valid balance
    When user opens account details
    Then account balance should be displayed
    And balance should be greater than or equal to zero

  @Negative
  Scenario: Verify invalid account type is not allowed
    When user attempts to create an account with invalid account type
    Then account creation should be prevented

  @Negative
  Scenario:  Verify account creation page requires authentication
    When user accesses Open Account page without login
    Then user should be redirected to Login page

  @Negative
  Scenario: Verify logged out user cannot create account
    Given user logs out from application
    When user accesses Open Account page
    Then user should be redirected to Login page

  @API
  Scenario:  Verify UI balance matches API balance
    When user fetches account balance from UI
    And user fetches account balance from API
    Then both balances should match

  @API
  Scenario: Verify UI account count matches API account count
    When user fetches account count from UI
    And user fetches account count from API
    Then both account counts should match