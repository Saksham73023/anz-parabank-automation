@soap @api
Feature: REST and SOAP Parity

Scenario: Customer GET is functionally equivalent over REST and SOAP
  Given a valid customer exists
  When customer details are compared over REST and SOAP
  Then REST and SOAP customer responses should be functionally equivalent

Scenario: Account GET is functionally equivalent over REST and SOAP
  Given a valid account exists
  When account details are compared over REST and SOAP
  Then REST and SOAP account responses should be functionally equivalent

Scenario: Transaction GET is functionally equivalent over REST and SOAP
  Given a valid account exists
  When transaction history is compared over REST and SOAP
  Then REST and SOAP transaction responses should be functionally equivalent
