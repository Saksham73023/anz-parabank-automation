@api @payid
Feature: PayID API payment simulation
  ParaBank does not provide PayID, so these API scenarios validate payment handling
  against deterministic responses from a local mock API server.

  Scenario: Payment Settled
    Given the PayID API mock is configured to return "SETTLED"
    When the client submits a PayID payment request
    Then the PayID API response should show a successful payment

  Scenario: Payment Failed
    Given the PayID API mock is configured to return "FAILED"
    When the client submits a PayID payment request
    Then the PayID API response should show a failed payment

  Scenario: Payment Timeout
    Given the PayID API mock is configured to return "TIMEOUT"
    When the client submits a PayID payment request
    Then the PayID API response should show a timed-out payment
