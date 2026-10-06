@schema @api
Feature: Schema Validation

Scenario: Customer Schema Validation
  Given a valid customer exists
  When user fetches customer details
  Then customer response schema should be valid

Scenario: Account Schema Validation
  Given a valid account exists
  When user fetches account details
  Then account response schema should be valid

Scenario: Transaction Schema Validation
  Given a valid account exists
  When user fetches transaction details
  Then transaction response schema should be valid
