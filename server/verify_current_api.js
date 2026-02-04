const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getCardPrice, searchPlayers } = require('./services/sorare');

async function verify() {
    console.log("Testing searchPlayers...");
    const players = await searchPlayers("simeone");
    console.log("Search Result:", players.length > 0 ? "Success" : "Empty");
    if (players.length > 0) console.log(players[0]);

    console.log("\nTesting getCardPrice...");
    // Use the slug from search if available, else hardcode
    const slug = players.length > 0 ? players[0].slug : "kylian-mbappe";
    const price = await getCardPrice(slug, "limited");
    console.log("Price Result:", price);
}

verify();
