# Autonomous Multi-Agent Q-Learning Vehicle Simulation

A 3D Reinforcement Learning simulation where autonomous car agents learn to drive, avoid obstacles, maintain lane discipline, and overtake traffic using a **Tabular Q-Learning Algorithm** with **Shared Collective Memory**.

---

## 🚀 How to Run

1. **Active Local Server (Running):**
   Navigate to:
   ```
   http://localhost:8089/
   ```

2. **Direct Offline Launch:**
   Simply double-click or open `index.html` in any web browser.

---

## 🧠 Q-Learning Architecture

### 1. State Space Representation
Each car agent perceives its environment using 5 analytical rangefinder rays, lane positioning, heading alignment, and speed:
- **Lane Discretization**: 5 buckets (`L_OFF`, `L1`, `C`, `R1`, `R_OFF`).
- **Heading Alignment**: 3 buckets (`Straight`, `Turn Left`, `Turn Right`).
- **Proximity Zones**: 3 forward zones (Left, Center, Right), each categorized into:
  - `0`: DANGER (< 6.5m)
  - `1`: WARNING (6.5m - 16m)
  - `2`: CLEAR (> 16m)
- **Speed Level**: 3 buckets (`Low`, `Medium`, `High`).

Total state space is ~400 compact, highly expressive states allowing the Q-table to converge rapidly in real time.

### 2. Action Space
6 discrete actions:
- `0`: **GAS** (Accelerate forward)
- `1`: **LEFT+GAS** (Steer left with throttle)
- `2`: **RIGHT+GAS** (Steer right with throttle)
- `3`: **BRAKE** (Decelerate)
- `4`: **HARD LEFT** (Evasive left maneuver)
- `5`: **HARD RIGHT** (Evasive right maneuver)

### 3. Reward Function
- **Forward Velocity**: $+ (v / v_{\max}) \times 2.2$ (incentivizes swift driving).
- **Lane Discipline**: $+ 1.2$ for staying in legitimate driving lanes, $+ 0.8$ bonus for lane centering, and $- 4.0$ penalty for drifting onto road shoulders.
- **Proximity Danger**: Up to $- 7.0$ penalty when closing in on obstacles or vehicles.
- **Successful Avoidance Bonus**: $+ 12.0$ bonus when safely navigating past an obstacle.
- **Collision (Terminal)**: Massive penalty (terminal reset), recording failure to the shared Q-table so the entire fleet avoids repeating the mistake.

### 4. Shared Collective Memory
All agents contribute to and read from a single shared Q-table. Increasing the agent fleet allows the cars to explore different lanes and encounter obstacles concurrently, accelerating learning exponentially.

---

## 🎮 Interactive UI Controls

- **Fleet Stepper (`+` / `−` Buttons)**: Increase or decrease the number of autonomous car agents (1 to 15 cars).
- **`CHASE LEADER` / `FLEET DRONE` / `TRACK HOOD`**: Toggle between smooth chase camera, high-angle aerial drone view, and bumper camera.
- **`NEXT AI`**: Focus the camera and telemetry on any individual agent in the fleet.
- **`1x SPEED` / `2x SPEED` / `4x SPEED`**: Fast-forward simulation speed for accelerated training.
- **`SENSORS ON / OFF`**: Toggle the real-time visual laser rangefinder beams:
  - 🟢 **Green**: Clear path (> 16m)
  - 🟡 **Yellow**: Warning zone (6.5m - 16m)
  - 🔴 **Red**: Critical danger (< 6.5m)
- **`CLEAR MEMORY`**: Reset the Q-table and restart learning from scratch.

### Keyboard Shortcuts
| Key | Action |
|---|---|
| <kbd>+</kbd> / <kbd>=</kbd> | Add car agent to fleet |
| <kbd>-</kbd> | Remove car agent from fleet |
| <kbd>C</kbd> | Cycle camera modes |
| <kbd>N</kbd> | Focus on next car agent |
| <kbd>M</kbd> | Mute engine synthesizer |
