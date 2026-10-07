Feature: Accessibility Scanning

@accessibility
Scenario: Accessibility scan on Login Page
  Given user is on login page
  When axe accessibility scan is executed
  Then accessibility report should be generated

@accessibility
Scenario: Accessibility scan on Accounts Overview
  Given user is logged in
  When user opens accounts overview
  And axe accessibility scan is executed
  Then accessibility report should be generated

@accessibility
Scenario: Accessibility scan on Transfer Funds Page
  Given user is logged in
  When user navigates to transfer funds page
  And axe accessibility scan is executed
  Then accessibility report should be generated