@login  @smokeSuite
Feature: ParaBank login

  @smoke @positive @loginValid
  Scenario: Login with valid credentials
    Given I am on the ParaBank login page
    When I log in with the configured ParaBank credentials
    Then I should see the ParaBank account overview
    
   @smoke @negative @invalidPassword
  Scenario: Verify login fails with invalid password
    Given User is on Login page
    When User enters valid username and invalid password
    And User clicks Login button
    Then Invalid login error should be displayed

   @smoke @negative @invalidUsername
  Scenario: Verify login fails with invalid username
   Given User is on Login page
   When User enters invalid username and valid password
   And User clicks Login button
   Then Invalid login error should be displayed

  @smoke @negative @invalidBoth
  Scenario: Verify login fails with invalid username and password
    Given User is on Login page
    When User enters invalid username and invalid password
    And User clicks Login button
    Then Invalid login error should be displayed

   @smoke @negative @blankCredentials
  Scenario: Verify login fails with blank credentials
   Given User is on Login page
   When User clicks Login button without entering credentials
  Then Login should remain unauthenticated

   @smoke @positive @logout
  Scenario: Verify user can logout successfully
   Given User is logged into application
   When User clicks Logout
   Then User should be redirected to Login page
  And protected account pages should require login
