from environment import PrivacyEnv
from agent import QLearningAgent
from schemas import Action


def test_q_learning():
    env = PrivacyEnv(level="medium")
    agent = QLearningAgent()
    episodes = 200
    
    rewards_history = []
    
    print("Starting Q-Learning Training...")
    for ep in range(episodes):
        obs = env.reset()
        done = False
        ep_reward = 0.0
        
        while not done:
            idx = obs.current_index
            token = obs.tokens[idx]
            is_sensitive = env.sensitive_flags[idx]
            
            action_dict = agent.select_action(token, is_sensitive)
            action_dict["token_index"] = idx
            
            action = Action(**action_dict)
            obs, reward, done, info = env.step(action)
            ep_reward += reward
            
            agent.update(token, is_sensitive, action.type, reward)

            
        agent.decay_epsilon()
        rewards_history.append(ep_reward)
        if ep % 20 == 0:
            print(f"Episode {ep}: Reward = {ep_reward:.2f}, Epsilon = {agent.epsilon:.2f}")

    print("Training Finished.")
    print("Final Q-Table samples:")
    for i, (k, v) in enumerate(agent.q_table.items()):
        if i < 5:
            print(f"  {k}: {v}")

if __name__ == "__main__":
    test_q_learning()
