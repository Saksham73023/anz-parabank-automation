@day9 @accessibility
Feature: Accessibility scans

  Scenario: Scan the primary ParaBank workflows
    Given accessibility user opens the ParaBank login page
    When accessibility scan runs on the login page
    And accessibility user logs in
    Then accessibility scan runs on the account overview page
    When accessibility user opens the transfer funds page
    Then accessibility scan runs on the transfer funds page
    And serious and critical accessibility violations should not be present
