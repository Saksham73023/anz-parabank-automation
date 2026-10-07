@billpay @api
Feature: Bill Pay API

# ParaBank exposes bill payment as an action, not a CRUD-managed payment resource.
Background:
  Given a valid account exists

Scenario: Pay Bill and Verify Confirmation
  When user submits bill payment request
  Then response status should be 200
  Then payment confirmation should be generated
