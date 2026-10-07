@customer @api
Feature: Customer API

# Customer creation is not exposed by the ParaBank REST/SOAP service API.
# Customer registration is a separate web flow, so this feature covers supported customer reads only.
Background:
  Given a valid customer exists

Scenario: Get Customer Details
  When user fetches customer details
  Then response status should be 200
  And customer information should be returned
