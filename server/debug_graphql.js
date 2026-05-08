require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

const ENDPOINT = 'https://api.sorare.com/graphql';

const QUERY = gql`
  query GetMinListingPrice($slug: String!, $rarity: [Rarity!]) {
    anyPlayer(slug: $slug) {
      displayName
      avatarPictureUrl
      anyCards(
        rarities: $rarity
        first: 1
      ) {
        nodes {
          slug
          pictureUrl
          serialNumber
          seasonYear
          rarityTyped
          lowestPriceCard {
            slug
            pictureUrl
            serialNumber
            seasonYear
            rarityTyped
            liveSingleSaleOffer {
              receiverSide {
                amounts {
                  eurCents
                  usdCents
                  gbpCents
                  wei
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function debug() {
    const testPlayer = 'julian-alvarez';
    const rarity = 'limited';
    
    const client = new GraphQLClient(ENDPOINT, { headers: { APIKEY: process.env.SORARE_API_KEY } });
    const variables = { slug: testPlayer, rarity: [rarity], season: [] };
    
    console.log(`\nFetching raw GraphQL data for: ${testPlayer} (${rarity})...\n`);
    const data = await client.request(QUERY, variables);
    
    console.log(JSON.stringify(data, null, 2));
}

debug().catch(console.error);
