Feature: Open a new checking account

  @Accounts @Checking
  Scenario: Verify user can open a new CHECKING account
    Given I am logged in with the existing ParaBank user
    When I open the Open New Account page
    And I select the CHECKING account type
    And I select the first available funding account
    And I submit the new account request
    Then the account opened success message should be displayed
    And a new account ID should be generated
    And the new account ID should be visible in Accounts Overview