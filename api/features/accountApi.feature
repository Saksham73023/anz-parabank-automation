@api
Feature: Account API

  Background:
    Given API client is configured

  Scenario: Retrieve a configured account
    When I retrieve account details for the configured account
    Then the account API response status should be 200
    And the account API response should identify the configured account