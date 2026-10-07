@e2e @api
Feature: E2E API Flow

# This API flow starts with an existing customer because customer creation is not exposed by ParaBank's service API.
Scenario: Create Account -> Seed Transaction -> Transfer -> BillPay -> Reconcile
  Given a valid customer exists
  And a valid account exists
  When user creates a new account
  And user seeds account transactions
  And user completes a transfer between accounts
  And user pays a bill
  Then all api responses should be successful
  And account balances and transaction history should reconcile
