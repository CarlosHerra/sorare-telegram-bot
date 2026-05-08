const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

async function test() {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = { 'APIKEY': apiKey };
    const client = new GraphQLClient(ENDPOINT, { headers });

    try {
        const query = gql`
          query {
            currentUser {
              slug
              nickname
            }
          }
        `;
        const data = await client.request(query);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log(`Failed:`, e.response ? JSON.stringify(e.response.errors) : e.message);
    }
}
test();
