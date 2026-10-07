Feature: Simulated NPP PayID

@payid
Scenario: PayID transaction settled
  Given user is logged in
  And PayID mock returns SETTLED
  When user submits PayID payment
  Then payment status should be SETTLED

@payid
Scenario: PayID transaction failed
  Given user is logged in
  And PayID mock returns FAILED
  When user submits PayID payment
  Then payment status should be FAILED

@payid
Scenario: PayID transaction timeout
  Given user is logged in
  And PayID mock returns TIMEOUT
  When user submits PayID payment
  Then payment status should be TIMEOUT