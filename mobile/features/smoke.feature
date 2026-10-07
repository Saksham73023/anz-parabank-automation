Feature: ParaBank Smoke Suite

@smoke
Scenario: Login with valid user
  Given user is on login page
  When user logs in with valid credentials
  Then accounts overview page should be displayed

@smoke
Scenario: View accounts overview
  Given user is logged in
  When user navigates to accounts overview
  Then account balances should be displayed

@smoke
Scenario: Transfer funds between accounts
  Given user is logged in
  When user transfers funds from one account to another
  Then transfer should complete successfully

@smoke
Scenario: Pay bill successfully
  Given user is logged in
  When user submits bill payment details
  Then bill payment should be successful

@smoke
Scenario: Logout successfully
  Given user is logged in
  When user logs out
  Then login page should be displayed