const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

const QUERY_SEARCH = gql`
  query SearchProbe {
    football {
      # Validated that players returns list
      players(search: "Mbappe", first: 1) {
          slug
          displayName
      }
    }
  }
`;

const QUERY_CARD_FIAT = gql`
  query GetCardFields {
    football {
       cards(playerSlug: "kylian-mbappe", first: 1) {
           liveSingleSaleOffer {
               __typename
               # Probe snake_case and other common fields
               price_wei
               price_amount
               startDate
               endDate
               # Maybe it's just 'price' but I have to ask for subfields? 
               # But error said 'field does not exist', typically means top level.
               # Let's try 'currency'
               currency
           }
       }
    }
  }
`;

// Alternative probe
const QUERY_2 = gql`
  query GetCardWithFiat {
     football {
        player(slug: "kylian-mbappe") {
            cards(rarity: limited, first: 1) {
                # Check if we can get price in specific currency directly
                price(currency: EUR) 
                priceInFiat: price(currency: EUR)
                liveSingleSaleOffer {
                    price
                    currency
                    priceInFiat: price(currency: EUR)
                }
            }
        }
     }
  }
`;

async function test() {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = { 'Authorization': apiKey };

    const client = new GraphQLClient(ENDPOINT, { headers });

    console.log("Testing SearchProbe...");
    try {
        const data = await client.request(QUERY_SEARCH);
        console.log("SUCCESS SearchProbe:");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`Failed SearchProbe: ${error.message.split('\n')[0]}`);
        if (error.response) console.log(JSON.stringify(error.response.body, null, 2));
    }

    console.log("\nTesting GetCardFields...");
    try {
        const data = await client.request(QUERY_CARD_FIAT);
        console.log("SUCCESS GetCardFields:");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`Failed GetCardFields: ${error.message.split('\n')[0]}`);
        if (error.response) console.log(JSON.stringify(error.response.body, null, 2));
    }
}

test();
