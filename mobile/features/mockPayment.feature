@day9 @mockpayment
Feature: Mocked NPP and PayID payments

  Scenario Outline: Display the mocked payment outcome
    Given NPP mock payment is configured to return "<outcome>"
    When user submits a PayID payment
    Then PayID payment UI displays the "<outcome>" outcome

    Examples:
      | outcome |
      | SETTLED |
      | FAILED  |
      | TIMEOUT |
