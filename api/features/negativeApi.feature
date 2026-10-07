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

Scenario: Malformed JSON Payload Returns Server Error
  When user sends a malformed JSON payload
  Then response status should be 500

Scenario: Missing Required Parameters
  When user creates an account without required parameters
  Then response status should be 400

Scenario: Invalid Transfer Amount
  Given transfer amount is invalid
  When user attempts an invalid transfer
  Then response status should be 400

Scenario: Wrong Content Type
  When user sends a request with the wrong content type
  Then response status should be 415
