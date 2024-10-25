import axios from 'axios';

// Define the product type for better type safety
export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  images: string;
  price: string;
}

// Recursive function to fetch all products using pagination
export async function fetchAllProducts(
  shop: string,
  accessToken: string,
  cursor: string | null = null,
  products: ShopifyProduct[] = []
): Promise<ShopifyProduct[]> {
  console.log(
    'Product Fetch Request: shop, accessToken, cursor, products',
    shop,
    accessToken,
    cursor,
    products
  );
  const graphqlQuery = `
    query getProducts($cursor: String) {
      products(first: 100, after: $cursor) {
        edges {
          node {
            id
            title
            description
            images(first: 1) {
              edges {
                node {
                  src
                  }
                }
              }
            }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const graphqlQueryWithPrice = `query getProducts($cursor: String) {
  products(first: 100, after: $cursor) {
    edges {
      node {
        id
        title
        description
        variants(first: 1) {
          edges {
            node {
              price 
            }
          }
        }
        images(first: 1) {
          edges {
            node {
              src
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    }
  }`;

  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2024-07/graphql.json`,
      {
        query: graphqlQueryWithPrice,
        variables: { cursor },
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(
      'Product Fetch Response: ',
      response.data
    );

    // console.log(
    //   JSON.stringify(
    //     response.data.data.products,
    //     null,
    //     2
    //   )
    // );

    const { edges, pageInfo } =
      response.data.data.products;
    products.push(
      ...edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        description: edge.node.description,
        images:
          edge.node.images.edges[0]?.node?.src ||
          'N/A', // Extract image URL or fallback.
        price:
          edge.node.variants.edges[0]?.node?.price || 'N/A',  
      }))
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
