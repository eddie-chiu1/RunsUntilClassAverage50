function getPlayerStats(playerName) {
    const apiUrl = `https://sky.shiiyu.moe/api/v2/dungeons/${playerName}`;
    try {
        const rawData = FileLib.getUrlContent(apiUrl); // Fetch the API data
        const data = JSON.parse(rawData);
        return data;
    } catch (error) {
        ChatLib.chat(`&cFailed to fetch player stats: ${error.message}`);
        return null; // Return null if an error occurs
    }
}

function getXP(jsonData, targetClasses) {
    let results = {};
    // Navigate to 'profiles' (depth 0)
    if (!jsonData.profiles) {
        ChatLib.chat("&cProfiles not found in JSON data.");
        return results;
    }
    // Loop through profiles (depth 1)
    Object.keys(jsonData.profiles).forEach(profileId => {
        const profileData = jsonData.profiles[profileId];
        if (profileData.dungeons && profileData.dungeons.classes) {
            let classesData = profileData.dungeons.classes; // Navigate to 'classes' at depth 3
            // Access 'classes' again at depth 4
            if (classesData.classes && typeof classesData.classes === "object") {
                classesData = classesData.classes
                Object.keys(classesData).forEach(key => {
                    if(targetClasses.includes(key)) {
                        if (!results[key]) {
                            results[key] = [];
                        }
                        const classInfo = classesData[key]
                        if (classInfo.level && typeof classInfo.level.xp === "number") {
                            results[key].push({ xp: classInfo.level.xp });
                        }
                    }
                })
                
            } else {
                ChatLib.chat("&cClasses structure at depth 4 not found.");
            }
        } else {
            ChatLib.chat("&cDungeons data or classes structure missing.");
        }
    })
    return results;
}

function findMaxXP(xpData) {
    const maxResults = {};
    const classKeys = Object.keys(xpData);

    classKeys.forEach(className => {
        const xpList = xpData[className];
        const maxXp = Math.max(...xpList.map(entry => entry.xp).filter(xp => xp !== undefined));
        maxResults[className] = maxXp;
    });

    return maxResults;
}

function luDecomposition(A) {
    const n = A.length;
    const L = Array(n).fill(null).map(() => Array(n).fill(0));
    const U = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            // Compute U matrix
            U[i][j] = A[i][j];
            for (let k = 0; k < i; k++) {
                U[i][j] -= L[i][k] * U[k][j];
            }
        }

        for (let j = i; j < n; j++) {
            if (i === j) {
                L[i][i] = 1; // Diagonal elements of L are 1
            } else {
                // Compute L matrix
                L[j][i] = A[j][i];
                for (let k = 0; k < i; k++) {
                    L[j][i] -= L[j][k] * U[k][i];
                }
                L[j][i] /= U[i][i];
            }
        }
    }
    return { L, U };
}

function forwardSubstitution(L, b) {
    const y = Array(b.length).fill(0);
    for (let i = 0; i < b.length; i++) {
        y[i] = b[i];
        for (let j = 0; j < i; j++) {
            y[i] -= L[i][j] * y[j];
        }
    }
    return y;
}

function backwardSubstitution(U, y) {
    const x = Array(y.length).fill(0);
    for (let i = y.length - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < y.length; j++) {
            x[i] -= U[i][j] * x[j];
        }
        x[i] /= U[i][i];
    }
    return x;
}
// Solve the system of equations
function solveUsingLU(A, b) {
    const { L, U } = luDecomposition(A);
    const y = forwardSubstitution(L, b);
    return backwardSubstitution(U, y);
}

function calcClass50(results) {
    const maxXp = 569809640; // Maximum XP required
    const xpSelectedClass = 362000; // XP gained per run with selected class
    const xpDifferentClass = 89000; // XP gained per run with different class

    const A = [
        [xpSelectedClass, xpDifferentClass, xpDifferentClass, xpDifferentClass, xpDifferentClass],
        [xpDifferentClass, xpSelectedClass, xpDifferentClass, xpDifferentClass, xpDifferentClass],
        [xpDifferentClass, xpDifferentClass, xpSelectedClass, xpDifferentClass, xpDifferentClass],
        [xpDifferentClass, xpDifferentClass, xpDifferentClass, xpSelectedClass, xpDifferentClass],
        [xpDifferentClass, xpDifferentClass, xpDifferentClass, xpDifferentClass, xpSelectedClass]
    ];

    const b = Object.values(results).map(xp => maxXp - xp);
    

    let solution = solveUsingLU(A, b);
    solution = solution.map(xp => Math.round(xp))
    solution = solution.map((value, index) => (b[index] <= 0 ? 0 : value))

    const classNames = Object.keys(results);
    const runsNeeded = {};
    classNames.forEach((className, index) => {
        runsNeeded[className] = solution[index];
    });
    return runsNeeded;
}

register("command", (user) => {
    if (!user) {
        ChatLib.chat("&cUsage: /rtca <username>");
        return;
    }
    ChatLib.chat(`&eFetching stats for player: ${user}...`);
    const playerStats = getPlayerStats(user); 

    if (!playerStats) {
        ChatLib.chat('&cFailed to retrieve player stats.');
        return;
    }

    const classes = ["mage", "tank", "healer", "berserk", "archer"];
    const xpResults = getXP(playerStats, classes);
    const maxResults = findMaxXP(xpResults);
    let runs = calcClass50(maxResults);
    ChatLib.chat('&aMinimum Runs Needed per Class:');
    let value = 0;
    Object.entries(runs).forEach(([className, runCount]) => {
        if(runCount >= 0) {
            value += runCount;
        }
        ChatLib.chat(`&b${className}: &e${runCount} runs`);
    });
    ChatLib.chat(`&bTotal Runs Needed: &e${value} runs`);
}).setName("rtca");


ChatLib.chat(`&a[DungeonRunCalculator] Module loaded successfully.`);