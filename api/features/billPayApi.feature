@billpay @api
Feature: Bill Pay API

Background:
  Given a valid account exists

Scenario: Pay Bill
  When user submits bill payment request
  Then response status should be 200

Scenario: Verify Payment Confirmation
  When user submits bill payment request
  Then payment confirmation should be generated
