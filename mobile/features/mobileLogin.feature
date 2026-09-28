@mobile
Feature: Mobile login

  Scenario: Log in to ParaBank using Pixel 7 emulation
    Given mobile user opens the ParaBank login page
    When mobile user logs in with configured credentials
    Then the mobile account overview should be displayed