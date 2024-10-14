import shopify from '@shopify/shopify-api'; 
import { Session } from '@shopify/shopify-api';
import { GraphqlClient } from '@shopify/shopify-api';

export const createProductWebhook = async (session: Session) => {
  const client = new GraphqlClient({ session });

  const data = await client.query({
    data: {
      query: `
      mutation {
        webhookSubscriptionCreate(
          topic: PRODUCTS_CREATE,
          webhookSubscription: {
            callbackUrl: "http://localhost:3000/webhook/products/create",
            format: JSON
          }
        ) {
          userErrors {
            field
            message
          }
          webhookSubscription {
          }
        }
      }
      
      `,
      variables: {
        topic: 'PRODUCTS_CREATE',
        webhookSubscription: {
          callbackUrl:
            'http://localhost:3000/webhook/products/create',
          format: 'JSON',
        },
      },
    },
  });

  return data;
};

