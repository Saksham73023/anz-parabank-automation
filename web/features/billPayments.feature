@billpayment
Feature: ParaBank Bill Payment

  Background:
    Given user is logged into ParaBank
    And user navigates to Bill Payment page

  #Valid Bill Payment
  @smoke @critical
  Scenario: Successful bill payment with valid details
    When user submits bill payment with "valid" data
    Then payment should be successful

 #Mandatory Fields (9 Variants)
  @validation @mandatory
  Scenario: Verify Payee Name is mandatory
    When user submits bill payment with "Payee Name" blank
    Then validation message should be displayed for "Payee Name"

  @validation @mandatory
  Scenario: Verify Address is mandatory
    When user submits bill payment with "Address" blank
    Then validation message should be displayed for "Address"

  @validation @mandatory
  Scenario: Verify City is mandatory
    When user submits bill payment with "City" blank
    Then validation message should be displayed for "City"

  @validation @mandatory
  Scenario: Verify State is mandatory
    When user submits bill payment with "State" blank
    Then validation message should be displayed for "State"

  @validation @mandatory
  Scenario: Verify Zip Code is mandatory
    When user submits bill payment with "Zip Code" blank
    Then validation message should be displayed for "Zip Code"

  @validation @mandatory
  Scenario: Verify Phone Number is mandatory
    When user submits bill payment with "Phone Number" blank
    Then validation message should be displayed for "Phone Number"

  @validation @mandatory
  Scenario: Verify Account Number is mandatory
    When user submits bill payment with "Account Number" blank
    Then validation message should be displayed for "Account Number"

  @validation @mandatory
  Scenario: Verify Verify Account is mandatory
    When user submits bill payment with "Verify Account" blank
    Then validation message should be displayed for "Verify Account"

  @validation @mandatory
  Scenario: Verify Amount is mandatory
    When user submits bill payment with "Amount" blank
    Then validation message should be displayed for "Amount"

  #Account Mismatch
  @accountValidation
  Scenario: Verify account number mismatch validation
    When user submits bill payment with mismatched account numbers
    Then account mismatch validation should be displayed

 #Amount Boundary Checks
  @boundary @amountValidation
  Scenario: Verify payment with minimum valid amount
    When user submits bill payment with amount "0.01"
    Then payment should be successful

  @boundary @amountValidation
  Scenario: Verify payment with zero amount
    When user submits bill payment with amount "0"
    Then payment should be successful

  @boundary @amountValidation 
  Scenario: Verify payment with blank amount
    When user submits bill payment with blank amount
    Then Then amount cannot be empty message should be displayed

  @boundary @amountValidation
  Scenario: Verify payment with negative amount
    When user submits bill payment with amount "-100"
    Then payment should be successful

  @boundary @amountValidation
  Scenario: Verify payment with amount exceeding balance
    When user submits bill payment with amount exceeding balance
    Then payment should be successful

 #Same Biller Twice
  @repeatPayment
  Scenario: Verify same biller can be paid twice in same session
    When user pays the same biller twice
    Then both bill payments should be confirmed
  
  #Batch Payments
  @datadriven @batchPayment
  Scenario: Verify batch bill payment using TypeScript data
    When user performs bill payments using TypeScript data
    Then all bill payments should be successful
    And confirmed payment total should match batch total