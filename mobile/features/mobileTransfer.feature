@mobile
Feature: Mobile transfer

  Scenario: Transfer funds using iPhone 12 emulation
    Given mobile user opens the ParaBank login page
    When mobile user logs in with configured credentials
    And mobile user transfers the configured amount between accounts
    Then mobile transfer confirmation should be displayed