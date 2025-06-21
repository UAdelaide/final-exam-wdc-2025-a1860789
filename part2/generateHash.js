const bcrypt = require('bcrypt');

async function generateHashes() {
    const saltRounds = 10;

    console.log('Generating hashes for common test passwords:');
    console.log('-------------------------------------------');

    // Example for ownerJane, password is 'password123'
    const ownerJanePass = await bcrypt.hash('password123', saltRounds);
    console.log('ownerJane (password123) hash:', ownerJanePass);

    // Example for walkerMike, password is 'password456'
    const walkerMikePass = await bcrypt.hash('password456', saltRounds);
    console.log('walkerMike (password456) hash:', walkerMikePass);

    // Example for ownerBob, password is 'password789'
    const ownerBobPass = await bcrypt.hash('password789', saltRounds);
    console.log('ownerBob (password789) hash:', ownerBobPass);


    // For 'alice123' (email alice@example.com) password 'password123'
    const alice123Pass = await bcrypt.hash('password123', saltRounds);
    console.log('alice123 (password123) hash:', alice123Pass);

    // For 'bobwalker' (email bob@example.com) password 'password456'
    const bobwalkerPass = await bcrypt.hash('password456', saltRounds);
    console.log('bobwalker (password456) hash:', bobwalkerPass);

    // For 'carol123' (email caro@example.com) password 'password789'
    const carol123Pass = await bcrypt.hash('password789', saltRounds);
    console.log('carol123 (password789) hash:', carol123Pass);

    // For 'naruto_doggo' (email naruto@example.com) password 'password678'
    const narutoDoggoPass = await bcrypt.hash('password678', saltRounds);
    console.log('naruto_doggo (password678) hash:', narutoDoggoPass);

    // For 'hitana_owner' (email hitana@example.com) password 'password684'
    const hitanaOwnerPass = await bcrypt.hash('password684', saltRounds);
    console.log('hitana_owner (password684) hash:', hitanaOwnerPass);

    console.log('-------------------------------------------');
    console.log('Copy these hash values carefully for your SQL UPDATE statements.');
}

generateHashes();