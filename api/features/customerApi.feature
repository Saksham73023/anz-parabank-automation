@customer @api
Feature: Customer API

Background:
  Given a valid customer exists

Scenario: Get Customer Details
  When user fetches customer details
  Then response status should be 200
  And customer information should be returned

Scenario: Verify Customer Response
  When user fetches customer details
  Then customer id should exist
  And customer name should exist
