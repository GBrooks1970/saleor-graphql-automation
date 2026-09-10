@api @mutating
Feature: Stateful checkout lifecycle (FR-2)

  As a customer purchasing from the storefront
  I want checkout state to flow through address, delivery and transaction operations
  So that completing the checkout produces a fully charged order

  Scenario: Customer completes a checkout through the Transaction Flow API
    Given an administrator can record checkout transactions
    When the customer selects an available product variant in channel "default-channel"
    And creates a checkout containing 1 item
    And attaches valid shipping and billing addresses
    And selects the first available delivery method
    And the administrator records the checkout total as charged
    And the customer completes the checkout
    Then a confirmed order should be created
    And the order should be fully charged
