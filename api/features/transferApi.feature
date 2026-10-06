@transfer @api
Feature: Transfer API

Background:
  Given source account exists
  And destination account exists

Scenario: Transfer Funds
  When user transfers amount between accounts
  Then response status should be 200

Scenario: Verify Source Account Balance
  When transfer is completed
  Then source account balance should decrease

Scenario: Verify Destination Account Balance
  When transfer is completed
  Then destination account balance should increase
