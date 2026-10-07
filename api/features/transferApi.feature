@transfer @api
Feature: Transfer API

# ParaBank exposes transfer as an action endpoint, not a CRUD-managed transfer resource.
Background:
  Given source account exists
  And destination account exists

Scenario: Transfer Funds and Verify Both Balances
  When user transfers amount between accounts
  Then response status should be 200
  And source account balance should decrease
  And destination account balance should increase
