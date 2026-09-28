@api
Feature: Transfer API

  Background:
    Given API client is configured

  Scenario: Submit a configured transfer
    When I submit the configured account transfer
    Then the transfer API response status should be 200