@negative @api
Feature: Negative API Validation

Scenario: Invalid Customer ID
  Given an invalid customer id
  When user fetches customer details
  Then response status should be 400

Scenario: Invalid Account ID
  Given an invalid account id
  When user fetches account details
  Then response status should be 400

Scenario: Missing Mandatory Fields
  Given an incomplete payload
  When user creates an account
  Then response status should be 400

Scenario: Empty Payload
  Given an empty payload
  When user sends a request
  Then response status should be 400

Scenario: Invalid Transfer Amount
  Given transfer amount is invalid
  When user attempts an invalid transfer
  Then response status should be 400

Scenario: Invalid Content Type
  Given content type is invalid
  When user sends request
  Then response status should be 415
