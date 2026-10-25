// Tabular Q-Learning Brain with Shared Collective Memory for Multi-Agent Fleets
class QLearningBrain {
    constructor(options = {}) {
        // Hyperparameters
        this.alpha = options.alpha || 0.22;       // Learning rate
        this.gamma = options.gamma || 0.94;       // Discount factor
        this.epsilon = options.epsilon || 0.65;   // Exploration rate
        this.epsilonMin = options.epsilonMin || 0.05;
        this.epsilonDecay = options.epsilonDecay || 0.997; // Decay per episode

        // Action Space:
        // 0: Accelerate Forward
        // 1: Steer Left + Gas
        // 2: Steer Right + Gas
        // 3: Brake / Decelerate
        // 4: Hard Steer Left
        // 5: Hard Steer Right
        this.numActions = 6;
        this.actionNames = ['GAS', 'LEFT+GAS', 'RIGHT+GAS', 'BRAKE', 'HARD LEFT', 'HARD RIGHT'];

        // Shared Q-Table: stateKey -> Float32Array(numActions)
        this.qTable = new Map();

        // Metrics & Analytics
        this.totalSteps = 0;
        this.totalEpisodes = 0;
        this.totalCollisions = 0;
        this.totalAvoidances = 0;
        this.recentRewards = [];
        this.maxStoredRewards = 50;

        // Try restoring saved training from localStorage
        this.loadFromStorage();
    }

    getQValues(stateKey) {
        let q = this.qTable.get(stateKey);
        if (!q) {
            // Small optimistic initialization (+0.1) encourages initial exploration
            q = new Float32Array(this.numActions).fill(0.1);
            this.qTable.set(stateKey, q);
        }
        return q;
    }

    selectAction(stateKey, forceGreedy = false) {
        const qValues = this.getQValues(stateKey);

        // Epsilon-greedy exploration
        if (!forceGreedy && Math.random() < this.epsilon) {
            return Math.floor(Math.random() * this.numActions);
        }

        // Greedy choice (argmax Q)
        let maxVal = -Infinity;
        let bestAction = 0;
        for (let a = 0; a < this.numActions; a++) {
            if (qValues[a] > maxVal) {
                maxVal = qValues[a];
                bestAction = a;
            }
        }
        return bestAction;
    }

    update(state, action, reward, nextState, isTerminal) {
        this.totalSteps++;

        const currentQ = this.getQValues(state);
        const oldVal = currentQ[action];

        let target = reward;
        if (!isTerminal) {
            const nextQ = this.getQValues(nextState);
            let maxNext = -Infinity;
            for (let a = 0; a < this.numActions; a++) {
                if (nextQ[a] > maxNext) maxNext = nextQ[a];
            }
            target += this.gamma * maxNext;
        }

        // Bellman Equation update
        currentQ[action] += this.alpha * (target - oldVal);
    }

    endEpisode(totalEpisodeReward) {
        this.totalEpisodes++;
        this.recentRewards.push(totalEpisodeReward);
        if (this.recentRewards.length > this.maxStoredRewards) {
            this.recentRewards.shift();
        }

        // Decay epsilon
        if (this.epsilon > this.epsilonMin) {
            this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
        }

        // Autosave every 20 episodes
        if (this.totalEpisodes % 20 === 0) {
            this.saveToStorage();
        }
    }

    getAverageReward() {
        if (this.recentRewards.length === 0) return 0;
        const sum = this.recentRewards.reduce((a, b) => a + b, 0);
        return (sum / this.recentRewards.length).toFixed(1);
    }

    saveToStorage() {
        try {
            // Save state table compact format (first 3000 most visited entries)
            const entries = [];
            let count = 0;
            for (let [k, v] of this.qTable.entries()) {
                entries.push([k, Array.from(v)]);
                if (++count > 2500) break;
            }
            const data = {
                qTable: entries,
                epsilon: this.epsilon,
                totalEpisodes: this.totalEpisodes,
                totalSteps: this.totalSteps,
                totalCollisions: this.totalCollisions,
                totalAvoidances: this.totalAvoidances
            };
            localStorage.setItem('qlearning_car_brain', JSON.stringify(data));
        } catch (e) {
            // Storage quota or privacy restriction
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem('qlearning_car_brain');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.qTable) {
                    data.qTable.forEach(([k, v]) => {
                        this.qTable.set(k, new Float32Array(v));
                    });
                }
                if (data.epsilon) this.epsilon = data.epsilon;
                if (data.totalEpisodes) this.totalEpisodes = data.totalEpisodes;
                if (data.totalSteps) this.totalSteps = data.totalSteps;
                if (data.totalCollisions) this.totalCollisions = data.totalCollisions;
                if (data.totalAvoidances) this.totalAvoidances = data.totalAvoidances;
                console.log(`Q-Learning restored: ${this.qTable.size} states, ${this.totalEpisodes} episodes.`);
            }
        } catch (e) {
            console.warn("Could not load Q-table from storage:", e);
        }
    }

    resetBrain() {
        this.qTable.clear();
        this.epsilon = 0.65;
        this.totalEpisodes = 0;
        this.totalSteps = 0;
        this.totalCollisions = 0;
        this.totalAvoidances = 0;
        this.recentRewards = [];
        try {
            localStorage.removeItem('qlearning_car_brain');
        } catch (e) {}
    }
}

window.QLearningBrain = QLearningBrain;
