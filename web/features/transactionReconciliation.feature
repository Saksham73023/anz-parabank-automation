 @transactionSearch @regression
Feature: Transaction Search and Statement Reconciliation

  Background:
    Given user is logged into ParaBank application
    And user navigates to Find Transactions page


  # =====================================================
  # TRANSACTION ID SEARCH
  # =====================================================

  @smoke @transactionId
  Scenario: Search transaction using valid transaction ID
    When user searches transaction by ID "VALID_TRANSACTION"
    Then matching transaction details should be displayed

  @transactionId
  Scenario: Search transaction using latest transaction ID
    When user searches transaction by ID "LATEST_TRANSACTION"
    Then matching transaction details should be displayed

  @transactionId
  Scenario: Search transaction using oldest transaction ID
    When user searches transaction by ID "OLDEST_TRANSACTION"
    Then matching transaction details should be displayed

  @transactionId
  Scenario: Search transaction using non-existing transaction ID
    When user searches transaction by ID "99999999"
    Then no transaction should be displayed

  @validations
  Scenario: Search transaction using blank transaction ID
    When user searches transaction by ID ""
    Then transaction ID validation message should be displayed

  @validations
  Scenario: Search transaction using invalid transaction ID format
    When user searches transaction by ID "ABC123"
    Then transaction search should fail gracefully

  @validations
  Scenario: Search transaction ID containing special characters
    When user searches transaction by ID "@#$%"
    Then validation message should be displayed

  @validations
  Scenario: Search transaction ID containing alphabet characters
    When user searches transaction by ID "TEST"
    Then validation message should be displayed



  # =====================================================
  # DATE SEARCH
  # =====================================================

  @smoke @dateSearch
  Scenario: Search transaction using valid date
    When user searches transaction by date "TODAY"
    Then matching transaction details should be displayed

  @dateSearch
  Scenario: Search transaction using today's date
    When user searches transaction by current date
    Then matching transaction details should be displayed

  @dateSearch
  Scenario: Search transaction using past date
    When user searches transaction by date "YESTERDAY"
    Then system should process the request correctly

  @dateSearch
  Scenario: Search transaction with no matching records
    When user searches transaction by date "01-01-1990"
    Then no transaction should be displayed

  @validation
  Scenario: Search transaction using blank date
    When user searches transaction by date ""
    Then date validation message should be displayed

  @validation
  Scenario: Search transaction using invalid date format
    When user searches transaction by date "abcd"
    Then date validation message should be displayed

  @validation
  Scenario: Search transaction using future date
    When user searches transaction by future date
    Then no transaction should be displayed

  @dateSearch
  Scenario: Search transaction using leap year date
    When user searches transaction by date "02-29-2024"
    Then system should process the request correctly



  # =====================================================
  # DATE RANGE SEARCH
  # =====================================================

  @smoke @dateRange
  Scenario: Search transaction using valid date range
    When user searches transaction between "CURRENT_YEAR_START" and "TODAY"
    Then matching transaction details should be displayed

  @dateRange
  Scenario: Search transaction with same start and end date
    When user searches transaction between "TODAY" and "TODAY"
    Then matching transaction details should be displayed

  @validation
  Scenario: Search transaction where end date is before start date
    When user searches transaction between "01-31-2025" and "01-01-2025"
    Then transaction search should fail gracefully

  @validation
  Scenario: Search transaction using future date range
    When user searches transaction between future dates
    Then no transaction should be displayed

  @validation
  Scenario: Search transaction using invalid start date
    When user searches transaction between "INVALID_DATE" and "01-31-2025"
    Then date validation message should be displayed

  @validation
  Scenario: Search transaction using invalid end date
    When user searches transaction between "01-01-2025" and "INVALID_DATE"
    Then date validation message should be displayed

  @dateRange
  Scenario: Search transaction covering one month range
    When user searches transaction between "CURRENT_MONTH_START" and "TODAY"
    Then matching transaction details should be displayed

  @dateRange
  Scenario: Search transaction covering one year range
    When user searches transaction between "CURRENT_YEAR_START" and "TODAY"
    Then matching transaction details should be displayed



  # =====================================================
  # AMOUNT SEARCH
  # =====================================================

  @smoke @amountSearch
  Scenario: Search transaction using valid amount
    When user searches transaction by amount "100"
    Then matching transaction details should be displayed

  @amountSearch
  Scenario: Search transaction using decimal amount
    When user records a transaction and searches amount "0.01"
    Then matching transaction details should be displayed

  @amountSearch
  Scenario: Search transaction using amount with multiple matching transactions
    When user records multiple transactions and searches amount "0.01"
    Then all matching transactions should be displayed

  @amountSearch
  Scenario: Search transaction using non-existing amount
    When user searches transaction by amount "999999"
    Then no transaction should be displayed

  @validation
  Scenario: Search transaction using blank amount
    When user searches transaction by amount ""
    Then amount validation message should be displayed

  @validation 
  Scenario: Search transaction using negative amount
    When user searches transaction by amount "-50"
    Then transaction search should fail gracefully

  @validation
  Scenario: Search transaction using special characters in amount
    When user searches transaction by amount "@#$"
    Then amount validation message should be displayed

  @amountSearch
  Scenario: Search transaction using very large amount
    When user searches transaction by amount "999999999"
    Then search result should be processed correctly




  