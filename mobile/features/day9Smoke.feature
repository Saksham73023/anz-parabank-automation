@day9
Feature: Day 9 smoke flows

  @crossbrowser
  Scenario: Smoke flow on Chromium or Firefox
    Given Day 9 user opens the ParaBank login page
    When Day 9 user logs in with configured credentials
    Then Day 9 account overview should be displayed
    When Day 9 user opens the account overview
    Then Day 9 account list should be displayed
    When Day 9 user transfers the configured amount
    Then Day 9 transfer confirmation should be displayed
    When Day 9 user pays a bill
    Then Day 9 bill payment confirmation should be displayed
    When Day 9 user logs out
    Then Day 9 login form should be displayed

  @mobile
  Scenario: Smoke flow in iPhone 12 viewport emulation
    Given Day 9 user opens the ParaBank login page
    Then the current viewport should be 390 by 844
    When Day 9 user logs in with configured credentials
    Then Day 9 account overview should be displayed
    When Day 9 user opens the account overview
    Then Day 9 account list should be displayed
    When Day 9 user transfers the configured amount
    Then Day 9 transfer confirmation should be displayed
    When Day 9 user pays a bill
    Then Day 9 bill payment confirmation should be displayed
    When Day 9 user logs out
    Then Day 9 login form should be displayed
