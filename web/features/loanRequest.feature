@loan
Feature: ParaBank Lending Journey
  Validate loan decisions, funding boundaries, account creation, and ledger behavior.

  Background:
    Given I am logged in with the existing ParaBank user
    And user is on the loan request page

  @smoke @approval @loan
  Scenario: Verify loan approval with valid amount and down payment
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should be approved with a new account
    And loan account should be visible in Accounts Overview

  @approval @accountOverview @loan
  Scenario: Verify newly created loan account details
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should be approved with a new account
    And loan account balance should match approved amount

  @negative @funding @loan
  Scenario: Deny a down payment above available funds
    When user applies for a loan with a down payment above available funds
    Then loan request should be denied

  @boundary @validation @loan
  Scenario: Reject loan request with zero loan amount
    When user applies for a loan of "0" with down payment "0"
    Then loan request should be rejected by validation

  @boundary @validation @loan
  Scenario: Reject loan request with negative loan amount
    When user applies for a loan of "-1" with down payment "1"
    Then loan request should be rejected by validation

  @boundary @validation @loan
  Scenario: Reject loan request with blank loan amount
    When user applies for a loan of "" with down payment "1"
    Then loan request should be rejected by validation

  @boundary @validation @loan
  Scenario: Reject loan request with non-numeric loan amount
    When user applies for a loan of "not-a-number" with down payment "1"
    Then loan request should be rejected by validation

  @boundary @validation @loan
  Scenario: Reject loan request when down payment equals loan amount
    When user applies for a loan of "100.00" with down payment "100.00"
    Then loan request should be rejected by validation

  @datadriven @approvalMatrix @loan
  Scenario: Verify approval matrix combination 1
    When user applies for the loan using matrix amount "100", down payment "5", and balance "10"
    Then loan decision should be "Approved"

  @datadriven @approvalMatrix @loan
  Scenario: Verify approval matrix combination 2
    When user applies for the loan using matrix amount "100", down payment "10", and balance "10"
    Then loan decision should be "Approved"

  @datadriven @approvalMatrix @loan
  Scenario: Verify approval matrix combination 3
    When user applies for the loan using matrix amount "100", down payment "11", and balance "10"
    Then loan decision should be "Denied"

  @datadriven @approvalMatrix @loan
  Scenario: Verify approval matrix combination 4
    When user applies for the loan using matrix amount "250", down payment "50", and balance "50"
    Then loan decision should be "Approved"

  @datadriven @approvalMatrix @loan
  Scenario: Verify approval matrix combination 5
    When user applies for the loan using matrix amount "500", down payment "101", and balance "100"
    Then loan decision should be "Denied"

  @postApproval @transfer @loan
  Scenario: Transfer funds out of the newly approved loan account
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should be approved with a new account
    When user transfers funds from the approved loan account
    Then transfer should be completed successfully

  @e2e @ledger @loan
  Scenario: Register, fund savings, borrow, pay a bill, and reconcile ledgers
    When user completes the lending journey for a new customer
    Then the new customer lending journey should reconcile every account ledger