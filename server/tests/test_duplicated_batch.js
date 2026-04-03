const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

async function testDuplicatedBatchedPrices() {
  const requests = [
    { playerSlug: 'josh-sargent', rarity: 'limited', season: '2023' },
    { playerSlug: 'lionel-messi', rarity: 'limited', season: '2023' }
  ];

  try {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['APIKEY'] = apiKey;
    }

    const client = new GraphQLClient(ENDPOINT, { headers });

    let queryBody = '';
    const variables = {};

    requests.forEach((req, index) => {
      variables[`slug${index}`] = req.playerSlug;
      variables[`rarity${index}`] = [req.rarity];
      variables[`season${index}`] = [parseInt(req.season)];

      queryBody += `
        res${index}: anyPlayer(slug: $slug${index}) {
          displayName
          anyCards(rarities: $rarity${index}, first: 1, seasonStartYears: $season${index}) {
            nodes {
              lowestPriceCard {
                slug
              }
            }
          }
        }
      `;
    });

    const FINAL_QUERY = `
      query GetBatchedPrices(${requests.map((_, i) => `$slug${i}: String!, $rarity${i}: [Rarity!], $season${i}: [Int!]`).join(', ')}) {
        ${queryBody}
      }
    `;

    console.log('--- GENERATED QUERY ---');
    console.log(FINAL_QUERY);
    console.log('--- VARIABLES ---');
    console.log(variables);

    const data = await client.request(FINAL_QUERY, variables);
    console.log('Success:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('FAILED:', error.message);
    if (error.response) console.error(JSON.stringify(error.response.body));
  }
}

testDuplicatedBatchedPrices();
