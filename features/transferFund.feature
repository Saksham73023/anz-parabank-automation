@fundTransfer
Feature: Fund Transfer - Pay Anyone / Transfer Funds

  Background:
    Given user is logged into ParaBank
    
  # Positive Scenarios
  @smoke @positive
  Scenario: Transfer money between two own accounts
     When user transfers 100 from source account to destination account
     Then transfer should be successful
     And source account balance should decrease by 100
     And destination account balance should increase by 100

  @positive
  Scenario: Transfer full available balance
     When user transfers complete available balance
     Then transfer should be successful
     And source account balance should become zero

  @positive
  Scenario: Transfer minimum valid amount
     When user transfers 1 amount
     Then transfer should be successful

  @positive
  Scenario: Transfer amount with two decimal places
     When user transfers 100.50 amount
     Then transfer should be successful

  @positive
  Scenario: Transfer large amount within available balance
     When user transfers a large valid amount
     Then transfer should be successful

  @positive
  Scenario: Verify success confirmation message
     When user performs a valid transfer
     Then success confirmation message should be displayed

  @positive
  Scenario: Verify transaction id is generated
     When user performs a valid transfer
     Then transaction details should be displayed

  @positive
  Scenario: Verify source account debit transaction entry
     When user performs a valid transfer
     Then source account should contain a debit entry

  @positive
  Scenario: Verify destination account credit transaction entry
     When user performs a valid transfer
     Then destination account should contain a credit entry

  @positive
  Scenario: Verify updated balances after transfer
     When user performs a valid transfer
     Then balances should be updated correctly

  # Negative Scenarios
  @negative
  Scenario: Transfer amount greater than available balance
     When user transfers amount greater than available balance
     Then transfer should not be successful

  @negative
  Scenario: Transfer zero amount
     When user enters transfer amount as 0
     Then transfer should not be successful

  @negative
  Scenario: Transfer negative amount
     When user enters transfer amount as -100
     Then transfer should not be successful

  @negative
  Scenario: Transfer non numeric amount
     When user enters transfer amount as abc
     Then transfer should not be successful

  @negative
  Scenario: Transfer special characters as amount
     When user enters transfer amount as @@@
     Then transfer should not be successful

  @negative
  Scenario: Transfer amount with more than two decimal places
     When user enters transfer amount as 100.999
     Then transfer should not be successful

  @negative
  Scenario: Transfer from same account to same account
     When user selects same source and destination account
     Then transfer should not be successful

  # Boundary Scenarios
  @boundary
  Scenario: Transfer exact available balance
     When user transfers exact available balance
     Then transfer should be successful
     And source account balance should become zero

  @boundary
  Scenario: Verify account balance after multiple transfers
     When user performs multiple valid transfers
     Then final balance should be calculated correctly

  # Flagship E2E Scenario (Assessment Main Deliverable)
  @regression @e2e
  Scenario: Customer performs multiple fund transfers in a day
     Given user captures source account opening balance
     When user performs fund transfers with following amounts
     Then all transfers should be successful
     And final balance should equal opening balance minus total transferred amount
     And source account should contain 10 debit entries
     And destination account should contain 10 credit entries
     And total ledger entries should be 20