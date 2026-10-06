@e2e @api
Feature: E2E API Flow

Scenario: Create Account -> Seed Transaction -> Transfer Funds -> Pay Bill -> Verify Final Balance
  Given a valid customer exists
  And a valid account exists
  When user creates a new account
  And user seeds account transactions
  And user completes a transfer between accounts
  And user pays a bill
  Then all api responses should be successful
  And final account balance should be correct
