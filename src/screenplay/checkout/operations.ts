export const SELECT_CHECKOUT_VARIANT_QUERY = `
  query SelectCheckoutVariant($first: Int!, $channel: String!) {
    products(first: $first, channel: $channel) {
      edges {
        node {
          name
          productVariants(first: 10) {
            edges {
              node {
                id
                name
                quantityAvailable
                pricing {
                  price {
                    gross {
                      amount
                      currency
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_CHECKOUT_MUTATION = `
  mutation CreateCheckout($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        token
        quantity
        totalPrice {
          gross {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION = `
  mutation UpdateCheckoutShippingAddress($id: ID!, $address: AddressInput!) {
    checkoutShippingAddressUpdate(
      id: $id
      shippingAddress: $address
      saveAddress: false
    ) {
      checkout {
        id
        shippingAddress {
          country {
            code
          }
          postalCode
        }
        shippingMethods {
          id
          name
          price {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION = `
  mutation UpdateCheckoutBillingAddress($id: ID!, $address: AddressInput!) {
    checkoutBillingAddressUpdate(
      id: $id
      billingAddress: $address
      saveAddress: false
    ) {
      checkout {
        id
        billingAddress {
          country {
            code
          }
          postalCode
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION = `
  mutation UpdateCheckoutDeliveryMethod($id: ID!, $deliveryMethodId: ID!) {
    checkoutDeliveryMethodUpdate(id: $id, deliveryMethodId: $deliveryMethodId) {
      checkout {
        id
        totalPrice {
          gross {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const CREATE_CHECKOUT_TRANSACTION_MUTATION = `
  mutation CreateCheckoutTransaction($id: ID!, $transaction: TransactionCreateInput!) {
    transactionCreate(id: $id, transaction: $transaction) {
      transaction {
        id
        pspReference
        chargedAmount {
          amount
          currency
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const COMPLETE_CHECKOUT_MUTATION = `
  mutation CompleteCheckout($id: ID!) {
    checkoutComplete(id: $id) {
      order {
        id
        number
        status
        paymentStatus
        chargeStatus
        total {
          gross {
            amount
            currency
          }
        }
      }
      confirmationNeeded
      errors {
        field
        message
        code
      }
    }
  }
`;

export const CHECKOUT_OPERATIONS = [
  ['SelectCheckoutVariant', SELECT_CHECKOUT_VARIANT_QUERY],
  ['CreateCheckout', CREATE_CHECKOUT_MUTATION],
  ['UpdateCheckoutShippingAddress', UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION],
  ['UpdateCheckoutBillingAddress', UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION],
  ['UpdateCheckoutDeliveryMethod', UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION],
  ['CreateCheckoutTransaction', CREATE_CHECKOUT_TRANSACTION_MUTATION],
  ['CompleteCheckout', COMPLETE_CHECKOUT_MUTATION],
] as const;
