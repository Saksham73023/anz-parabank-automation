@login
Feature: ParaBank login

  @smoke
  Scenario: Login with valid credentials
    Given I am on the ParaBank login page
    When I log in with the configured ParaBank credentials
    Then I should see the ParaBank account overview

  Scenario: Verify login fails with invalid password
    Given User is on Login page
    When User enters valid username and invalid password
    And User clicks Login button
    Then Error message should be displayed

  Scenario: Verify login fails with invalid username
   Given User is on Login page
   When User enters invalid username and valid password
   And User clicks Login button
   Then Error message should be displayed

  Scenario: Verify login fails with blank credentials
   Given User is on Login page
   When User clicks Login button without entering credentials
   Then Error message should be displayed

  Scenario: Verify user can logout successfully
   Given User is logged into application
   When User clicks Logout
   Then User should be redirected to Login page
