const { GraphQLClient, gql } = require('graphql-request');
const { getGbpToEurRate } = require('./exchange');

const ENDPOINT = 'https://api.sorare.com/graphql';

/**
 * Compute the current Sorare season start year.
 * Football seasons span Aug-Jul, so if we're in Aug+ it's currentYear, otherwise currentYear-1.
 */
function getCurrentSeasonYear() {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Build the season years array for a given cardType and optional specific season.
 * Priority: specific season > cardType > no filter.
 * - season specified → [season] (overrides cardType)
 * - 'in_season' → [currentSeason]
 * - 'classic' → [2015..currentSeason-1]
 * - null/undefined/'any' → undefined (no filter, returns all)
 */
function getSeasonYearsForCardType(cardType, season = null) {
  // Specific year overrides cardType
  if (season) {
    return [parseInt(season)];
  }
  const current = getCurrentSeasonYear();
  if (cardType === 'in_season') {
    return [current];
  }
  if (cardType === 'classic') {
    const years = [];
    for (let y = 2015; y < current; y++) years.push(y);
    return years;
  }
  return undefined; // No filter — any season
}

/**
 * Build a consistent cache key from cardType and season.
 * - season specified → the year string (e.g. '2021')
 * - cardType only → cardType (e.g. 'in_season', 'classic')
 * - neither → 'any'
 */
function buildCacheKey(cardType, season) {
  if (season) return String(season);
  return cardType || 'any';
}

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

async function getCardPrice(playerSlug, rarity, cardType = null, season = null) {
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

    // Add season filter: specific season overrides cardType
    const seasonYears = getSeasonYearsForCardType(cardType, season);
    if (seasonYears) {
      variables.season = seasonYears;
    }
    // When seasonYears is undefined, we omit the season key entirely → API returns all seasons

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
    console.log(`Processing batch of ${requests.length} unique player/rarity/cardType combinations in parallel...`);
    
    // Execute all requests concurrently using Promise.all
    // Each request is still an individual HTTP call, which bypasses the "Duplicated root field" error.
    const promises = requests.map(req => {
      const cacheKey = buildCacheKey(req.cardType, req.season);
      return getCardPrice(req.playerSlug, req.rarity, req.cardType, req.season)
        .then(result => ({ 
          key: `${req.playerSlug}-${req.rarity}-${cacheKey}`, 
          result 
        }));
    });

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

const USER_GALLERY_QUERY = gql`
  query GetUserGallery($slug: String!, $cursor: String) {
    user(slug: $slug) {
      paginatedCards(first: 50, after: $cursor) {
        nodes {
          player {
            slug
            displayName
            pictureUrl: avatarPictureUrl
          }
          slug
          rarityTyped
          seasonYear
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

async function getUserGallery(slug) {
  try {
    const apiKey = process.env.SORARE_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['APIKEY'] = apiKey;
    }
    const client = new GraphQLClient(ENDPOINT, { headers });
    let allCards = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const variables = { slug, cursor };
      const data = await client.request(USER_GALLERY_QUERY, variables);
      
      const paginatedCards = data?.user?.paginatedCards;
      if (!paginatedCards) break;

      allCards = allCards.concat(paginatedCards.nodes);
      
      hasNextPage = paginatedCards.pageInfo.hasNextPage;
      cursor = paginatedCards.pageInfo.endCursor;

      // Safe guard against infinite loops or huge galleries
      if (allCards.length >= 1000) break;
    }

    return allCards.map(c => ({
      cardSlug: c.slug,
      playerSlug: c.player?.slug,
      playerDisplayName: c.player?.displayName,
      playerPictureUrl: c.player?.pictureUrl,
      rarity: c.rarityTyped,
      seasonYear: c.seasonYear
    }));

  } catch (error) {
    console.error('Error fetching user gallery:', error.message);
    return [];
  }
}

module.exports = { getCardPrice, searchPlayers, getBatchedCardPrices, getExchangeRates, getUserGallery, buildCacheKey };
