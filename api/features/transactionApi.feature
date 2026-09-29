@transactionApi
Feature: Transaction API Validation

  @api @smoke 
  Scenario: Create transaction with valid data
    Given user has valid account details
    When user creates a transaction through API
    Then transaction should be created successfully

  @api @negative 
  Scenario: Create transaction with invalid account id
    Given user has invalid account id
    When user creates a transaction through API
    Then error response should be returned

  @api @negative 
  Scenario: Create transaction with blank amount
    Given user has valid account details
    When user creates transaction with blank amount
    Then validation error should be returned

  @api @negative 
  Scenario: Create transaction with negative amount
    Given user has valid account details
    When user creates transaction with negative amount
    Then validation error should be returned

  @api @search 
  Scenario: Get transaction by valid transaction id
    Given transaction exists
    When user fetches transaction by transaction id
    Then correct transaction details should be returned

  @api @search 
  Scenario: Get transaction by invalid transaction id
    Given invalid transaction id is provided
    When user fetches transaction details
    Then transaction not found response should be returned

  @api @dateSearch 
  Scenario: Search transactions by valid date
    Given transactions exist for selected date
    When user searches transactions by date
    Then matching transactions should be returned

  @api @dateSearch @negative 
  Scenario: Search transactions by future date
    Given future date is provided
    When user searches transactions by date
    Then empty transaction list should be returned

  @api @dateRange 
  Scenario: Search transactions by valid date range
    Given transactions exist within selected date range
    When user searches transactions using valid date range
    Then matching transactions should be returned

  @api @dateRange @boundary 
  Scenario: Search transactions with same start and end date
    Given transaction exists for selected date
    When user searches using same start and end date
    Then matching transactions should be returned

  @api @dateRange @negative 
  Scenario: Search transactions with invalid date range
    Given start date is greater than end date
    When user searches transactions using invalid date range
    Then validation error should be returned

  @api @amountSearch 
  Scenario: Search transactions by valid amount
    Given transactions exist with specified amount
    When user searches transactions by amount
    Then matching transactions should be returned

  @api @amountSearch @negative 
  Scenario: Search transactions by unavailable amount
    Given no transactions exist for specified amount
    When user searches transactions by amount
    Then empty transaction list should be returned

  @api @seeding 
  Scenario: Create fifty transactions through API
    Given valid account exists
    When user creates fifty transactions through API
    Then all transactions should be created successfully

  @api @reconciliation 
  Scenario: Verify API response matches UI transaction data
    Given transactions are available through API
    When user opens transaction history in UI
    Then API and UI transaction data should match