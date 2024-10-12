import shopify from '@shopify/shopify-api'; 

export const createProductWebhook = async (session) => {
  const client = new shopify.clients.Graphql({ session });

  const data = await client.query({
    data: {
      query: `
      mutation {
        webhookSubscriptionCreate(
          topic: PRODUCTS_CREATE,
          webhookSubscription: {
            callbackUrl: "https://your-server.com/webhook/products/create",
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
        topic: "PRODUCTS_CREATE",
        webhookSubscription: {
          callbackUrl: "https://your-server.com/webhook/products/create",
          format: "JSON",
        },
      },
    },
  });

  return data;
};

