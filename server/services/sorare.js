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

    // Build variables
    const variables = {
      slug: playerSlug,
      rarity: [formattedRarity]
    };

    // Add season filter if specified
    if (seasonFilter && seasonFilter !== 'any') {
      variables.season = [parseInt(seasonFilter)];
    } else {
      variables.season = []; // Empty array means any season
    }

    const data = await client.request(QUERY, variables);

    if (!data.anyPlayer || !data.anyPlayer.anyCards || !data.anyPlayer.anyCards.nodes || data.anyPlayer.anyCards.nodes.length === 0) {
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    // Get the lowestPriceCard from the first node
    const lowestPriceCard = data.anyPlayer.anyCards.nodes[0]?.lowestPriceCard;

    if (!lowestPriceCard || !lowestPriceCard.liveSingleSaleOffer) {
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    const amounts = lowestPriceCard.liveSingleSaleOffer.receiverSide?.amounts;
    if (!amounts) {
      return { price: null, playerPictureUrl: data.anyPlayer?.avatarPictureUrl };
    }

    // Extract price - prefer ETH (wei) but fallback to fiat
    let price = null;
    let currency = 'ETH';

    if (amounts.wei) {
      price = parseFloat(amounts.wei) / 1000000000000000000;
      currency = 'ETH';
    } else if (amounts.eurCents) {
      price = parseFloat(amounts.eurCents) / 100;
      currency = 'EUR';
    } else if (amounts.usdCents) {
      price = parseFloat(amounts.usdCents) / 100;
      currency = 'USD';
    } else if (amounts.gbpCents) {
      price = parseFloat(amounts.gbpCents) / 100;
      currency = 'GBP';
    }

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
    console.error(`Error fetching Sorare price for ${playerSlug}:`, error.message);
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

const CARD_FIELDS_FRAGMENT = `
  fragment CardFields on Card {
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
`;

async function getBatchedCardPrices(requests) {
  if (!requests || requests.length === 0) return {};

  try {
    console.log(`Processing batch of ${requests.length} unique player/rarity/season combinations in parallel...`);
    
    // Execute all requests concurrently using Promise.all
    // Each request is still an individual HTTP call, which bypasses the "Duplicated root field" error.
    const promises = requests.map(req => 
      getCardPrice(req.playerSlug, req.rarity, req.season)
        .then(result => ({ 
          key: `${req.playerSlug}-${req.rarity}-${req.season || 'any'}`, 
          result 
        }))
    );

    const rawResults = await Promise.all(promises);
    const results = {};

    for (const { key, result } of rawResults) {
      results[key] = result;
    }

    return results;
  } catch (error) {
    console.error('Error in parallel batch processing:', error.message);
    return {};
  }
}

async function getExchangeRates() {
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
    return data?.config?.exchangeRate?.rates || null;
  } catch (error) {
    console.error('Error fetching Sorare exchange rates:', error.message);
    return null;
  }
}

module.exports = { getCardPrice, searchPlayers, getBatchedCardPrices, getExchangeRates };
