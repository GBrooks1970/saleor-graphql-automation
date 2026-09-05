@api
Feature: Catalogue Browsing & Querying (FR-1)

  As an anonymous customer or guest
  I want to browse the catalogue, query shop information, and paginate product listings
  So that I can discover items available for purchase without modifying store state

  @smoke
  Scenario: Anonymous guest queries shop information
    Given the guest actor is browsing the storefront
    When they query the shop information
    Then the shop name should be "Saleor e-commerce"

  @smoke
  Scenario: Anonymous guest queries product list in default channel
    Given the guest actor is browsing the storefront
    When they browse the catalogue in channel "default-channel"
    Then at least 1 product should be available in the catalogue
    And all returned products should have valid pricing

  @smoke
  Scenario: Anonymous guest queries paginated product results
    Given the guest actor is browsing the storefront
    When they query the first 2 products in channel "default-channel"
    Then exactly 2 products should be returned
    And page info should indicate whether more products exist
