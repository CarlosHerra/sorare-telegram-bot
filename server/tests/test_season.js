const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

const QUERY = gql`
  query ProbeCards {
    football {
        # Try 1: Cards on root of football namespace
        cardsFromRoot: cards(playerSlug: "kylian-mbappe", first: 1) {
            slug
            seasonStartYear
        }
    }
  }
`;
// Backup query if above fails (can't do both if schema validation fails fast)
const QUERY_2 = gql`
  query ProbePlayerCards {
    football {
        player(slug: "kylian-mbappe") {
            # Try 2: common alternatives
            # allCards(first: 1) { slug } 
            cards(first: 1) { slug } # We know this failed
        }
    }
  }
`;

async function test() {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = { 'Authorization': apiKey };

    console.log("Testing football.cards(playerSlug)...");
    try {
        const client = new GraphQLClient(ENDPOINT, { headers });
        const data = await client.request(QUERY);
        console.log("SUCCESS QUERY 1!");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`Failed Q1: ${error.message.split('\n')[0]}`);
        if (error.response) console.log(JSON.stringify(error.response.body, null, 2));
    }
}
test();
