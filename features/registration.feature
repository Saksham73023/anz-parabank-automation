@registration
Feature: ParaBank customer registration

  @smoke
  Scenario: Register a new customer with a default account
   Given I am on the ParaBank registration page
   When I register a new ParaBank customer with Faker data
   Then the new customer should be automatically logged in
   And the Accounts Overview page should be displayed
   And at least one default account should be created
   And the account number should be visible
   And the account balance should not be empty or zero

 Scenario: Verify registration with existing username
   Given Existing user already exists
   When User registers with same username
   Then Username already exists error should be displayed

  Scenario: Verify mandatory fields validation
   Given User is on Registration page
   When User submits registration form without entering mandatory data
   Then Required field validation messages should be displayed

  Scenario: Verify password confirmation mismatch
   Given User is on Registration page
   When User enters different password and confirm password
   Then Password mismatch error should be displayed

  Scenario: Verify default account is created after registration
   Given User has registered successfully
   Then Accounts Overview page should display
   And At least one account should exist
   And Account number should be visible
   And Account balance should not be empty

  Scenario: Verify registration with maximum username length
    When User enters username with more than allowed characters
    And User submits registration form
    Then Registration should not be successful
    And Appropriate validation message should be displayed

  Scenario: Verify registration with special characters in username
    When User enters special characters in username field
    And User submits registration form
    Then Registration should not be successful


  Scenario: Verify registration with SQL Injection payload
    When User enters SQL Injection payload in username field
    And User submits registration form
    Then Registration should not be successful
    And Application should handle the request securely

  Scenario: Verify registration with XSS payload
    When User enters XSS payload in registration fields
    And User submits registration form
    Then Script should not execute
    And Registration should not be successful