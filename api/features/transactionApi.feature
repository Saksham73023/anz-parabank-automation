@transaction @api
Feature: Transaction API

# Transactions are read from account history and created by supported banking actions such as deposit.
Scenario: Get Account Transactions
  Given a valid account exists
  When user fetches transaction details
  Then response status should be 200
  And transaction history should be returned
