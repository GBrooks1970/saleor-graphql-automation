@api @mutating
Feature: Staff order fulfilment lifecycle (FR-5)

  As a warehouse or operations staff member
  I want to locate placed customer orders and allocate inventory
  So that customer orders transition from unfulfilled to fulfilled

  Background:
    Given an administrator can record checkout transactions
    And a staff member is authenticated to manage orders

  Scenario: Staff member fulfills an unfulfilled customer order
    When the customer selects an available product variant in channel "default-channel"
    And creates a checkout containing 1 item
    And attaches valid shipping and billing addresses
    And selects the first available delivery method
    And the administrator records the checkout total as charged
    And the customer completes the checkout
    And the staff member locates the placed order
    Then the order status should be "UNFULFILLED"
    And the order should have 1 unfulfilled line
    When the staff member fulfills all order lines from available warehouse stock
    Then the order status should be "FULFILLED"
    And the order should record 1 successful fulfillment
    And all order lines should be marked as fulfilled
