@api @apiFrameworkSample
Feature: Reusable API framework

  Scenario: Retrieve and validate a configured account
    Given API client is configured
    When I request the configured account using a path parameter
    Then the API framework response status should be 200
    And the API framework response should match schema "account.schema.json"