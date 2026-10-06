@account @api
Feature: Account API

Background:
  Given a valid customer exists

Scenario: Create Account
  Given user is logged into ParaBank
  And a valid account exists
  When user creates a new account
  Then response status should be 200
  And account should be created successfully

Scenario: Get Account Details
  Given user is logged into ParaBank
  And a valid account exists
  When user fetches account details
  Then response status should be 200
  And account information should be returned

Scenario: Verify Balance
  Given user is logged into ParaBank
  And a valid account exists
  When user fetches account details
  Then account balance should be displayed

Scenario: Get Customer Accounts
  Given user is logged into ParaBank
  When user fetches customer's accounts
  Then response status should be 200
  And customer accounts should be returned with valid details
