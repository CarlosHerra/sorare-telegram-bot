const { GraphQLClient, gql } = require('graphql-request');
require('dotenv').config();

const ENDPOINT = 'https://api.sorare.com/graphql';

const QUERY = gql`
  query Introspect {
    # introspect TokenOffer type (liveSingleSaleOffer return type)
    typeTokenOffer: __type(name: "TokenOffer") {
      name
      fields {
        name
        type { name kind }
      }
    }
    
    # introspect FootballRoot (football query return type)
    typeFootballRoot: __type(name: "FootballRoot") { # Assuming name is FootballRoot based on error
       name
       fields {
         name
       }
    }

    # introspect CurrentUser
    typeCurrentUser: __type(name: "CurrentUser") {
        name
        fields {
            name
        }
    }
  }
`;

async function test() {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = { 'Authorization': apiKey };

    const client = new GraphQLClient(ENDPOINT, { headers });

    console.log("Introspecting schema...");
    try {
        const data = await client.request(QUERY);

        console.log("\n--- TokenOffer Fields ---");
        if (data.typeTokenOffer) {
            data.typeTokenOffer.fields.forEach(f => console.log(f.name));
        } else {
            console.log("Type TokenOffer not found (maybe different name?)");
        }

        console.log("\n--- FootballRoot Fields ---");
        if (data.typeFootballRoot) {
            data.typeFootballRoot.fields.forEach(f => console.log(f.name));
        }

        console.log("\n--- CurrentUser Fields ---");
        if (data.typeCurrentUser) {
            data.typeCurrentUser.fields.forEach(f => console.log(f.name));
        }

    } catch (error) {
        console.log(`Failed: ${error.message.split('\n')[0]}`);
        if (error.response) console.log(JSON.stringify(error.response.body, null, 2));
    }
}

test();
