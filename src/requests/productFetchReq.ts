

import axios from 'axios';

// Define the product type for better type safety
export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
}

// Recursive function to fetch all products using pagination
export async function fetchAllProducts(
  shop: string,
  accessToken: string,
  cursor: string | null = null,
  products: ShopifyProduct[] = []
): Promise<ShopifyProduct[]> {
  const graphqlQuery = `
    query getProducts($cursor: String) {
      products(first: 100, after: $cursor) {
        edges {
          node {
            id
            title
            description
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2024-07/graphql.json`,
      {
        query: graphqlQuery,
        variables: { cursor },
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const { edges, pageInfo } =
      response.data.data.products;
    products.push(
      ...edges.map(
        (edge: { node: ShopifyProduct }) =>
          edge.node
      )
    );

    if (pageInfo.hasNextPage) {
      // Recursively fetch the next page
      return fetchAllProducts(
        shop,
        accessToken,
        pageInfo.endCursor,
        products
      );
    }

    return products;
  } catch (error) {
    console.error(
      'Error fetching products:',
      error
    );
    throw new Error(
      'Failed to fetch all products.'
    );
  }
}
