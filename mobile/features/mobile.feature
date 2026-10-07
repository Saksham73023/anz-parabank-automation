@day9 @mobile
Feature: Mobile view smoke flow

  Background:
    Given Day 9 user opens the ParaBank login page
    Then the current viewport should be 390 by 844
    When Day 9 user logs in with configured credentials
    Then Day 9 account overview should be displayed

  Scenario: Log in and display account overview on mobile
    Then Day 9 account overview should be displayed

  Scenario: Display the account list on mobile
    When Day 9 user opens the account overview
    Then Day 9 account list should be displayed

  Scenario: Transfer funds on mobile
    When Day 9 user transfers the configured amount
    Then Day 9 transfer confirmation should be displayed

  Scenario: Pay a bill on mobile
    When Day 9 user pays a bill
    Then Day 9 bill payment confirmation should be displayed
