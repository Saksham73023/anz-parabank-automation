@accessibility
Feature: ParaBank web accessibility
  As a ParaBank customer
  I want key pages checked for WCAG accessibility issues
  So that accessibility defects are reported before release

  Scenario: Scan the Login page
    Given User is on Login page
    When I scan the current page for accessibility as "Login Page"
    Then an accessibility report for "Login Page" should be generated
    And accessibility violations should be reported for analysis

  Scenario: Scan the Accounts Overview page
    Given I am logged in to ParaBank
    When I scan the current page for accessibility as "Accounts Overview"
    Then an accessibility report for "Accounts Overview" should be generated
    And accessibility violations should be reported for analysis

  Scenario: Scan the Transfer Funds page
    Given I am logged in to ParaBank
    When I open the Transfer Funds page
    And I scan the current page for accessibility as "Transfer Funds"
    Then an accessibility report for "Transfer Funds" should be generated
    And accessibility violations should be reported for analysis
