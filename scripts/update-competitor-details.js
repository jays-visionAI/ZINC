/**
 * Update Competitor Details Script
 * Run this in the browser console to update existing competitor data with CEO, mainService, address, product
 */

const competitorUpdates = {
    'LayerZero': {
        ceo: 'Bryan Pellegrino',
        mainService: 'Omnichain Interoperability Protocol',
        address: 'Vancouver, British Columbia, Canada',
        product: 'OFT Standard, Stargate Bridge, Ultra-Light Nodes',
        website: 'https://layerzero.network'
    },
    'ZetaChain': {
        ceo: 'Ankur Nandwani (Co-founder)',
        mainService: 'Universal Blockchain & Omnichain Smart Contracts',
        address: 'San Francisco, California, USA',
        product: 'Universal Smart Contracts, ZETA Token, EVM L1 Blockchain',
        website: 'https://zetachain.com'
    },
    'Chainlink': {
        ceo: 'Sergey Nazarov',
        mainService: 'Decentralized Oracle Network',
        address: 'San Francisco, CA / New York, NY, USA',
        product: 'CCIP, Data Feeds, VRF, Automation, Proof of Reserve',
        website: 'https://chain.link'
    },
    'Wormhole': {
        ceo: 'Saeed Badreg',
        mainService: 'Cross-Chain Messaging Protocol',
        address: 'George Town, Cayman Islands',
        product: 'Token Bridge, Native Token Transfers, Wormhole Gateway, W Token',
        website: 'https://wormhole.com'
    },
    'Axelar': {
        ceo: 'Sergey Gorbunov',
        mainService: 'Universal Cross-Chain Communication Layer',
        address: 'Toronto, Canada',
        product: 'General Message Passing, Interchain Token Service, AVM',
        website: 'https://axelar.network'
    },
    'Polygon (AggLayer)': {
        ceo: 'Marc Boiron (Polygon Labs)',
        mainService: 'Cross-Chain Settlement Layer',
        address: 'Camana Bay, Cayman Islands',
        product: 'AggLayer, Polygon PoS, Polygon zkEVM, CDK',
        website: 'https://polygon.technology'
    },
    'Router Protocol': {
        ceo: 'Ramani Ramachandran',
        mainService: 'Cross-Chain Interoperability Infrastructure',
        address: 'Singapore',
        product: 'Router Chain, Router Nitro, CCIF, Voyager',
        website: 'https://routerprotocol.com'
    },
    'deBridge': {
        ceo: 'Alex Smirnov',
        mainService: 'High-Performance Cross-Chain Trading',
        address: 'Hong Kong',
        product: 'DLN (Liquidity Network), dePort, deBridge Hooks, IaaS',
        website: 'https://debridge.finance'
    }
};

async function updateCompetitorDetails() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('Not logged in!');
        return;
    }

    // Get current project ID
    const projectId = window.currentProjectId;
    if (!projectId) {
        console.error('No project selected!');
        return;
    }

    console.log('Updating competitors for project:', projectId);

    try {
        // Get current competitors
        const projectDoc = await firebase.firestore().collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            console.error('Project not found!');
            return;
        }

        const projectData = projectDoc.data();
        const competitors = projectData.competitors || [];

        if (competitors.length === 0) {
            console.error('No competitors found in project!');
            return;
        }

        console.log(`Found ${competitors.length} competitors. Updating...`);

        // Update each competitor
        const updatedCompetitors = competitors.map(comp => {
            // Find matching update data by name (partial match)
            const matchKey = Object.keys(competitorUpdates).find(key =>
                comp.name && comp.name.toLowerCase().includes(key.toLowerCase())
            );

            if (matchKey) {
                const update = competitorUpdates[matchKey];
                console.log(`✓ Updating ${comp.name} with ${matchKey} data`);
                return {
                    ...comp,
                    ceo: update.ceo,
                    mainService: update.mainService,
                    address: update.address,
                    product: update.product,
                    website: update.website || comp.website,
                    detailsUpdatedAt: new Date().toISOString()
                };
            } else {
                console.log(`⚠ No update found for ${comp.name}`);
                return comp;
            }
        });

        // Save updated competitors
        await firebase.firestore().collection('projects').doc(projectId).update({
            competitors: updatedCompetitors,
            competitorsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Successfully updated competitor details!');
        console.log('Refresh the page to see changes.');

        return updatedCompetitors;

    } catch (error) {
        console.error('Error updating competitors:', error);
    }
}

// Run the update
updateCompetitorDetails();
