const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

async function testExchangeQuery() {
  try {
    const client = new GraphQLClient(ENDPOINT);
    const query = gql`
      query {
        config {
          exchangeRate {
            rates
          }
        }
      }
    `;
    const data = await client.request(query);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testExchangeQuery();
