const { GraphQLClient, gql } = require('graphql-request');
const { getGbpToEurRate } = require('./exchange');

const ENDPOINT = 'https://api.sorare.com/graphql';

const QUERY = gql`
  query GetMinListingPrice($slug: String!, $rarity: [Rarity!], $season: [Int!]) {
    anyPlayer(slug: $slug) {
      displayName
      avatarPictureUrl
      anyCards(
        rarities: $rarity
        seasonStartYears: $season
        first: 1
      ) {
        nodes {
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

async function getCardPrice(playerSlug, rarity, seasonFilter = null) {
  try {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['APIKEY'] = apiKey;
    }

    const client = new GraphQLClient(ENDPOINT, { headers });

    const formattedRarity = rarity.toLowerCase();

    console.log(`Fetching price for ${playerSlug}[${formattedRarity}](Season: ${seasonFilter || 'Any'})...`);

    // Build variables for the query
    const variables = {
      slug: playerSlug,
      rarity: [formattedRarity]
    };

    // Add season filter if specified
    if (seasonFilter) {
      variables.season = [parseInt(seasonFilter)];
    }

    const data = await client.request(QUERY, variables);

    if (!data.anyPlayer || !data.anyPlayer.anyCards || !data.anyPlayer.anyCards.nodes || data.anyPlayer.anyCards.nodes.length === 0) {
      console.warn(`No cards found for ${playerSlug}`);
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    // Get the lowestPriceCard from the first node
    const lowestPriceCard = data.anyPlayer.anyCards.nodes[0]?.lowestPriceCard;

    if (!lowestPriceCard || !lowestPriceCard.liveSingleSaleOffer) {
      console.warn(`No live sale offer found for ${playerSlug}`);
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    const amounts = lowestPriceCard.liveSingleSaleOffer.receiverSide?.amounts;
    if (!amounts) {
      console.warn(`No price amounts found for ${playerSlug}`);
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    // Extract price - prefer ETH (wei) but fallback to EUR/USD
    let price = null;
    let currency = 'ETH';

    if (amounts.wei) {
      price = parseFloat(amounts.wei) / 1000000000000000000; // Convert Wei to ETH
      currency = 'ETH';
    } else if (amounts.eurCents) {
      price = parseFloat(amounts.eurCents) / 100;
      currency = 'EUR';
    } else if (amounts.usdCents) {
      price = parseFloat(amounts.usdCents) / 100;
      currency = 'USD';
    } else if (amounts.gbpCents) {
      const gbpPrice = parseFloat(amounts.gbpCents) / 100;
      const rate = await getGbpToEurRate();
      if (rate) {
        price = gbpPrice * rate;
        currency = 'EUR'; // Converted
        console.log(`Converted ${gbpPrice} GBP to ${price} EUR (Rate: ${rate})`);
      } else {
        // Fallback if rate fails, just return GBP
        price = gbpPrice;
        currency = 'GBP';
      }
    }

    if (price === null) {
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    console.log(`Found lowest price: ${price} ${currency} for ${playerSlug}`);
    return {
      price,
      currency,
      cardSlug: lowestPriceCard.slug,
      cardPictureUrl: lowestPriceCard.pictureUrl,
      playerPictureUrl: data.anyPlayer.avatarPictureUrl,
      serialNumber: lowestPriceCard.serialNumber,
      seasonYear: lowestPriceCard.seasonYear,
      rarity: lowestPriceCard.rarityTyped,
      playerDisplayName: data.anyPlayer.displayName
    };

  } catch (error) {
    console.error('Error fetching Sorare price:', error.message);
    if (error.response) console.error(JSON.stringify(error.response.body));
    return null;
  }
}

const SEARCH_QUERY = gql`
  query SearchPlayers($query: String!) {
  searchPlayers(query: $query) {
      hits {
        anyPlayer {
            slug
            displayName
            pictureUrl: avatarPictureUrl
        }
    }
  }
}
`;

async function searchPlayers(query) {
  try {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['APIKEY'] = apiKey;
    }
    const client = new GraphQLClient(ENDPOINT, { headers });
    console.log(`Searching players for: ${query} `);

    const data = await client.request(SEARCH_QUERY, { query });

    if (data && data.searchPlayers && data.searchPlayers.hits) {
      return data.searchPlayers.hits.map(hit => hit.anyPlayer);
    }
    return [];
  } catch (error) {
    console.error('Error searching players:', error.message);
    return [];
  }
}

module.exports = { getCardPrice, searchPlayers };
