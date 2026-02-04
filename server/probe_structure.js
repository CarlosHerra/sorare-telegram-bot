const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

async function probe(name, query) {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = { 'Authorization': apiKey };
    const client = new GraphQLClient(ENDPOINT, { headers });

    console.log(`\n--- Probing ${name} ---`);
    try {
        const data = await client.request(query);
        console.log("SUCCESS!");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log(`FAILED: ${e.message.split('\n')[0]}`);
    }
}

async function run() {
    // 1. Probe for Price in TokenOffer
    await probe('TokenOffer.priceWei', gql`
        query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { priceWei } } } }
    `);

    await probe('TokenOffer.amount', gql`
         query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { amount } } } }
    `);

    await probe('TokenOffer.priceAmount', gql`
         query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { priceAmount } } } }
    `);

    await probe('TokenOffer.price (wei)', gql`
         query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { price { wei } } } } }
    `);

    await probe('TokenOffer (LimitOrder fragment)', gql`
         query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { 
             ... on LimitOrder { price } 
             ... on SingleSaleOffer { price }
         } } } }
    `);

    await probe('TokenOffer (priceWei fragment)', gql`
         query { football { cards(playerSlug:"kylian-mbappe", first:1) { liveSingleSaleOffer { 
             ... on LimitOrder { priceWei } 
             ... on SingleSaleOffer { priceWei }
         } } } }
    `);

    // 2. Probe for Search
    // Check if 'search' exists on football
    await probe('Football.search', gql`
         query { football { search(query:"Mbappe") { nodes { slug } } } }
    `);

    // Check if cards search exists?
    await probe('Football.cards(search)', gql`
         query { football { cards(search:"Mbappe", first:1) { slug } } }
    `);
}

run();
