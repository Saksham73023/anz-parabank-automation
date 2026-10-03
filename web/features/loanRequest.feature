@loan
Feature: ParaBank Lending Journey
  Validate loan decisions, funding boundaries, account creation, and ledger behavior.

  Background:
    Given I am logged in with the existing ParaBank user
    And user is on the loan request page

  @smoke @approval @loan
  Scenario: Verify the loan decision with a valid amount and down payment
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should return a final decision
    And loan account should be visible in Accounts Overview

  @approval @accountOverview @loan
  Scenario: Verify loan account details when the request is approved
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should return a final decision
    And loan account balance should match approved amount

  @negative @funding @loan
  Scenario: Show the lender decision for a down payment above available funds
    When user applies for a loan with a down payment above available funds
    Then loan request should show a final decision

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
  Scenario: Show the lender decision when down payment equals loan amount
    When user applies for a loan of "100.00" with down payment "100.00"
    Then loan request should show a final decision

  @datadriven @approvalMatrix @loan
  Scenario: Verify loan decision matrix combination 1
    When user applies for the loan using matrix amount "100", down payment "5", and balance "10"
    Then loan request should return a final decision

  @datadriven @approvalMatrix @loan
  Scenario: Verify loan decision matrix combination 2
    When user applies for the loan using matrix amount "100", down payment "10", and balance "10"
    Then loan request should return a final decision

  @datadriven @approvalMatrix @loan
  Scenario: Verify loan decision matrix combination 3
    When user applies for the loan using matrix amount "100", down payment "11", and balance "10"
    Then loan request should show a final decision

  @datadriven @approvalMatrix @loan
  Scenario: Verify loan decision matrix combination 4
    When user applies for the loan using matrix amount "250", down payment "50", and balance "50"
    Then loan request should return a final decision

  @datadriven @approvalMatrix @loan
  Scenario: Verify loan decision matrix combination 5
    When user applies for the loan using matrix amount "500", down payment "101", and balance "100"
    Then loan request should show a final decision

  @postApproval @transfer @loan
  Scenario: Transfer funds when the loan request is approved
    When user applies for a loan of "100.00" with down payment "10.00"
    Then loan request should return a final decision
    When user transfers funds from the approved loan account
    Then transfer should be completed successfully

  @e2e @ledger @loan
  Scenario: Fund savings, borrow, pay a bill, and reconcile ledgers
    When user completes the lending journey
    Then the new customer lending journey should reconcile every account ledger