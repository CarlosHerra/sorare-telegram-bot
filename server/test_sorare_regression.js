require('dotenv').config();
const { getCardPrice, searchPlayers } = require('./services/sorare');

async function test() {
    console.log("Searching for 'Cristiano'...");
    const players = await searchPlayers('Cristiano');
    if (players.length === 0) {
        console.error("FAILURE: No players found for 'Cristiano'");
        return;
    }

    const slug = players[0].slug;
    console.log(`Found player: ${slug}. Fetching price...`);

    try {
        const result = await getCardPrice(slug, 'limited');
        if (result) {
            console.log(`SUCCESS: Fetched price for ${slug}`);
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.warn(`WARNING: No price found for ${slug}, but no error thrown.`);
        }
    } catch (error) {
        console.error("FAILURE: getCardPrice threw an error:", error);
    }
}

test();
